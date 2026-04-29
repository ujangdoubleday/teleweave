import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import type { BotCommand } from './bot-command.interface.js';

/** Maximum time (ms) a CLI command is allowed to run before being killed. */
const CLI_TIMEOUT_MS = 30_000;

/** Maximum output buffer size (1 MB). */
const MAX_BUFFER = 1024 * 1024;

// utilities for formatting
/* eslint-disable no-control-regex */
function stripAnsi(str: string): string {
  const ansiRegex =
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  return str.replace(ansiRegex, '');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chunkOutput(text: string): string[] {
  const limit = 3800; // leave room for HTML tags
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let current = 0;
  while (current < text.length) {
    chunks.push(text.slice(current, current + limit));
    current += limit;
  }
  return chunks;
}

@Injectable()
export class RunCommand implements BotCommand {
  readonly name = 'run';
  readonly description = 'Execute a CLI command';

  private readonly logger = new Logger(RunCommand.name);

  async execute(args: string): Promise<string | string[]> {
    if (!args) {
      return 'No command provided.\n\nUsage:\n/run ls -la\n/run whoami';
    }

    try {
      const output = await this.exec(args);
      const cleanOutput = escapeHtml(stripAnsi(output));
      const chunks = chunkOutput(cleanOutput);
      return chunks.map(
        (chunk) => `<pre><code class="language-bash">${chunk}</code></pre>`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`CLI execution failed: ${errorMessage}`);
      const cleanError = escapeHtml(stripAnsi(errorMessage));
      return `<b>Error executing command:</b>\n<pre>${cleanError}</pre>`;
    }
  }

  /**
   * Parse the text into a command and arguments, then execute via `execFile`.
   *
   * @example "ls -la /tmp" -> execFile("ls", ["-la", "/tmp"])
   */
  private exec(text: string): Promise<string> {
    const parts = text.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    this.logger.debug(`Executing: ${command} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      execFile(
        command,
        args,
        {
          timeout: CLI_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
          shell: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            const detail = stderr?.trim()
              ? `${error.message}\nstderr: ${stderr.trim()}`
              : error.message;
            reject(new Error(detail));
            return;
          }

          const result = stdout.trim();
          const stderrTrimmed = stderr?.trim();

          if (stderrTrimmed) {
            resolve(`${result}\n\nstderr:\n${stderrTrimmed}`);
          } else {
            resolve(result || '(no output)');
          }
        },
      );
    });
  }
}
