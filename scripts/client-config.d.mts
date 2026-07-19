export declare const CLIENTS: readonly string[]
export declare function envVarNames(service: string): string[]
export declare function opencodeConfig(
  services: string[],
  root: string,
  options?: { windows?: boolean },
): { mcp: Record<string, { type: string; command: string[]; environment: Record<string, string> }> }
export declare function mcpServersConfig(
  services: string[],
  root: string,
): { mcpServers: Record<string, { command: string; args: string[] }> }
export declare function generateClientConfig(options: {
  client?: string
  profile?: string
  services?: string
  root: string
  windows?: boolean
}): Record<string, unknown>
