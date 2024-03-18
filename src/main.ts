import { NestFactory } from '@nestjs/core';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CoreModule } from './core.module';
import { CoreService } from './core.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CoreModule, {
    bufferLogs: true,
  });
  const coreService = app.get<CoreService>(CoreService);

  app.useLogger(app.get(WinstonProvider));

  await coreService.handler();
}
bootstrap();
