import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { TelegramUpdate } from '../interfaces/webhook.interfaces.js';

/**
 * Security guard for the Telegram webhook endpoint.
 *
 * Two-layer validation:
 *  1. **Secret Token** – rejects the request (401) if the
 *     `X-Telegram-Bot-Api-Secret-Token` header does not match.
 *  2. **Chat ID Allow-list** – does NOT reject, but flags the request
 *     as unauthorized so the service can return 200 OK immediately
 *     without further processing (Early Exit policy).
 */
@Injectable()
export class TelegramGuard implements CanActivate {
  private readonly logger = new Logger(TelegramGuard.name);
  private readonly secretToken: string;
  private readonly allowedChatIds: Set<number>;

  constructor(private readonly configService: ConfigService) {
    this.secretToken = this.configService.getOrThrow<string>(
      'TELEGRAM_SECRET_TOKEN',
    );

    const raw = this.configService.getOrThrow<string>('ALLOWED_CHAT_IDS');
    this.allowedChatIds = new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map(Number),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & {
        telegramAuthorized?: boolean;
        telegramUpdate?: TelegramUpdate;
      }
    >();

    // ── Layer 1: Validate secret token ────────────────────────
    const headerToken = req.headers['x-telegram-bot-api-secret-token'];

    if (headerToken !== this.secretToken) {
      this.logger.warn('Rejected: invalid secret token');
      throw new UnauthorizedException('Invalid secret token');
    }

    // ── Parse the update body ─────────────────────────────────
    const update = req.body as TelegramUpdate;
    req.telegramUpdate = update;

    // ── Layer 2: Chat ID allow-list (Early Exit flag) ─────────
    const chatId = update?.message?.chat?.id;

    if (chatId === undefined || !this.allowedChatIds.has(chatId)) {
      this.logger.warn(
        `Early exit: chat ${chatId ?? 'unknown'} not in allow-list`,
      );
      req.telegramAuthorized = false;
      // Allow the request through — the service will return 200 OK
      return true;
    }

    req.telegramAuthorized = true;
    return true;
  }
}
