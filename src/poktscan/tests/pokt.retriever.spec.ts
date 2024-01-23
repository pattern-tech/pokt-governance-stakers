import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonProvider } from '@common/winston/winston.provider';
import { PoktScanRetriever } from '../pokt.retriever';

jest.mock('@common/winston/winston.provider');

describe('PoktScanRetriever', () => {
  let retriever: PoktScanRetriever;
  let config: ConfigService;
  let axios: HttpService;
  let logger: WinstonProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoktScanRetriever, WinstonProvider],
      imports: [HttpModule, ConfigModule],
    }).compile();

    logger = module.get<WinstonProvider>(WinstonProvider);
    axios = module.get<HttpService>(HttpService);
    config = module.get<ConfigService>(ConfigService);
    retriever = module.get<PoktScanRetriever>(PoktScanRetriever);
  });
  test('Should be defined', () => {
    expect(retriever).toBeDefined();
  });
});
