"""Operações limitadas no repositório autorizado; credencial somente em memória."""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = 'BussmannFabio/aMocaDaPipoca'

def token():
    explicit = os.environ.get('GITHUB_TOKEN')
    if explicit:
        return explicit
    result = subprocess.run(['git', '-c', 'credential.interactive=never', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', capture_output=True, text=True, timeout=30)
    fields = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    if not fields.get('password'):
        raise RuntimeError('Credencial GitHub não disponível para a API. Nenhum segredo foi exibido.')
    return fields['password']

def main():
    credential = token()
    def request(path, method='GET', data=None):
        req = urllib.request.Request('https://api.github.com/repos/' + REPO + path, data=json.dumps(data).encode() if data is not None else None, method=method, headers={'Authorization': 'Bearer ' + credential, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'pipoca-project-deployment', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                body = response.read()
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as error:
            if error.code == 404: return None
            raise RuntimeError(f'GitHub API respondeu HTTP {error.code} em {path}; credenciais não foram exibidas.') from None
    command = sys.argv[1] if len(sys.argv) > 1 else 'status'
    if command == 'enable-pages':
        site = request('/pages')
        if site is None:
            site = request('/pages', 'POST', {'build_type': 'workflow'})
        elif site.get('build_type') != 'workflow':
            request('/pages', 'PUT', {'build_type': 'workflow'})
            site = request('/pages')
        print(json.dumps({'pages_url': site.get('html_url'), 'build_type': site.get('build_type'), 'status': site.get('status')}, ensure_ascii=False))
    elif command == 'status':
        repo = request('')
        site = request('/pages')
        runs = request('/actions/runs?per_page=5')
        print(json.dumps({'repository': REPO, 'default_branch': repo.get('default_branch'), 'permissions': repo.get('permissions'), 'pages': {k: site.get(k) for k in ['html_url','status','build_type']} if site else None, 'runs': [{k: r.get(k) for k in ['id','name','status','conclusion','html_url','head_sha']} for r in (runs or {}).get('workflow_runs', [])]}, ensure_ascii=False))
    else:
        raise RuntimeError('Comando não suportado.')

if __name__ == '__main__':
    try: main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
