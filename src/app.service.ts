import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 200,
      message: 'okok',
      timestamp: new Date().toISOString(),
    };
  }
}
