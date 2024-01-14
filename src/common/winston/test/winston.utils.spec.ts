import { transports } from 'winston';
import { testingModule } from '../winston.utils';

describe('Winston utils', () => {
  describe('Winston console transport', () => {
    test('Should be winston console transport instance', () => {
      expect(testingModule.winstonConsoleTransport).toBeInstanceOf(
        transports.Console,
      );
    });
  });
  describe('Text format functions', () => {
    let mockInputString: string;

    beforeEach(() => {
      mockInputString = 'mock_string';
    });

    describe('When bold function called', () => {
      test('Should be defined', () => {
        expect(testingModule.textFormat.bold).toBeDefined();
      });

      test('Should be return bold string format', () => {
        expect(testingModule.textFormat.bold(mockInputString)).toBe(
          `\x1B[1m${mockInputString}\x1B[0m`,
        );
      });
    });

    describe('When green function called', () => {
      test('Should be defined', () => {
        expect(testingModule.textFormat.green).toBeDefined();
      });

      test('Should be return green color string format', () => {
        expect(testingModule.textFormat.green(mockInputString)).toBe(
          `\x1B[32m${mockInputString}\x1B[39m`,
        );
      });
    });

    describe('When yellow function called', () => {
      test('Should be defined', () => {
        expect(testingModule.textFormat.yellow).toBeDefined();
      });

      test('Should be return yellow color string format', () => {
        expect(testingModule.textFormat.yellow(mockInputString)).toBe(
          `\x1B[33m${mockInputString}\x1B[39m`,
        );
      });
    });

    describe('When red function called', () => {
      test('Should be defined', () => {
        expect(testingModule.textFormat.red).toBeDefined();
      });

      test('Should be return red color string format', () => {
        expect(testingModule.textFormat.red(mockInputString)).toBe(
          `\x1B[31m${mockInputString}\x1B[39m`,
        );
      });
    });

    describe('When magentaBright function called', () => {
      test('Should be defined', () => {
        expect(testingModule.textFormat.magentaBright).toBeDefined();
      });

      test('Should be return magentaBright color string format', () => {
        expect(testingModule.textFormat.magentaBright(mockInputString)).toBe(
          `\x1B[95m${mockInputString}\x1B[39m`,
        );
      });
    });

    describe('When cyanBright function called', () => {
      test('Should be defined', () => {
        expect(testingModule.textFormat.cyanBright).toBeDefined();
      });

      test('Should be return cyanBright color string format', () => {
        expect(testingModule.textFormat.cyanBright(mockInputString)).toBe(
          `\x1B[96m${mockInputString}\x1B[39m`,
        );
      });
    });
  });

  describe('When formatRunner function called', () => {
    test('Should be defined', () => {
      expect(testingModule.formatRunner).toBeDefined();
    });

    test('Should be return formatted runner name string', () => {
      expect(testingModule.formatRunner()).toBe('[\x1B[95mNest\x1B[39m]');
    });
  });

  describe('When formatTimestamp function called', () => {
    let mockTimeStamp: string;
    let functionResult: string;

    beforeAll(() => {
      mockTimeStamp = '2023-08-24T15:27:17.300Z';
      functionResult = testingModule.formatTimestamp(mockTimeStamp);
    });

    test('Should be defined', () => {
      expect(testingModule.formatTimestamp).toBeDefined();
    });

    test('Should be return timestamp local format string', () => {
      expect(functionResult).toBe(
        `\x1B[96m${new Date(mockTimeStamp).toLocaleString()}\x1B[39m`,
      );
    });
  });

  describe('When formatContext function called', () => {
    let mockContext: string;
    let functionResult: string;

    beforeAll(() => {
      mockContext = 'mock_context';
      functionResult = testingModule.formatContext(mockContext);
    });

    test('Should be defined', () => {
      expect(testingModule.formatContext).toBeDefined();
    });

    test('Should be return formatted context string', () => {
      expect(functionResult).toBe(`[\x1B[33m${mockContext}\x1B[39m]`);
    });

    test('Should be return empty string if context is undefined', () => {
      mockContext = undefined;

      expect(testingModule.formatContext(mockContext)).toBe('');
    });
  });

  describe('When formatMs function called', () => {
    let mockMS: string;
    let functionResult: string;

    beforeAll(() => {
      mockMS = '+2s';
      functionResult = testingModule.formatMs(mockMS);
    });

    test('Should be defined', () => {
      expect(testingModule.formatMs).toBeDefined();
    });

    test('Should be return formatted ms string', () => {
      expect(functionResult).toBe(`(\x1B[33m${mockMS}\x1B[39m)`);
    });
  });

  describe('When formatStack function called', () => {
    let mockErrorStack: string;
    let functionResult: string;

    beforeAll(() => {
      mockErrorStack = 'mock_error_stack';
      functionResult = testingModule.formatStack(mockErrorStack);
    });

    test('Should be defined', () => {
      expect(testingModule.formatStack).toBeDefined();
    });

    test('Should be return formatted stack string', () => {
      expect(functionResult).toBe(`\n${mockErrorStack}`);
    });

    test('Should be return empty string if stack is undefined', () => {
      mockErrorStack = undefined;

      expect(testingModule.formatStack(mockErrorStack)).toBe('');
    });
  });
});
