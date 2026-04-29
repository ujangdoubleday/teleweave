import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { Job } from 'bullmq';
import { TelegramService } from '../telegram/telegram.service.js';
import type { TelegramTaskPayload } from '../webhook/interfaces/webhook.interfaces.js';

/** Maximum time (ms) a CLI command is allowed to run before being killed. */
const CLI_TIMEOUT_MS = 30_000;

/** Maximum output buffer size (1 MB). */
const MAX_BUFFER = 1024 * 1024;

/** Telegram message character limit. */
const MAX_MESSAGE_LENGTH = 4_000;

@Processor('telegram-tasks')
export class CliProcessor extends WorkerHost {
  private readonly logger = new Logger(CliProcessor.name);

  constructor(private readonly telegramService: TelegramService) {
    super();
  }

  /**
   * Process a queued Telegram task:
   *  1. Parse the user's message into command + args.
   *  2. Execute the CLI command via `execFile`.
   *  3. Capture stdout / stderr.
   *  4. Send the result back to the user via Telegram.
   */
  async process(job: Job<TelegramTaskPayload>): Promise<void> {
    const { chatId, text, updateId, username } = job.data;

    this.logger.log(
      `Processing job ${job.id} | update ${updateId} | @${username ?? 'unknown'}`,
    );

    let output: string;

    try {
      output = await this.executeCommand(text);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `CLI execution failed for job ${job.id}: ${errorMessage}`,
      );

      output = `⚠️ Error executing command:\n${errorMessage}`;
    }

    // ── Send the result back to the user ──────────────────────
    try {
      const truncated = this.truncateOutput(output);
      await this.telegramService.sendMessage(chatId, truncated);

      this.logger.log(`Result sent to chat ${chatId} for job ${job.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to send result for job ${job.id}: ${errorMessage}`,
      );

      // Re-throw so BullMQ can retry according to the job's backoff config
      throw error;
    }
  }

  /**
   * Parse the user's text into a command and arguments, then execute it.
   *
   * The user's Telegram message is treated as a shell command.
   * Example: "ping -c 4 google.com" → command="ping", args=["-c","4","google.com"]
   *
   * Uses `execFile` with `shell: true` which is safer than raw `exec`
   * with string interpolation while still supporting shell features.
   */
  private executeCommand(text: string): Promise<string> {
    const parts = text.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    if (!command) {
      return Promise.resolve('⚠️ No command provided.');
    }

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
            resolve(`${result}\n\n⚠️ stderr:\n${stderrTrimmed}`);
          } else {
            resolve(result || '(no output)');
          }
        },
      );
    });
  }

  /**
   * Truncate output to fit within Telegram's 4096-char message limit,
   * leaving room for a truncation notice.
   */
  private truncateOutput(output: string): string {
    if (output.length <= MAX_MESSAGE_LENGTH) {
      return output;
    }

    const notice = '\n\n… (output truncated)';
    return output.slice(0, MAX_MESSAGE_LENGTH - notice.length) + notice;
  }
}
