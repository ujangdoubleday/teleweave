import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TelegramGuard } from './guards/telegram.guard.js';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'telegram-tasks',
    }),
  ],
  controllers: [WebhookController],
  providers: [TelegramGuard, WebhookService],
})
export class WebhookModule {}
