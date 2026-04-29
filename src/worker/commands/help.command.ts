import { Inject, Injectable } from '@nestjs/common';
import type { BotCommand } from './bot-command.interface.js';

/**
 * /help — Dynamically lists all registered bot commands.
 *
 * Receives the full command list via injection so it stays
 * in sync automatically when new commands are added.
 */
@Injectable()
export class HelpCommand implements BotCommand {
  readonly name = 'help';
  readonly description = 'Show available commands';

  constructor(
    @Inject('BOT_COMMANDS')
    private readonly commands: BotCommand[],
  ) {}

  execute(): string {
    const lines = this.commands.map(
      (cmd) => `- /${cmd.name} - ${cmd.description}`,
    );

    return ['Available Commands:', '', ...lines].join('\n');
  }
}
