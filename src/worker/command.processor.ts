import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TelegramService } from '../telegram/telegram.service.js';
import type { TelegramTaskPayload } from '../webhook/interfaces/webhook.interfaces.js';
import type { BotCommand } from './commands/bot-command.interface.js';

/** telegram message character limit. */
const MAX_MESSAGE_LENGTH = 4_000;

/**
 * BullMQ processor that acts as a thin command router.
 *
 * It parses the incoming Telegram message for a bot command prefix
 * (e.g. `/run`, `/start`) and delegates to the matching {@link BotCommand}
 * handler. All business logic lives in the individual command files.
 */
@Processor('telegram-tasks')
export class CommandProcessor extends WorkerHost {
  private readonly logger = new Logger(CommandProcessor.name);
  private readonly commandMap: Map<string, BotCommand>;

  constructor(
    private readonly telegramService: TelegramService,
    @Inject('BOT_COMMANDS')
    private readonly commands: BotCommand[],
  ) {
    super();

    // build a lookup map: command name → handler
    this.commandMap = new Map(commands.map((cmd) => [cmd.name, cmd]));

    this.logger.log(
      `Registered commands: ${[...this.commandMap.keys()].join(', ')}`,
    );
  }

  async process(job: Job<TelegramTaskPayload>): Promise<void> {
    const { chatId, text, updateId, username } = job.data;

    this.logger.log(
      `Processing job ${job.id} | update ${updateId} | @${username ?? 'unknown'}`,
    );

    const reply = await this.routeCommand(text);

    // send the result back to the user
    try {
      const truncated = this.truncateOutput(reply);
      await this.telegramService.sendMessage(chatId, truncated);

      this.logger.log(`Result sent to chat ${chatId} for job ${job.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to send result for job ${job.id}: ${errorMessage}`,
      );

      throw error;
    }
  }

  // command Router

  private async routeCommand(text: string): Promise<string> {
    const trimmed = text.trim();

    // extract the bot command (e.g. "/run") and the rest of the text
    const match = trimmed.match(/^\/(\w+)(?:\s+(.*))?$/s);

    if (!match) {
      return this.handleUnknown(trimmed);
    }

    const name = match[1].toLowerCase();
    const args = match[2]?.trim() ?? '';

    const handler = this.commandMap.get(name);

    if (!handler) {
      return this.handleUnknown(`/${name}`);
    }

    return handler.execute(args);
  }

  private handleUnknown(input: string): string {
    return [
      `Unknown command: "${input}"`,
      '',
      'Type /help to see available commands.',
    ].join('\n');
  }

  // utilities

  private truncateOutput(output: string): string {
    if (output.length <= MAX_MESSAGE_LENGTH) {
      return output;
    }

    const notice = '\n\n... (output truncated)';
    return output.slice(0, MAX_MESSAGE_LENGTH - notice.length) + notice;
  }
}
