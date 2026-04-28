import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TelegramTestController } from './telegram-test.controller.js';
import { TelegramService } from './telegram.service.js';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [TelegramTestController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
