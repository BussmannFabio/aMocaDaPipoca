"""Valida o pacote de planejamento. Requer Python 3.11+, sem dependências externas."""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
ROLES = {"coordenador", "produto", "backend", "frontend", "pagamentos", "qa"}
STATES = {"todo", "in_progress", "in_review", "blocked", "done"}
errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f"Arquivo ausente: {relative}")
    return path.read_text(encoding="utf-8-sig") if path.is_file() else ""


def load_json(relative: str) -> dict:
    try:
        return json.loads(read(relative))
    except (ValueError, OSError) as exc:
        errors.append(f"JSON inválido em {relative}: {exc}")
        return {}


def load_toml(relative: str) -> dict:
    try:
        return tomllib.loads(read(relative))
    except (ValueError, OSError) as exc:
        errors.append(f"TOML inválido em {relative}: {exc}")
        return {}


def main() -> int:
    required = [
        "README.md", "AGENTS.md", "docs/PRD.md", "docs/PLANO_MVP.md",
        "docs/BACKLOG.md", "docs/ARQUITETURA.md", "docs/TESTES_ACEITE.md",
        "docs/DECISOES.md", "docs/RASTREABILIDADE.md", "docs/OPERACAO.md",
        "docs/REFERENCIAS.md", "agents/README.md", "agents/state/STATUS.md",
        "agents/prompts/INICIAR_MVP.md", "agents/prompts/EXECUTAR_TAREFA.md",
        "agents/templates/DELEGACAO.md", "agents/templates/ENTREGA.md",
    ]
    for relative in required:
        require(bool(read(relative).strip()), f"Arquivo vazio: {relative}")

    config = load_toml(".codex/config.toml")
    agents = config.get("agents", {})
    require(agents.get("enabled") is True, "Configuração deve habilitar agentes")
    require(agents.get("max_concurrent_threads_per_session") == 3,
            "Limite planejado deve ser três subagentes")
    require(set(config) == {"agents"}, "Configuração contém seção não prevista")
    require(set(agents) <= {"enabled", "max_concurrent_threads_per_session"},
            "Configuração contém opção não prevista")

    actual_roles = {p.stem for p in (ROOT / ".codex/agents").glob("*.toml")}
    require(actual_roles == ROLES, f"Perfis diferentes do esperado: {actual_roles}")
    for role in sorted(ROLES):
        profile = load_toml(f".codex/agents/{role}.toml")
        require(profile.get("name") == role, f"Nome inválido no perfil {role}")
        for field in ("description", "developer_instructions"):
            require(bool(str(profile.get(field, "")).strip()), f"{role}: falta {field}")
        require(set(profile) <= {"name", "description", "developer_instructions"},
                f"{role}: campos não previstos, conferir schema oficial")
        role_path = f"agents/roles/{role}.md"
        require(bool(read(role_path).strip()), f"Papel vazio: {role}")
        require(role_path in profile.get("developer_instructions", ""),
                f"{role}: perfil não referencia instruções do papel")

    manifest = load_json("agents/state/tasks.json")
    require(manifest.get("schema_version") == 1, "Versão inválida do manifesto")
    tasks = manifest.get("tasks", [])
    require(isinstance(tasks, list), "tasks deve ser uma lista")
    tasks = tasks if isinstance(tasks, list) else []
    ids = [task.get("id") for task in tasks]
    expected = {f"M{i:02d}" for i in range(13)}
    require(len(ids) == len(set(ids)) and set(ids) == expected, "IDs devem ser M00 a M12, sem duplicação")
    by_id = {task.get("id"): task for task in tasks}
    backlog = read("docs/BACKLOG.md")
    prd = read("docs/PRD.md")
    tests = read("docs/TESTES_ACEITE.md")
    decisions = read("docs/DECISOES.md")
    backlog_ids = set(re.findall(r"^## (M\d{2})\b", backlog, flags=re.M))
    require(backlog_ids == expected, "Backlog não corresponde aos IDs do manifesto")
    rf_ids = set(re.findall(r"\b(?:RF|RN)-\d{2}\b", prd))
    ct_ids = set(re.findall(r"\bCT-\d{2}\b", tests))
    require(ct_ids == {f"CT-{i:02d}" for i in range(1, 22)}, "Matriz deve conter CT-01 a CT-21")
    decision_ids = set(re.findall(r"\bD-\d{2}\b", decisions))
    for task in tasks:
        task_id = task.get("id")
        require(task.get("owner") in ROLES, f"{task_id}: responsável desconhecido")
        require(task.get("status") in STATES, f"{task_id}: status inválido")
        deps = task.get("depends_on", [])
        require(isinstance(deps, list), f"{task_id}: dependências devem ser lista")
        deps = deps if isinstance(deps, list) else []
        require(len(deps) == len(set(deps)), f"{task_id}: dependência duplicada")
        for dep in deps:
            require(dep in by_id and dep != task_id, f"{task_id}: dependência inválida {dep}")
            if task.get("status") in {"in_progress", "in_review", "done"} and dep in by_id:
                require(by_id[dep].get("status") == "done", f"{task_id}: dependência {dep} não concluída")
        for field, valid in (("requirements", rf_ids), ("acceptance_tests", ct_ids),
                             ("external_decisions", decision_ids)):
            for reference in task.get(field, []):
                require(reference in valid, f"{task_id}: referência inexistente {reference}")
        if task.get("status") == "done":
            require(bool(task.get("evidence")), f"{task_id}: done sem evidência")
        if task.get("status") == "blocked":
            require(bool(task.get("blocker")), f"{task_id}: blocked sem motivo")
        for relative in task.get("evidence", []):
            evidence_path = (ROOT / relative).resolve()
            require(evidence_path.is_relative_to(ROOT) and evidence_path.is_file(),
                    f"{task_id}: evidência local ausente/inválida {relative}")

    visited: set[str] = set()
    active: set[str] = set()

    def visit(task_id: str) -> None:
        if task_id in active:
            errors.append(f"Ciclo de dependência em {task_id}")
            return
        if task_id in visited or task_id not in by_id:
            return
        active.add(task_id)
        for dep in by_id[task_id].get("depends_on", []):
            visit(dep)
        active.remove(task_id)
        visited.add(task_id)

    for task_id in by_id:
        visit(task_id)

    markdown_files = [ROOT / "README.md", ROOT / "AGENTS.md"]
    markdown_files += list((ROOT / "docs").rglob("*.md"))
    markdown_files += list((ROOT / "agents").rglob("*.md"))
    for path in markdown_files:
        content = path.read_text(encoding="utf-8-sig") if path.is_file() else ""
        for target in re.findall(r"\]\(([^)]+)\)", content):
            target = target.strip("<>").split("#", 1)[0]
            if not target or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
                continue
            require((path.parent / target).is_file(),
                    f"Link local quebrado em {path.relative_to(ROOT)}: {target}")

    if errors:
        print("FALHOU:")
        for error in errors:
            print(f"- {error}")
        return 1
    ready = [task["id"] for task in tasks if task["status"] == "todo"
             and all(by_id[dep]["status"] == "done" for dep in task["depends_on"])]
    print(f"OK: {len(tasks)} tarefas, {len(ROLES)} perfis, 21 cenários e links locais consistentes.")
    print("Próximas tarefas prontas: " + (", ".join(ready) or "nenhuma"))
    print("Esta verificação é estática; não inicia a aplicação nem confirma descoberta nativa dos agentes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
