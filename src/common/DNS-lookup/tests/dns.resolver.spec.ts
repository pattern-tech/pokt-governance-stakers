import { Test, TestingModule } from '@nestjs/testing';
import DNS from 'dns/promises';
import { WinstonProvider } from '@common/winston/winston.provider';
import { DNSResolver } from '../dns.resolver';

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

// Describe the test suite for the DNSResolver
describe('DNSResolver', () => {
  let resolver: DNSResolver;
  let logger: WinstonProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DNSResolver, WinstonProvider],
    }).compile();

    resolver = module.get<DNSResolver>(DNSResolver);
    logger = module.get<WinstonProvider>(WinstonProvider);

    jest.clearAllMocks();
  });

  test('Should be defined', () => {
    // Assert
    expect(resolver).toBeDefined();
  });

  describe('getTXTRecords', () => {
    beforeEach(() => {
      jest.spyOn(DNS, 'resolveTxt').mockResolvedValue([]);
    });
    test('Should be defined', () => {
      // Assert
      expect(resolver['getTXTRecords']).toBeDefined();
    });
    test('Should call resolveTxt method from DNS with correct parameters', async () => {
      // Act
      await resolver['getTXTRecords']('example.com');
      expect(DNS.resolveTxt).toHaveBeenCalledWith('example.com');
      expect(DNS.resolveTxt).toHaveBeenCalledTimes(1);
    });
    test('should handle the case when resolveTxt returns no records', async () => {
      // Act
      const result = await resolver['getTXTRecords']('example.com');
      // Assert
      expect(result).toEqual([]);
    });
    test('Should store related records', async () => {
      // Arrange
      jest
        .spyOn(DNS, 'resolveTxt')
        .mockResolvedValue([['txt-value-1'], ['txt-value-2']]);
      // Act
      const result = await resolver['getTXTRecords']('example.com');
      // Assert
      expect(result).toEqual(['txt-value-1', 'txt-value-2']);
    });
    test('Should iterate all arrays correctly and return final records', async () => {
      // Arrange
      jest.spyOn(DNS, 'resolveTxt').mockResolvedValue([
        ['txt-value-1', 'txt-value-2'],
        ['txt-value-3', 'txt-value-4'],
      ]);
      // Act
      const result = await resolver['getTXTRecords']('example.com');
      // Assert
      expect(result).toEqual([
        'txt-value-1',
        'txt-value-2',
        'txt-value-3',
        'txt-value-4',
      ]);
    });
  });

  describe('getGatewayIDFromDomain', () => {
    test('Should be defined', () => {
      // Assert
      expect(resolver.getGatewayIDFromDomain).toBeDefined();
    });
    test('Should call resolveTxt method from DNS with correct parameters', async () => {
      // Arrange
      jest.spyOn(DNS, 'resolveTxt').mockResolvedValue([]);
      // Act
      await resolver['getTXTRecords']('example.com');
      expect(DNS.resolveTxt).toHaveBeenCalledWith('example.com');
      expect(DNS.resolveTxt).toHaveBeenCalledTimes(1);
    });
    test('Should return "false" if identifier !== GATEWAY_ID', async () => {
      // Arrange
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_Id=value']);
      // Assert
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        false,
      );
    });
    test('Should handle unusual GATEWAY_IDs', async () => {
      // Arrange
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=a1/.,d=4~+=t5=s']);
      // Assert
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        'a1/.,d=4~+=t5=s',
      );
    });
    test('Should return value when identifier === GATEWAY_ID', async () => {
      // Arrange
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=value']);
      // Assert
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        'value',
      );
    });
    test('Should return false when GATEWAY_ID is not defined', async () => {
      // Arrange
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=']);
      // Assert
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        false,
      );
    });
    test('should log an error message when getTXTRecords fails', async () => {
      // Arrange
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockRejectedValue(new Error('TXT records resolution failed'));
      // Act
      await resolver.getGatewayIDFromDomain('example.com');
      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'TXT records resolution failed',
        'DNSResolver',
        { stack: expect.any(String) },
      );
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        false,
      );
    });
  });
});
