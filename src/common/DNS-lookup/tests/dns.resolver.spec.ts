import { Test, TestingModule } from '@nestjs/testing';
import DNS from 'dns/promises';
import { WinstonProvider } from '@common/winston/winston.provider';
import { DNSResolver } from '../dns.resolver';

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

describe('DNSResolver', () => {
  let resolver: DNSResolver;
  let logger: WinstonProvider;

  beforeEach(async () => {
    // Create a testing module with the required providers
    const module: TestingModule = await Test.createTestingModule({
      providers: [DNSResolver, WinstonProvider],
    }).compile();

    // Get instances of DNSResolver and WinstonProvider
    resolver = module.get<DNSResolver>(DNSResolver);
    logger = module.get<WinstonProvider>(WinstonProvider);

    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  // General test for the existence of the resolver instance
  test('Should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getTXTRecords', () => {
    // Test for the existence of the private method getTXTRecords
    test('Should be defined', () => {
      expect(resolver['getTXTRecords']).toBeDefined();
    });

    // Test for handling the case when resolveTxt returns no records
    test('should handle the case when resolveTxt returns no records', async () => {
      // Mocking the DNS.resolveTxt function to return an empty array
      jest.spyOn(DNS, 'resolveTxt').mockResolvedValue([]);
      const result = await resolver['getTXTRecords']('example.com');
      expect(result).toEqual([]);
    });

    // Test for storing related records
    test('Should store related records', async () => {
      // Mocking the DNS.resolveTxt function to return specific values
      jest
        .spyOn(DNS, 'resolveTxt')
        .mockResolvedValue([['txt-value-1'], ['txt-value-2']]);
      const result = await resolver['getTXTRecords']('example.com');
      expect(result).toEqual(['txt-value-1', 'txt-value-2']);
    });
  });

  describe('getGatewayIDFromDomain', () => {
    // Test for the existence of the public method getGatewayIDFromDomain
    test('Should be defined', () => {
      expect(resolver.getGatewayIDFromDomain).toBeDefined();
    });

    // Test for returning "false" if identifier !== GATEWAY_ID
    test('Should return "false" if identifier !== GATEWAY_ID', async () => {
      // Mocking the private method getTXTRecords to return specific values
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_Id=value']);
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        false,
      );
    });

    // Test for returning value when identifier === GATEWAY_ID
    test('Should return value when identifier === GATEWAY_ID', async () => {
      // Mocking the private method getTXTRecords to return specific values
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=value']);
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        'value',
      );
    });

    // Test for logging an error message when getTXTRecords fails
    test('should log an error message when getTXTRecords fails', async () => {
      // Mocking the private method getTXTRecords to throw an error
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockRejectedValue(new Error('TXT records resolution failed'));

      // Mocking the logger.error function to capture the log
      const spyLoggerError = jest.spyOn(logger, 'error');

      // Run the method that will trigger the error log
      await resolver.getGatewayIDFromDomain('example.com');

      // Assert that the logger.error function was called with the expected parameters
      expect(spyLoggerError).toHaveBeenCalledWith(
        'TXT records resolution failed',
        'DNSResolver',
        { stack: expect.any(String) },
      );
    });
  });
});
