import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import lodash from 'lodash';
import { of } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import { WPoktLiquidityV2Response } from '../interfaces/v2.interface';
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

  describe('getUsersWPoktLiquidityV2GQL', () => {
    test('Should be defined', () => {
      expect(wpokt['getUsersWPoktLiquidityV2GQL']).toBeDefined();
    });
    test('Should return getUsersWPoktLiquidityV2 graphQL query', () => {
      expect(wpokt['getUsersWPoktLiquidityV2GQL']()).toBe(
        `
    query UsersLiquidity($Users_Wallet_Addr: [String!]!, $WPokt_ID: String!, $Pool_ID: String!) {
        positions: liquidityPositions(
          where: {
            pair: $Pool_ID,
            pair_: {or: [{token0: $WPokt_ID}, {token1: $WPokt_ID}]}, 
            user_in: $Users_Wallet_Addr
          }
        ) {
          user {
            id
          }
          liquidityTokenBalance
          pair {
            totalSupply
            token0 {
              id
            }
            reserve0
            token1 {
              id
            }
            reserve1
          }
        }
      }`,
      );
    });
  });

  describe('getUsersWPoktLiquidityV2', () => {
    let usersWalletAddr: Array<string>;
    beforeEach(() => {
      usersWalletAddr = [''];
      jest.spyOn(lodash, 'map').mockReturnValue([true]);
      jest.spyOn(wpokt as any, 'requestV2').mockReturnValue({});
      jest
        .spyOn(wpokt as any, 'getUsersWPoktLiquidityV2GQL')
        .mockReturnValue('');
      jest.spyOn(config, 'get').mockReturnValue('');
    });
    test('Should be defined', () => {
      expect(wpokt['getUsersWPoktLiquidityV2']).toBeDefined();
    });
    test('Should call getUsersWPoktLiquidityV2GQL method', async () => {
      await wpokt['getUsersWPoktLiquidityV2'](usersWalletAddr);
      expect(wpokt['getUsersWPoktLiquidityV2GQL']).toHaveBeenCalled();
    });
    test('Should call map method from lodash with correct parameters', async () => {
      await wpokt['getUsersWPoktLiquidityV2'](usersWalletAddr);
      expect(lodash.map).toHaveBeenCalledWith(usersWalletAddr, lodash.toLower);
    });
    test('Should call get method from config with correct parameter', async () => {
      await wpokt['getUsersWPoktLiquidityV2'](usersWalletAddr);
      expect(config.get).toHaveBeenCalledWith('UNISWAP_WPOKT_TOKEN_ID');
      expect(config.get).toHaveBeenCalledWith('UNISWAP_V2_WPOKT_POOL_ID');
    });
    test('Should return value from requestV2 method', async () => {
      expect(await wpokt['getUsersWPoktLiquidityV2'](usersWalletAddr)).toEqual(
        {},
      );
    });
  });

  describe('serializeUsersWPoktLiquidityV2', () => {
    let response: WPoktLiquidityV2Response;
    beforeEach(() => {
      response = {
        data: {
          positions: [
            {
              user: {
                id: '0x97d07b09537088985d5ec3b5ba654e505244b99f',
              },
              liquidityTokenBalance: '0.032956972206074763',
              pair: {
                totalSupply: '0.048851216609091387',
                token0: {
                  id: '0x67f4c72a50f8df6487720261e188f2abe83f57d7',
                },
                reserve0: '7032719.501123',
                token1: {
                  id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                reserve1: '401.748022236913933935',
              },
            },
          ],
        },
      };
      jest.spyOn(config, 'get').mockReturnValue('');
    });
    test('Should be defined', () => {
      expect(wpokt['serializeUsersWPoktLiquidityV2']).toBeDefined();
    });
    test('Should call get method from config with correct parameter', () => {
      wpokt['serializeUsersWPoktLiquidityV2'](response);
      expect(config.get).toHaveBeenCalledWith('UNISWAP_WPOKT_TOKEN_ID');
    });
    test('Should calculate the point and set the point for each user id', () => {
      expect(wpokt['serializeUsersWPoktLiquidityV2'](response)).toEqual({
        '0x97d07b09537088985d5ec3b5ba654e505244b99f': 271.0351823713515,
      });
    });
    test('Should return {} when response is null', async () => {
      response = {
        data: {
          positions: [],
        },
      };
      expect(wpokt['serializeUsersWPoktLiquidityV2'](response)).toEqual({});
    });
    test('Should apply the sum of points for a user id who has more that 1 wallet', async () => {
      response = {
        data: {
          positions: [
            {
              user: {
                id: '0x97d07b09537088985d5ec3b5ba654e505244b99f',
              },
              liquidityTokenBalance: '0.032956972206074763',
              pair: {
                totalSupply: '0.048851216609091387',
                token0: {
                  id: '0x67f4c72a50f8df6487720261e188f2abe83f57d7',
                },
                reserve0: '7032719.501123',
                token1: {
                  id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                reserve1: '401.748022236913933935',
              },
            },
            {
              user: {
                id: '0x97d07b09537088985d5ec3b5ba654e505244b99f',
              },
              liquidityTokenBalance: '0.032956972206074763',
              pair: {
                totalSupply: '0.048851216609091387',
                token0: {
                  id: '0x67f4c72a50f8df6487720261e188f2abe83f57d7',
                },
                reserve0: '7032719.501123',
                token1: {
                  id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                reserve1: '401.748022236913933935',
              },
            },
          ],
        },
      };
      expect(wpokt['serializeUsersWPoktLiquidityV2'](response)).toEqual({
        '0x97d07b09537088985d5ec3b5ba654e505244b99f': 542.070364742703,
      });
    });
  });
});
