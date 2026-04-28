/**
 * Strict TypeScript interfaces for the Telegram Bot API payloads.
 * @see https://core.telegram.org/bots/api#sendmessage
 */

// ─── Request Payloads ───────────────────────────────────────

export interface SendMessagePayload {
  /** Unique identifier for the target chat */
  chat_id: number;

  /** Text of the message to be sent (1-4096 characters) */
  text: string;

  /** Mode for parsing entities in the message text */
  parse_mode?: 'MarkdownV2' | 'HTML';

  /** Disables link previews for links in this message */
  disable_web_page_preview?: boolean;

  /** Sends the message silently (no notification on the client) */
  disable_notification?: boolean;

  /** If the message is a reply, ID of the original message */
  reply_to_message_id?: number;
}

// ─── Response Types ─────────────────────────────────────────

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  error_code?: number;
}
