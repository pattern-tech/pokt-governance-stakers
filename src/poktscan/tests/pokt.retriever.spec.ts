import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { defaultsDeep } from 'lodash';
import { of } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import { PoktScanNodePagination } from '../interfaces/pokt-scan.interface';
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
  describe('getPoktNodeGQL', () => {
    test('Should be defined', () => {
      expect(retriever['getPoktNodeGQL']).toBeDefined();
    });

    test('Should return getPoktNode graphQL query', () => {
      expect(retriever['getPoktNodeGQL']()).toBe(
        `
    query ListPoktNode($cursor: ID) {
      ListPoktNode(
        pagination: {
          cursor: $cursor
          limit: 1500
          sort: { property: "_id", direction: -1 }
          filter: {
            operator: AND
            properties: [
              { property: "status", operator: EQ, type: INT, value: "2" }
            ]
          }
        }
      ) {
        items {
          output_address
          service_domain
          custodial
          tokens
        }
        pageInfo {
          has_next
          next
        }
      }
    }`,
      );
    });
  });

  describe('nextPage', () => {
    let poktScanNodePagination: PoktScanNodePagination;
    let returnValue: string | null;
    beforeEach(() => {
      poktScanNodePagination = {
        has_next: true,
        next: 'returnValue',
      };
    });
    test('Should be defined', () => {
      expect(retriever['nextPage']).toBeDefined();
    });

    test('Should return pageInfo.next when pageInfo.has_next === true', () => {
      returnValue = retriever['nextPage'](poktScanNodePagination);
      expect(returnValue).toBe('returnValue');
    });

    test('Should return "null" when pageInfo.has_next === false', () => {
      poktScanNodePagination = {
        has_next: false,
        next: 'returnValue',
      };
      returnValue = retriever['nextPage'](poktScanNodePagination);
      expect(returnValue).toBe(null);
    });
  });
});
