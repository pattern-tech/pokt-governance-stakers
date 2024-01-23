import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonProvider } from '@common/winston/winston.provider';
import { PoktScanRetriever } from '../pokt.retriever';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

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

    jest.clearAllMocks();
  });
  test('Should be defined', () => {
    expect(retriever).toBeDefined();
  });

  describe('request', () => {
    let query: string;
    let axiosResponse: AxiosResponse;
    let variables: Record<string, any>;
    let returnValue: Record<string, any>;

    beforeEach(async () => {
      query = 'query { test { test } }';
      variables = {};
      axiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: undefined,
        config: undefined,
      };
      jest.spyOn(config, 'get').mockReturnValue('');
      jest.spyOn(axios, 'post').mockReturnValue(of(axiosResponse));

      returnValue = await retriever['request'](query, variables);
    });

    test('Should be defined', () => {
      expect(retriever['request']).toBeDefined();
    });

    test('Should call get method from config', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('POKT_SCAN_API_BASE_URL');
    });

    test('Should call get method from config', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('POKT_SCAN_API_TOKEN');
    });

    test('Should call post from axios with the correct parameters', () => {
      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        '',
        {
          query,
          variables,
        },
        {
          headers: {
            Authorization: '',
            'Content-Type': 'application/json',
          },
        },
      );
    });
    test('Should return body from http response', () => {
      // Assert
      expect(returnValue).toEqual(axiosResponse.data);
    });
  });
});
