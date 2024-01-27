import { Test, TestingModule } from '@nestjs/testing';
import DNS from 'dns/promises';
import { WinstonProvider } from '@common/winston/winston.provider';
import { DNSResolver } from '../dns.resolver';

jest.mock('@common/winston/winston.provider');

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
    expect(resolver).toBeDefined();
  });

  describe('getTXTRecords', () => {
    test('Should be defined', () => {
      expect(resolver['getTXTRecords']).toBeDefined();
    });

    test('should handle the case when resolveTxt returns no records', async () => {
      jest.spyOn(DNS, 'resolveTxt').mockResolvedValue([]);
      const result = await resolver['getTXTRecords']('example.com');
      expect(result).toEqual([]);
    });

    test('Should store related records', async () => {
      jest
        .spyOn(DNS, 'resolveTxt')
        .mockResolvedValue([['txt-value-1'], ['txt-value-2']]);
      const result = await resolver['getTXTRecords']('example.com');
      expect(result).toEqual(['txt-value-1', 'txt-value-2']);
    });
    test('Should iterate all arrays correctly', async () => {
      jest.spyOn(DNS, 'resolveTxt').mockResolvedValue([
        ['txt-value-1', 'txt-value-2'],
        ['txt-value-3', 'txt-value-4'],
      ]);
      const result = await resolver['getTXTRecords']('example.com');
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
      expect(resolver.getGatewayIDFromDomain).toBeDefined();
    });

    test('Should return "false" if identifier !== GATEWAY_ID', async () => {
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_Id=value']);
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        false,
      );
    });

    test('Should handle unusual GATEWAY_IDs', async () => {
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=a1/.,d=4~+=t5=s']);
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        'a1/.,d=4~+=t5=s',
      );
    });

    // Test for returning value when identifier === GATEWAY_ID
    test('Should return value when identifier === GATEWAY_ID', async () => {
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=value']);
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        'value',
      );
    });

    test('Should return false when GATEWAY_ID is not defined', async () => {
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockReturnValue(['GATEWAY_ID=']);
      expect(await resolver.getGatewayIDFromDomain('example.com')).toEqual(
        false,
      );
    });

    test('should log an error message when getTXTRecords fails', async () => {
      jest
        .spyOn(resolver as any, 'getTXTRecords')
        .mockRejectedValue(new Error('TXT records resolution failed'));

      await resolver.getGatewayIDFromDomain('example.com');

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
