import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import { WPoktService } from '../wpokt.service';

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

describe('PDAService', () => {
  let wpokt: WPoktService;
  let axios: HttpService;
  let config: ConfigService;
  let logger: WinstonProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      providers: [WPoktService, WinstonProvider],
    }).compile();

    wpokt = module.get<WPoktService>(WPoktService);
    axios = module.get<HttpService>(HttpService);
    config = module.get<ConfigService>(ConfigService);
    logger = module.get<WinstonProvider>(WinstonProvider);

    jest.clearAllMocks();
  });

  test('Should be defined', () => {
    expect(wpokt).toBeDefined();
  });
  describe('request', () => {
    let query: string;
    let endpoint: string;
    let axiosResponse: AxiosResponse;
    let variables: Record<string, any>;
    let returnValue: Record<string, any>;
    beforeEach(async () => {
      endpoint = 'endpoint';
      query = 'query { test { test } }';
      variables = {};
      axiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: undefined,
        config: undefined,
      };
      jest.spyOn(axios, 'post').mockReturnValue(of(axiosResponse));

      returnValue = await wpokt['request'](endpoint, query, variables);
    });

    test('Should be defined', () => {
      // Assert
      expect(wpokt['request']).toBeDefined();
    });
    test('Should call debug from logger with the correct parameters', () => {
      expect(logger.debug).toHaveBeenCalledWith(
        'request method\n' +
          `input => ${JSON.stringify({ endpoint, query, variables })}\n` +
          `response => ${JSON.stringify({
            status: 200,
            body: {},
          })}\n`,
        WPoktService.name,
      );
    });

    test('Should call post from axios with the correct parameters', () => {
      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        endpoint,
        {
          query,
          variables,
        },
        {
          headers: {
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

  describe('requestV2', () => {
    let query: string;
    let variables: Record<string, any>;
    beforeEach(() => {
      query = 'query { test { test } }';
      variables = {};
      jest.spyOn(config, 'get').mockReturnValue('');
      jest.spyOn(wpokt as any, 'request').mockReturnValue({});
    });
    test('Should be defined', () => {
      expect(wpokt['requestV2']).toBeDefined();
    });
    test('Should call get method from config', async () => {
      await wpokt['requestV2'](query, variables);
      expect(config.get).toHaveBeenCalledWith('UNISWAP_V2_ENDPOINT_URL');
    });
    test('Should call request method with correct parameters', async () => {
      await wpokt['requestV2'](query, variables);
      expect(wpokt['request']).toHaveBeenCalledWith('', query, variables);
    });
  });
});
