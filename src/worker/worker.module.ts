import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module.js';
import { CliProcessor } from './cli.processor.js';
import { CliTestController } from './cli-test.controller.js';

@Module({
  imports: [
    TelegramModule,
    BullModule.registerQueue({
      name: 'telegram-tasks',
    }),
  ],
  controllers: [CliTestController],
  providers: [CliProcessor],
})
export class WorkerModule {}
