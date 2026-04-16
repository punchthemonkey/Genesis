/**
 * IToolExecutor.ts
 * Port for executing tools in a sandboxed environment.
 *
 * @version 1.0.0
 */

import { Result } from '@shared/types/Result';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  output: unknown;
  error?: string;
}

export type ToolError =
  | { code: 'TOOL_NOT_FOUND'; message: string }
  | { code: 'INVALID_ARGUMENTS'; message: string }
  | { code: 'EXECUTION_FAILED'; message: string }
  | { code: 'PERMISSION_DENIED'; message: string }
  | { code: 'TIMEOUT'; message: string };

/**
 * Tool Executor port.
 * Executes tool calls in a sandboxed environment.
 */
export interface IToolExecutor {
  /**
   * Executes a tool call and returns the result.
   * @error `TOOL_NOT_FOUND` – tool name not registered.
   * @error `INVALID_ARGUMENTS` – arguments failed schema validation.
   * @error `EXECUTION_FAILED` – runtime error during tool execution.
   * @error `PERMISSION_DENIED` – user denied permission for this tool.
   * @error `TIMEOUT` – execution exceeded time budget (default 30s).
   * @performance Must complete within configured timeout; typically <2s for network tools.
   */
  execute(call: ToolCall): Promise<Result<ToolResult, ToolError>>;

  /**
   * Returns true if the executor can handle the given tool name.
   */
  canHandle(toolName: string): boolean;

  /**
   * Lists all tool names available through this executor.
   */
  listTools(): string[];
}
