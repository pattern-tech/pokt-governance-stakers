import { NestFactory } from '@nestjs/core';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CoreModule } from './core.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CoreModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(WinstonProvider));
}
bootstrap();
