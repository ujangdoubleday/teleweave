import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TelegramGuard } from './guards/telegram.guard.js';
import type { TelegramUpdate } from './interfaces/webhook.interfaces.js';
import { WebhookService } from './webhook.service.js';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * POST /webhook/telegram
   *
   * Always returns 200 OK to Telegram.
   * TelegramGuard handles secret-token validation and Early Exit flagging.
   */
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TelegramGuard)
  async handleTelegramWebhook(
    @Req()
    req: Request & {
      telegramAuthorized?: boolean;
      telegramUpdate?: TelegramUpdate;
    },
  ): Promise<{ status: string }> {
    const update = req.telegramUpdate!;
    const authorized = req.telegramAuthorized ?? false;

    this.logger.debug(`Received update ${update.update_id}`);

    await this.webhookService.handleUpdate(update, authorized);

    return { status: 'ok' };
  }
}
