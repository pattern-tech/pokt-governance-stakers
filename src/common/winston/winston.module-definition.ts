import { ConfigurableModuleBuilder } from '@nestjs/common';
import { LoggerOptions } from 'winston';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<LoggerOptions>()
    .setClassMethodName('forRoot')
    .setExtras(
      {
        isGlobal: true,
      },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
      }),
    )
    .build();
