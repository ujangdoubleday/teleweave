import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  SendMessagePayload,
  TelegramApiResponse,
  TelegramMessage,
} from './interfaces/telegram-api.interfaces.js';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  /**
   * Send a text message to a Telegram chat via the raw REST API.
   *
   * @param chatId  - Unique identifier for the target chat
   * @param text    - Message text (1-4096 characters)
   * @returns         The sent {@link TelegramMessage}
   */
  async sendMessage(chatId: number, text: string): Promise<TelegramMessage> {
    const url = `${this.baseUrl}/sendMessage`;

    const payload: SendMessagePayload = {
      chat_id: chatId,
      text,
    };

    this.logger.debug(`Sending message to chat ${chatId}`);

    const { data } = await firstValueFrom(
      this.httpService.post<TelegramApiResponse<TelegramMessage>>(url, payload),
    );

    if (!data.ok) {
      this.logger.error(
        `Telegram API error: ${data.error_code} – ${data.description}`,
      );
      throw new Error(
        `Telegram API error ${data.error_code}: ${data.description}`,
      );
    }

    this.logger.log(`Message ${data.result.message_id} sent to chat ${chatId}`);

    return data.result;
  }
}
