import { Catch, ArgumentsHost, HttpServer, HttpStatus } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import { WinstonProvider } from '@common/winston/winston.provider';
import { MESSAGES } from '@nestjs/core/constants';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(private readonly logger: WinstonProvider) {
    super();
  }

  handleUnknownError(
    exception: unknown,
    host: ArgumentsHost,
    applicationRef: AbstractHttpAdapter | HttpServer,
  ) {
    const body = this.isHttpError(exception)
      ? {
          statusCode: exception.statusCode,
          message: exception.message,
        }
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        };

    const response = host.getArgByIndex(1);
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, body, body.statusCode);
    } else {
      applicationRef.end(response);
    }

    if (this.isExceptionObject(exception)) {
      return this.logger.error(exception.message, {
        context: 'ExceptionHandler',
        stack: exception.stack,
      });
    }
    return this.logger.error(String(exception), {
      context: 'ExceptionHandler',
    });
  }
}
