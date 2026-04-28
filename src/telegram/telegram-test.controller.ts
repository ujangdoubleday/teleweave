import { Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';

/**
 * Test controller for verifying Telegram bot connectivity.
 * Mount at /telegram/test/* — remove or guard in production.
 */
@Controller('telegram/test')
export class TelegramTestController {
  private readonly logger = new Logger(TelegramTestController.name);

  constructor(private readonly telegramService: TelegramService) {}

  /**
   * GET /telegram/test/me
   * Verify the bot token is valid by calling Telegram's /getMe.
   */
  @Get('me')
  async getMe() {
    this.logger.log('Testing bot token via /getMe...');
    const bot = await this.telegramService.getMe();
    return {
      status: 'ok',
      bot,
    };
  }

  /**
   * POST /telegram/test/send?chatId=123&text=hello
   * Send a test message to a specific chat.
   */
  @Post('send')
  async sendTestMessage(
    @Query('chatId') chatId: string,
    @Query('text') text: string,
  ) {
    const id = Number(chatId);
    const message = text || '🏓 Pong! Teleweave is connected.';

    this.logger.log(`Sending test message to chat ${id}`);
    const result = await this.telegramService.sendMessage(id, message);

    return {
      status: 'ok',
      message_id: result.message_id,
      chat_id: result.chat.id,
    };
  }
}
