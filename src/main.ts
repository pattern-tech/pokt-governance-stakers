import { NestFactory } from '@nestjs/core';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CoreModule } from './core.module';
import { CoreService } from './core.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CoreModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(WinstonProvider));

  const coreService = app.get<CoreService>(CoreService);
  await coreService.handler();

  await app.close();
}
bootstrap();
