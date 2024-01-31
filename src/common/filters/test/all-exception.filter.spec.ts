import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonProvider } from '@common/winston/winston.provider';
import { AllExceptionsFilter } from '../all-exception.filter';

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

// Describe the test suite for the AllExceptionsFilter
describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: WinstonProvider;
  let hostMock: ArgumentsHost;
  let applicationRefMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter, WinstonProvider],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    logger = module.get<WinstonProvider>(WinstonProvider);

    hostMock = {
      getArgByIndex: jest.fn(() => ({ headersSent: false })),
    } as unknown as ArgumentsHost;
    applicationRefMock = {
      isHeadersSent: jest.fn(() => false),
      reply: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('Should be defined', () => {
    // Assert
    expect(filter).toBeDefined();
  });

  describe('handleUnknownError', () => {
    test('Should be defined', () => {
      // Assert
      expect(filter.handleUnknownError).toBeDefined();
    });

    test('Should handle unknown error and log it', () => {
      // Arrange
      const exception = new Error('Test error');
      filter.handleUnknownError(exception, hostMock, applicationRefMock);
      // Assert
      expect(applicationRefMock.isHeadersSent).toHaveBeenCalled();
      expect(applicationRefMock.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: expect.any(String),
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(logger.error).toHaveBeenCalledWith(exception.message, {
        context: 'ExceptionHandler',
        stack: exception.stack,
      });
    });

    test('Should end the response if headers are already sent and call error method from logger when exception is an object', () => {
      // Arrange
      const exception = new Error('Test error');
      applicationRefMock.isHeadersSent = jest.fn(() => true);
      filter.handleUnknownError(exception, hostMock, applicationRefMock);
      // Assert
      expect(applicationRefMock.end).toHaveBeenCalledWith(expect.anything());
      expect(applicationRefMock.reply).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test('Should end the response if headers are already sent and call error method from logger when exception is not an object', () => {
      // Arrange
      const exception = new Error('Test error');
      applicationRefMock.isHeadersSent = jest.fn(() => true);
      filter.handleUnknownError(
        String(exception),
        hostMock,
        applicationRefMock,
      );
      // Assert
      expect(applicationRefMock.end).toHaveBeenCalledWith(expect.anything());
      expect(applicationRefMock.reply).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
