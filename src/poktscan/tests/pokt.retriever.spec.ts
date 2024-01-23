// Import necessary modules and dependencies.
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

// Mock the WinstonProvider module to isolate the testing environment.
jest.mock('@common/winston/winston.provider');

describe('PoktScanRetriever', () => {
  // Define variables for testing.
  let retriever: PoktScanRetriever;
  let config: ConfigService;
  let axios: HttpService;
  let logger: WinstonProvider;

  beforeEach(async () => {
    // Create a testing module to initialize dependencies before each test.
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoktScanRetriever, WinstonProvider],
      imports: [HttpModule, ConfigModule],
    }).compile();

    // Retrieve instances of dependencies from the testing module.
    logger = module.get<WinstonProvider>(WinstonProvider);
    axios = module.get<HttpService>(HttpService);
    config = module.get<ConfigService>(ConfigService);
    retriever = module.get<PoktScanRetriever>(PoktScanRetriever);

    // Clear all mocks before each test.
    jest.clearAllMocks();
  });

  // Test to ensure that the retriever is defined.
  test('Should be defined', () => {
    expect(retriever).toBeDefined();
  });

  // Tests for the 'request' function.
  describe('request', () => {
    // Define variables for testing.
    let query: string;
    let axiosResponse: AxiosResponse;
    let variables: Record<string, any>;
    let returnValue: Record<string, any>;

    beforeEach(async () => {
      // Set up variables for testing.
      query = 'query { test { test } }';
      variables = {};
      axiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: undefined,
        config: undefined,
      };

      // Mock certain functions and values for testing.
      jest.spyOn(config, 'get').mockReturnValue('');
      jest.spyOn(axios, 'post').mockReturnValue(of(axiosResponse));

      // Call the 'request' function and store the return value.
      returnValue = await retriever['request'](query, variables);
    });

    // Test to ensure that the 'request' function is defined.
    test('Should be defined', () => {
      expect(retriever['request']).toBeDefined();
    });

    // Test to check if 'get' method from config is called for POKT_SCAN_API_BASE_URL.
    test('Should call get method from config for POKT_SCAN_API_BASE_URL', () => {
      expect(config.get).toHaveBeenCalledWith('POKT_SCAN_API_BASE_URL');
    });

    // Test to check if 'get' method from config is called for POKT_SCAN_API_TOKEN.
    test('Should call get method from config for POKT_SCAN_API_TOKEN', () => {
      expect(config.get).toHaveBeenCalledWith('POKT_SCAN_API_TOKEN');
    });

    // Test to check if 'post' method from axios is called with the correct parameters.
    test('Should call post from axios with the correct parameters', () => {
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

    // Test to check if 'debug' method from logger is called.
    test('Should call debug from logger', async () => {
      await retriever['request'](query, variables);
      expect(logger.debug).toHaveBeenCalled();
    });

    // Test to check if the 'request' function returns the body from the HTTP response.
    test('Should return body from http response', () => {
      expect(returnValue).toEqual(axiosResponse.data);
    });
  });

  // Tests for the 'getPoktNodeGQL' function.
  describe('getPoktNodeGQL', () => {
    // Test to ensure that the 'getPoktNodeGQL' function is defined.
    test('Should be defined', () => {
      expect(retriever['getPoktNodeGQL']).toBeDefined();
    });

    // Test to check if 'getPoktNodeGQL' returns the expected GraphQL query.
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

  // Tests for the 'nextPage' function.
  describe('nextPage', () => {
    // Define variables for testing.
    let poktScanNodePagination: PoktScanNodePagination;
    let returnValue: string | null;

    beforeEach(() => {
      // Set up variables for testing.
      poktScanNodePagination = {
        has_next: true,
        next: 'returnValue',
      };
    });

    // Test to ensure that the 'nextPage' function is defined.
    test('Should be defined', () => {
      expect(retriever['nextPage']).toBeDefined();
    });

    // Test to check if 'nextPage' returns pageInfo.next when pageInfo.has_next === true.
    test('Should return pageInfo.next when pageInfo.has_next === true', () => {
      returnValue = retriever['nextPage'](poktScanNodePagination);
      expect(returnValue).toBe('returnValue');
    });

    // Test to check if 'nextPage' returns "null" when pageInfo.has_next === false.
    test('Should return "null" when pageInfo.has_next === false', () => {
      poktScanNodePagination = {
        has_next: false,
        next: 'returnValue',
      };
      returnValue = retriever['nextPage'](poktScanNodePagination);
      expect(returnValue).toBe(null);
    });
  });

  // Tests for the 'getListNodeData' function.
  describe('getListNodeData', () => {
    // Define variables for testing.
    let result: PoktScanResponse;
    let item: PoktScanNodeItem;
    let returnValue;

    beforeEach(async () => {
      // Set up variables for testing.
      item = {
        output_address: 'address1',
        service_domain: 'domain1',
        custodial: false,
        tokens: 1000000,
      };
      result = {
        data: {
          ListPoktNode: {
            items: [item],
            pageInfo: { has_next: false, next: null },
          },
        },
      };
    });

    // Test to ensure that the 'getListNodeData' function is defined.
    test('Should be defined', () => {
      expect(retriever['getListNodeData']).toBeDefined();
    });

    // Test to check if 'getListNodeData' retrieves node data successfully when nextPage is null.
    test('Should retrieve node data successfully when nextPage is null', async () => {
      jest.spyOn(retriever as any, 'request').mockResolvedValueOnce(result);
      expect(await retriever['getListNodeData']()).toEqual([
        {
          output_address: 'address1',
          service_domain: 'domain1',
          custodial: false,
          tokens: 1000000,
        },
      ]);
    });

    // Test to check if 'getListNodeData' retrieves node data successfully when nextPage is not null.
    test('Should retrieve node data successfully when nextPage is not null', async () => {
      // Set up additional variables for testing.
      item = {
        output_address: 'address2',
        service_domain: 'domain2',
        custodial: true,
        tokens: 5000000,
      };
      const updatedResult = {
        data: {
          ListPoktNode: {
            items: [item],
            pageInfo: { has_next: true, next: 'string' },
          },
        },
      };
      jest
        .spyOn(retriever as any, 'request')
        .mockResolvedValueOnce(updatedResult);
      jest.spyOn(retriever as any, 'request').mockResolvedValueOnce(result);

      // Call the 'getListNodeData' function and store the return value.
      returnValue = await retriever['getListNodeData']();

      // Assertions to check the properties of the returned items.
      expect(returnValue[1].tokens).toEqual(1000000);
      expect(returnValue[1].custodial).toEqual(false);
      expect(returnValue[0].tokens).toEqual(5000000);
      expect(returnValue[0].custodial).toEqual(true);
      expect(returnValue.length).toEqual(2);
    });
  });

  // Tests for the 'serializer' function.
  describe('serializer', () => {
    // Define variables for testing.
    let nodeItems: Array<PoktScanNodeItem>;
    let result: PoktScanOutput;

    beforeEach(() => {
      // Set up variables for testing.
      nodeItems = [
        {
          output_address: 'address1',
          service_domain: 'domain1',
          custodial: false,
          tokens: 1000000,
        },
        {
          output_address: 'address2',
          service_domain: 'domain2',
          custodial: true,
          tokens: 5000000,
        },
      ];
    });

    // Test to ensure that the 'serializer' function is defined.
    test('Should be defined', () => {
      expect(retriever['serializer']).toBeDefined();
    });

    // Test to check if 'serializer' stores related items correctly.
    test('Should store related items', () => {
      result = retriever['serializer'](nodeItems);
      expect(result.custodian.length).toEqual(1);
      expect(result.custodian[0].staked_amount).toEqual(5);
      expect(result.non_custodian.length).toEqual(1);
      expect(result.non_custodian[0].staked_amount).toEqual(1);
    });

    // Test to check if 'serializer' stores items correctly.
    test('Should store items correctly', () => {
      // Set up additional variables for testing.
      nodeItems = [
        {
          output_address: 'address1',
          service_domain: 'domain1',
          custodial: true,
          tokens: 1000000,
        },
        {
          output_address: 'address2',
          service_domain: 'domain2',
          custodial: true,
          tokens: 5000000,
        },
      ];

      // Call the 'serializer' function and store the return value.
      result = retriever['serializer'](nodeItems);

      // Assertions to check the properties of the result.
      expect(result.custodian.length).toEqual(2);
      expect(result.custodian[0].staked_amount).toEqual(1);
      expect(result.custodian[1].staked_amount).toEqual(5);
      expect(result.non_custodian.length).toEqual(0);
    });
  });

  // Tests for the 'retrieve' function.
  describe('retrieve', () => {
    // Test to ensure that the 'retrieve' function is defined.
    test('Should be defined', () => {
      expect(retriever.retrieve).toBeDefined();
    });

    // Test to check if 'retrieve' retrieves and serializes node data successfully.
    test('should retrieve and serialize node data successfully', async () => {
      // Mocking getListNodeData to return sample node data.
      jest.spyOn(retriever as any, 'getListNodeData').mockResolvedValueOnce([
        {
          output_address: 'address1',
          service_domain: 'domain1',
          custodial: true,
          tokens: 1000000,
        },
        {
          output_address: 'address2',
          service_domain: 'domain2',
          custodial: false,
          tokens: 500000,
        },
      ]);

      // Call the 'retrieve' method and store the return value.
      const result: PoktScanOutput = await retriever.retrieve();

      // Assertions to check the properties of the result based on the mocked node data.
      expect(result).toEqual({
        custodian: [{ domain: 'domain1', staked_amount: 1 }],
        non_custodian: [{ wallet_address: 'address2', staked_amount: 0.5 }],
      });
    });
  });
});
