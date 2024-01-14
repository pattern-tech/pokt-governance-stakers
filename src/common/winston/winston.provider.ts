import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'winston';
import { WinstonLevel } from './types/common.type';
import { WINSTON_LOGGER } from './winston.constant';

@Injectable()
export class WinstonProvider implements LoggerService {
  private readonly levels: WinstonLevel[] = [
    'debug',
    'error',
    'info',
    'verbose',
    'warn',
  ];

  constructor(@Inject(WINSTON_LOGGER) private readonly logger: Logger) {}

  private appendContextIntoMeta(
    contextOrMeta: string | Record<string, any>,
    metadata: Record<string, any>,
  ) {
    return typeof contextOrMeta === 'object'
      ? contextOrMeta
      : { context: contextOrMeta, ...metadata };
  }

  log(message: string, context?: string, metadata?: Record<string, any>);
  log(level: WinstonLevel, message: string, metadata?: Record<string, any>);
  log(
    messageOrLevel: string | WinstonLevel,
    messageOrContext?: string,
    metadata?: Record<string, any>,
  ) {
    if (this.levels.includes(messageOrLevel.toLowerCase() as WinstonLevel)) {
      this.logger.log(messageOrLevel, messageOrContext, metadata);
    } else {
      this.logger.info(
        messageOrLevel,
        this.appendContextIntoMeta(messageOrContext, metadata),
      );
    }
  }

  error(message, context?: string, metadata?: Record<string, any>);
  error(message: string, metadata?: Record<string, any>);
  error(
    message: string,
    contextOrMetadata?: string | Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    this.logger.error(
      message,
      this.appendContextIntoMeta(contextOrMetadata, metadata),
    );
  }

  warn(message, context?: string, metadata?: Record<string, any>);
  warn(message: string, metadata?: Record<string, any>);
  warn(
    message: string,
    contextOrMetadata?: string | Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    this.logger.warn(
      message,
      this.appendContextIntoMeta(contextOrMetadata, metadata),
    );
  }

  debug(message, context?: string, metadata?: Record<string, any>);
  debug(message: string, metadata?: Record<string, any>);
  debug(
    message: string,
    contextOrMetadata?: string | Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    this.logger.debug(
      message,
      this.appendContextIntoMeta(contextOrMetadata, metadata),
    );
  }

  verbose(message, context?: string, metadata?: Record<string, any>);
  verbose(message: string, metadata?: Record<string, any>);
  verbose(
    message: string,
    contextOrMetadata?: string | Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    this.logger.verbose(
      message,
      this.appendContextIntoMeta(contextOrMetadata, metadata),
    );
  }
}
