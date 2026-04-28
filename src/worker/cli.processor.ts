import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { Job } from 'bullmq';
import { TelegramService } from '../telegram/telegram.service.js';
import type { TelegramTaskPayload } from '../webhook/interfaces/webhook.interfaces.js';

/** Maximum time (ms) a CLI command is allowed to run before being killed. */
const CLI_TIMEOUT_MS = 30_000;

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
   *  1. Execute a CLI command with the user's text.
   *  2. Capture stdout / stderr.
   *  3. Send the result back to the user via Telegram.
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
   * Execute a CLI command and return its combined output.
   * The command is a sample echo — replace with your actual CLI tool.
   */
  private executeCommand(text: string): Promise<string> {
    // Sanitize input to prevent shell injection
    const sanitized = text.replace(/[^\w\s@#.,!?:;()\-=/\\]/g, '');

    // Sample CLI command — swap this for your real tool
    const command = `echo "Processing: ${sanitized}"`;

    return new Promise((resolve, reject) => {
      exec(
        command,
        { timeout: CLI_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            // Include stderr context when the command fails
            const detail = stderr?.trim()
              ? `${error.message}\nstderr: ${stderr.trim()}`
              : error.message;
            reject(new Error(detail));
            return;
          }

          const result = stdout.trim();
          const stderrTrimmed = stderr?.trim();

          if (stderrTrimmed) {
            // Command succeeded but wrote to stderr — include both
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
