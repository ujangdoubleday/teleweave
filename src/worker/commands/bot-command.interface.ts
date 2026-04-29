/**
 * Interface that every bot command handler must implement.
 */
export interface BotCommand {
  /** The command name without the leading slash, e.g. "start", "run". */
  readonly name: string;

  /** Short description shown in /help. */
  readonly description: string;

  /**
   * Execute the command.
   *
   * @param args - The text after the command name (may be empty).
   * @returns The reply message to send back to the user.
   */
  execute(args: string): Promise<string> | string;
}
