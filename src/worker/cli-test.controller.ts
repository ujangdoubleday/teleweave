import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { execFile } from 'child_process';

/** Maximum time (ms) a CLI command is allowed to run. */
const CLI_TIMEOUT_MS = 30_000;

/** Maximum output buffer size (1 MB). */
const MAX_BUFFER = 1024 * 1024;

interface CliRequestBody {
  /** The CLI command to execute, e.g. "echo hello" */
  command: string;

  /** Optional arguments passed to the command */
  args?: string[];
}

/**
 * Development-only controller for running CLI commands directly.
 *
 * **WARNING**: This endpoint executes arbitrary commands on the host machine.
 * It must be removed or protected with authentication before deploying
 * to any publicly-accessible environment.
 *
 * @example
 * ```bash
 * # Run a simple command
 * curl -X POST http://localhost:3000/cli/exec \
 *   -H "Content-Type: application/json" \
 *   -d '{ "command": "echo", "args": ["hello", "world"] }'
 *
 * # Run without explicit args (parsed by shell)
 * curl -X POST http://localhost:3000/cli/exec \
 *   -H "Content-Type: application/json" \
 *   -d '{ "command": "whoami" }'
 * ```
 */
@Controller('cli')
export class CliTestController {
  private readonly logger = new Logger(CliTestController.name);

  /**
   * POST /cli/exec
   *
   * Execute a CLI command and return stdout / stderr.
   */
  @Post('exec')
  @HttpCode(HttpStatus.OK)
  async executeCommand(@Body() body: CliRequestBody): Promise<{
    status: 'success' | 'error';
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
  }> {
    const { command, args = [] } = body;

    if (!command || typeof command !== 'string') {
      return {
        status: 'error',
        exitCode: null,
        stdout: '',
        stderr: 'Missing or invalid "command" field in request body.',
        durationMs: 0,
      };
    }

    this.logger.log(`Executing: ${command} ${args.join(' ')}`);

    const startTime = Date.now();

    return new Promise((resolve) => {
      execFile(
        command,
        args,
        {
          timeout: CLI_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
          shell: true,
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;

          if (error) {
            this.logger.warn(
              `Command failed (${durationMs}ms): ${error.message}`,
            );

            resolve({
              status: 'error',
              exitCode: error.code !== undefined ? Number(error.code) : 1,
              stdout: stdout?.trim() ?? '',
              stderr: stderr?.trim() || error.message,
              durationMs,
            });
            return;
          }

          this.logger.log(`Command succeeded (${durationMs}ms)`);

          resolve({
            status: 'success',
            exitCode: 0,
            stdout: stdout.trim(),
            stderr: stderr?.trim() ?? '',
            durationMs,
          });
        },
      );
    });
  }
}
