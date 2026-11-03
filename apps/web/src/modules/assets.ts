export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === 'true';
export function asset(path: string) { return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`; }
