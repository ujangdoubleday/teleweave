/**
 * Strict TypeScript interfaces for the incoming Telegram Webhook payload.
 * @see https://core.telegram.org/bots/api#update
 */

import type {
  TelegramChat,
  TelegramUser,
} from '../../telegram/interfaces/telegram-api.interfaces.js';

// ─── Incoming Update ────────────────────────────────────────

export interface TelegramUpdate {
  /** The update's unique identifier */
  update_id: number;

  /** New incoming message of any kind */
  message?: TelegramUpdateMessage;
}

export interface TelegramUpdateMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

// ─── Queue Job Payload ──────────────────────────────────────

export interface TelegramTaskPayload {
  /** The raw update_id from Telegram */
  updateId: number;

  /** Chat ID the message came from */
  chatId: number;

  /** Username of the sender, if available */
  username?: string;

  /** The message text */
  text: string;

  /** Unix timestamp from Telegram */
  date: number;
}

// ─── Request Decoration ─────────────────────────────────────

/**
 * Extended Express Request decorated by TelegramGuard.
 * `telegramAuthorized` is set to `false` for disallowed chat IDs
 * so the service can return 200 OK without processing (Early Exit).
 */
export interface TelegramWebhookRequest extends Request {
  telegramAuthorized: boolean;
  telegramUpdate: TelegramUpdate;
}
