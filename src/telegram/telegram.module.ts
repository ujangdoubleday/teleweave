import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
