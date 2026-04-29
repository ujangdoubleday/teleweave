import { Injectable } from '@nestjs/common';
import type { BotCommand } from './bot-command.interface.js';

/**
 * /help - Dynamically lists all registered bot commands.
 *
 * Commands are registered at runtime by the CommandProcessor
 * via `registerCommands()` to avoid a circular dependency.
 */
@Injectable()
export class HelpCommand implements BotCommand {
  readonly name = 'help';
  readonly description = 'Show available commands';

  private commands: BotCommand[] = [];

  registerCommands(commands: BotCommand[]): void {
    this.commands = commands;
  }

  execute(): string {
    const lines = this.commands.map(
      (cmd) => `- /${cmd.name} - ${cmd.description}`,
    );

    return ['<b>Available Commands:</b>', '', ...lines].join('\n');
  }
}
