/**
 * CalculatorTool.ts
 * Simple calculator tool implementation.
 *
 * @version 1.0.0
 */

import { IToolExecutor, ToolCall, ToolResult, ToolError } from '@domain/ports/IToolExecutor';
import { Result, ok, err } from '@shared/types/Result';

export class CalculatorTool implements IToolExecutor {
  canHandle(toolName: string): boolean {
    return toolName === 'calculator';
  }

  listTools(): string[] {
    return ['calculator'];
  }

  async execute(call: ToolCall): Promise<Result<ToolResult, ToolError>> {
    if (call.name !== 'calculator') {
      return err({ code: 'TOOL_NOT_FOUND', message: 'Not a calculator call' });
    }
    const expr = call.args?.expression as string;
    if (!expr) {
      return err({ code: 'INVALID_ARGUMENTS', message: 'Missing expression' });
    }
    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      return ok({ callId: call.id, output: result });
    } catch (e) {
      return err({ code: 'EXECUTION_FAILED', message: String(e) });
    }
  }
}
