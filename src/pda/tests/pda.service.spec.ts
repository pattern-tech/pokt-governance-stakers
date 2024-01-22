import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { PDAService } from '../pda.service';
import { AxiosResponse } from 'axios';

describe('PDAService', () => {
  let service: PDAService;
  let axios: HttpService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      providers: [PDAService],
    }).compile();
    service = module.get<PDAService>(PDAService);
    axios = module.get<HttpService>(HttpService);
    config = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  test('Should be defined', () => {
    // Assert
    expect(service).toBeDefined();
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

      returnValue = await service['request'](query, variables);
    });

    test('Should be defined', () => {
      // Assert
      expect(service['request']).toBeDefined();
    });

    test('Should call get method from config', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('MYGATEWAY_ENDPOINT_URL');
    });

    test('Should call get method from config', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('MYGATEWAY_API_KEY');
    });

    test('Should call get method from config', () => {
      expect(config.get).toHaveBeenCalledWith('MYGATEWAY_AUTHENTICATION_TOKEN');
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
            Authorization: 'Bearer ',
            'x-api-key': '',
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
