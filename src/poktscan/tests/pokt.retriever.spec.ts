import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  PoktScanNodeItem,
  PoktScanNodePagination,
  PoktScanOutput,
  PoktScanResponse,
} from '../interfaces/pokt-scan.interface';
import { PoktScanRetriever } from '../pokt.retriever';

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

// Describe the test suite for the PoktScanRetriever
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
    // Assert
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
      // Assert
      expect(retriever['request']).toBeDefined();
    });
    test('Should call get method from config for POKT_SCAN_API_BASE_URL', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('POKT_SCAN_API_BASE_URL');
    });
    test('Should call get method from config for POKT_SCAN_API_TOKEN', () => {
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

    test('Should call debug from logger with correct parameters', async () => {
      // Act
      await retriever['request'](query, variables);
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        'request method\n' +
          `input => ${JSON.stringify({ query, variables })}\n` +
          `response => ${JSON.stringify({
            status: axiosResponse.status,
            body: axiosResponse.data,
          })}\n`,
        PoktScanRetriever.name,
      );
    });
    test('Should return body from http response', () => {
      // Assert
      expect(returnValue).toEqual(axiosResponse.data);
    });
  });

  describe('getPoktNodeGQL', () => {
    test('Should be defined', () => {
      // Assert
      expect(retriever['getPoktNodeGQL']).toBeDefined();
    });
    test('Should return getPoktNode graphQL query', () => {
      // Assert
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
          address
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
      // Assert
      expect(retriever['nextPage']).toBeDefined();
    });
    test('Should return pageInfo.next when pageInfo.has_next === true', () => {
      // Act
      returnValue = retriever['nextPage'](poktScanNodePagination);
      // Assert
      expect(returnValue).toBe('returnValue');
    });
    test('Should return "null" when pageInfo.has_next === false', () => {
      // Arrange
      poktScanNodePagination = {
        has_next: false,
        next: 'returnValue',
      };
      // Act
      returnValue = retriever['nextPage'](poktScanNodePagination);
      // Assert
      expect(returnValue).toBe(null);
    });
  });

  describe('getListNodeData', () => {
    let result: PoktScanResponse;
    let firstResult: PoktScanResponse;
    let item: PoktScanNodeItem;
    let firstItem: PoktScanNodeItem;
    let returnValue;

    beforeEach(async () => {
      firstItem = {
        address: 'address',
        output_address: 'address2',
        service_domain: 'domain2',
        custodial: true,
        tokens: 5000000,
      };
      item = {
        address: 'address',
        output_address: 'address1',
        service_domain: 'domain1',
        custodial: false,
        tokens: 1000000,
      };
      firstResult = {
        data: {
          ListPoktNode: {
            items: [firstItem],
            pageInfo: { has_next: true, next: 'nextPage' },
          },
        },
      };
      result = {
        data: {
          ListPoktNode: {
            items: [item],
            pageInfo: { has_next: false, next: null },
          },
        },
      };
      jest.spyOn(retriever as any, 'getPoktNodeGQL').mockReturnValue('');
    });

    test('Should be defined', () => {
      // Assert
      expect(retriever['getListNodeData']).toBeDefined();
    });
    test('Should retrieve node data successfully when nextPage is null', async () => {
      // Arrange
      jest.spyOn(retriever as any, 'request').mockResolvedValueOnce(result);
      // Assert
      expect(await retriever['getListNodeData']()).toEqual([
        {
          address: 'address',
          output_address: 'address1',
          service_domain: 'domain1',
          custodial: false,
          tokens: 1000000,
        },
      ]);
    });
    test('Should call request method with correct parameters', async () => {
      // Arrange
      jest
        .spyOn(retriever as any, 'request')
        .mockResolvedValueOnce(firstResult);
      jest.spyOn(retriever as any, 'request').mockResolvedValueOnce(result);
      // Act
      await retriever['getListNodeData']();
      // Assert
      expect(retriever['request']).toHaveBeenCalledWith('', {
        cursor: null,
      });
      expect(retriever['request']).toHaveBeenCalledWith('', {
        cursor: 'nextPage',
      });
      expect(retriever['request']).toHaveBeenCalledTimes(2);
    });
    test('Should retrieve node data successfully when nextPage is not null', async () => {
      // Arrange
      jest
        .spyOn(retriever as any, 'request')
        .mockResolvedValueOnce(firstResult);
      jest.spyOn(retriever as any, 'request').mockResolvedValueOnce(result);
      // Act
      returnValue = await retriever['getListNodeData']();
      // Assert
      expect(returnValue[1].address).toEqual('address');
      expect(returnValue[1].tokens).toEqual(1000000);
      expect(returnValue[1].custodial).toEqual(false);
      expect(returnValue[0].address).toEqual('address');
      expect(returnValue[0].tokens).toEqual(5000000);
      expect(returnValue[0].custodial).toEqual(true);
      expect(returnValue.length).toEqual(2);
    });
  });

  describe('serializer', () => {
    let nodeItems: Array<PoktScanNodeItem>;
    let returnValue;
    beforeEach(() => {
      nodeItems = [
        {
          address: 'address',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 5000000,
        },
      ];
    });

    test('Should be defined', () => {
      // Assert
      expect(retriever['serializer']).toBeDefined();
    });

    test(`Should create service_domain and add item to it 
whenservice_domain is not in result.custodian and custodial === true`, () => {
      // Act
      returnValue = retriever['serializer'](nodeItems);
      // Assert
      expect(returnValue).toEqual({
        custodian: {
          service_domain: [
            {
              domain: 'service_domain',
              staked_amount: 5,
              wallet_address: 'address',
            },
          ],
        },
        non_custodian: {},
      });
    });

    test('Should add new item to available array when service_domain be in result.custodian', () => {
      // Arrange
      nodeItems = [
        {
          address: 'address',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 5000000,
        },
        {
          address: 'address2',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 6000000,
        },
      ];
      // Act
      returnValue = retriever['serializer'](nodeItems);
      // Assert
      expect(returnValue).toEqual({
        custodian: {
          service_domain: [
            {
              domain: 'service_domain',
              staked_amount: 5,
              wallet_address: 'address',
            },
            {
              domain: 'service_domain',
              staked_amount: 6,
              wallet_address: 'address2',
            },
          ],
        },
        non_custodian: {},
      });
    });
    test(`Should create output_address and add item to it 
when output_address is not in result.non_custodian and custodial !== true`, () => {
      // Arrange
      nodeItems = [
        {
          address: 'address',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 5000000,
        },
      ];
      // Act
      returnValue = retriever['serializer'](nodeItems);
      // Assert
      expect(returnValue).toEqual({
        custodian: {},
        non_custodian: {
          output_address: [
            {
              wallet_address: 'output_address',
              staked_amount: 5,
            },
          ],
        },
      });
    });
    test('Should add new item to available array when output_address be in result.non_custodian', () => {
      // Arrange
      nodeItems = [
        {
          address: 'address',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 5000000,
        },
        {
          address: 'address2',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 6000000,
        },
      ];
      // Act
      returnValue = retriever['serializer'](nodeItems);
      // Assert
      expect(returnValue).toEqual({
        custodian: {},
        non_custodian: {
          output_address: [
            {
              wallet_address: 'output_address',
              staked_amount: 5,
            },
            {
              wallet_address: 'output_address',
              staked_amount: 6,
            },
          ],
        },
      });
    });

    test('Should handle both custodian and non-custodian parameters together', () => {
      // Arrange
      nodeItems = [
        {
          address: 'address1',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 1000000,
        },
        {
          address: 'address3',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 3000000,
        },
        {
          address: 'address2',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 2000000,
        },
        {
          address: 'address4',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 4000000,
        },
      ];
      // Act
      returnValue = retriever['serializer'](nodeItems);
      // Assert
      expect(returnValue).toEqual({
        custodian: {
          service_domain: [
            {
              domain: 'service_domain',
              staked_amount: 1,
              wallet_address: 'address1',
            },
            {
              domain: 'service_domain',
              staked_amount: 2,
              wallet_address: 'address2',
            },
          ],
        },
        non_custodian: {
          output_address: [
            {
              wallet_address: 'output_address',
              staked_amount: 3,
            },
            {
              wallet_address: 'output_address',
              staked_amount: 4,
            },
          ],
        },
      });
    });
  });

  describe('retrieve', () => {
    beforeEach(() => {
      jest.spyOn(retriever as any, 'getListNodeData').mockResolvedValueOnce([
        {
          address: 'address3',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 3000000,
        },
        {
          address: 'address2',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 2000000,
        },
      ]);
    });
    test('Should be defined', () => {
      // Assert
      expect(retriever.retrieve).toBeDefined();
    });
    test('should retrieve and serialize node data successfully', async () => {
      // Act
      const result: PoktScanOutput = await retriever.retrieve();
      // Assert
      expect(result).toEqual({
        custodian: {
          service_domain: [
            {
              domain: 'service_domain',
              staked_amount: 2,
              wallet_address: 'address2',
            },
          ],
        },
        non_custodian: {
          output_address: [
            {
              wallet_address: 'output_address',
              staked_amount: 3,
            },
          ],
        },
      });
    });

    test('Should call serializer method with correct parameters', async () => {
      // Arrange
      jest.spyOn(retriever as any, 'serializer').mockReturnValue({});
      // Act
      await retriever.retrieve();
      // Assert
      expect(retriever['serializer']).toHaveBeenCalledWith([
        {
          address: 'address3',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: false,
          tokens: 3000000,
        },
        {
          address: 'address2',
          output_address: 'output_address',
          service_domain: 'service_domain',
          custodial: true,
          tokens: 2000000,
        },
      ]);
    });
  });
});
