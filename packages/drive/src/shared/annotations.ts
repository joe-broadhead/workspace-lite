export const READ_ONLY = { _meta: { type: 'read_only' as const } } as const
export const WRITE = { _meta: { type: 'write' as const } } as const
export const DESTRUCTIVE = { _meta: { type: 'destructive' as const } } as const
