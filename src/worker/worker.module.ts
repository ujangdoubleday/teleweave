import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module.js';
import { CommandProcessor } from './command.processor.js';
import { StartCommand } from './commands/start.command.js';
import { HelpCommand } from './commands/help.command.js';
import { RunCommand } from './commands/run.command.js';
import type { BotCommand } from './commands/bot-command.interface.js';

/**
 * All bot command handlers.
 *
 * To add a new command, create a file in `commands/` implementing
 * {@link BotCommand}, then add the class to this array.
 */
const BOT_COMMAND_CLASSES = [StartCommand, HelpCommand, RunCommand];

@Module({
  imports: [
    TelegramModule,
    BullModule.registerQueue({
      name: 'telegram-tasks',
    }),
  ],
  providers: [
    // Register each command as a NestJS provider
    ...BOT_COMMAND_CLASSES,

    // Collect all command instances into a single injection token
    {
      provide: 'BOT_COMMANDS',
      useFactory: (...commands: BotCommand[]) => commands,
      inject: BOT_COMMAND_CLASSES,
    },

    CommandProcessor,
  ],
})
export class WorkerModule {}
