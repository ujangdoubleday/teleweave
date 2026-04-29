import { Injectable } from '@nestjs/common';
import type { BotCommand } from './bot-command.interface.js';

@Injectable()
export class StartCommand implements BotCommand {
  readonly name = 'start';
  readonly description = 'Show welcome message';

  execute(): string {
    return ['yoo!', '', 'Type /help to see available commands.'].join('\n');
  }
}
