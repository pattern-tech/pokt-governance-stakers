import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'winston';
import { WinstonLevel } from '../types/common.type';
import { WinstonProvider } from '../winston.provider';
import { WINSTON_LOGGER } from '../winston.constant';

describe('Winston Provider', () => {
  let provider: WinstonProvider;
  let logger: Logger;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: WINSTON_LOGGER,
          useValue: {
            log: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
        WinstonProvider,
      ],
    }).compile();

    provider = module.get<WinstonProvider>(WinstonProvider);
    logger = module.get<Logger>(WINSTON_LOGGER);
  });

  test('Should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('When log method called', () => {
    let level: WinstonLevel;
    let message: string;
    let metadata: Record<string, string>;
    let context: string;

    beforeAll(() => {
      level = 'debug';
      message = 'mock_message';
      metadata = { context: 'UnitTest' };
      context = 'UnitTest';
    });

    test('Should call winston log method if provided logging level', () => {
      provider.log(level, message, metadata);

      expect(logger.log).toBeCalledWith(level, message, metadata);
    });

    test('Should call winston info method if not provided logging level', () => {
      provider.log(message, context, metadata);

      expect(logger.info).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });
  });

  describe('When error method called', () => {
    let message: string;
    let metadata: Record<string, string>;
    let context: string;

    beforeAll(() => {
      message = 'mock_message';
      metadata = { context: 'UnitTest' };
      context = 'UnitTest';
    });

    test('Should call winston error method if provided context', () => {
      provider.error(message, metadata);

      expect(logger.error).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });

    test('Should call winston error method if not provided context', () => {
      provider.error(message, context, metadata);

      expect(logger.error).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });
  });

  describe('When warn method called', () => {
    let message: string;
    let metadata: Record<string, string>;
    let context: string;

    beforeAll(() => {
      message = 'mock_message';
      metadata = { context: 'UnitTest' };
      context = 'UnitTest';
    });

    test('Should call winston warn method if provided context', () => {
      provider.warn(message, metadata);

      expect(logger.warn).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });

    test('Should call winston warn method if not provided context', () => {
      provider.warn(message, context, metadata);

      expect(logger.warn).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });
  });

  describe('When debug method called', () => {
    let message: string;
    let metadata: Record<string, string>;
    let context: string;

    beforeAll(() => {
      message = 'mock_message';
      metadata = { context: 'UnitTest' };
      context = 'UnitTest';
    });

    test('Should call winston debug method if provided context', () => {
      provider.debug(message, metadata);

      expect(logger.debug).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });

    test('Should call winston debug method if not provided context', () => {
      provider.debug(message, context, metadata);

      expect(logger.debug).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });
  });

  describe('When verbose method called', () => {
    let message: string;
    let metadata: Record<string, string>;
    let context: string;

    beforeAll(() => {
      message = 'mock_message';
      metadata = { context: 'UnitTest' };
      context = 'UnitTest';
    });

    test('Should call winston verbose method if provided context', () => {
      provider.verbose(message, metadata);

      expect(logger.verbose).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });

    test('Should call winston verbose method if not provided context', () => {
      provider.verbose(message, context, metadata);

      expect(logger.verbose).toBeCalledWith(
        message,
        provider['appendContextIntoMeta'](context, metadata),
      );
    });
  });
});
