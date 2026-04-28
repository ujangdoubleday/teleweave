import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type {
  TelegramTaskPayload,
  TelegramUpdate,
} from './interfaces/webhook.interfaces.js';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectQueue('telegram-tasks')
    private readonly telegramQueue: Queue<TelegramTaskPayload>,
  ) {}

  /**
   * Process an incoming Telegram update.
   *
   * - If `authorized` is `false` (Early Exit), log and skip.
   * - If `authorized` is `true`, push the payload to the BullMQ queue.
   *
   * Always resolves — the controller must return 200 to Telegram.
   */
  async handleUpdate(
    update: TelegramUpdate,
    authorized: boolean,
  ): Promise<void> {
    if (!authorized) {
      this.logger.debug(
        `Skipped update ${update.update_id} — unauthorized chat`,
      );
      return;
    }

    const message = update.message;
    if (!message?.text) {
      this.logger.debug(`Skipped update ${update.update_id} — no text content`);
      return;
    }

    const payload: TelegramTaskPayload = {
      updateId: update.update_id,
      chatId: message.chat.id,
      username: message.from?.username,
      text: message.text,
      date: message.date,
    };

    const job = await this.telegramQueue.add('incoming-message', payload, {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
    });

    this.logger.log(
      `Queued job ${job.id} for update ${update.update_id} from chat ${message.chat.id}`,
    );
  }
}
