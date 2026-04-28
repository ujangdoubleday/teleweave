import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module.js';
import { CliProcessor } from './cli.processor.js';

@Module({
  imports: [
    TelegramModule,
    BullModule.registerQueue({
      name: 'telegram-tasks',
    }),
  ],
  providers: [CliProcessor],
})
export class WorkerModule {}
