import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import lodash from 'lodash';
import { firstValueFrom } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  WPoktLiquidityV2Response,
  WPoktLiquidityV2Variables,
} from './interfaces/v2.interface';

@Injectable()
export class WPoktService {
  constructor(
    private readonly config: ConfigService,
    private readonly axios: HttpService,
    private readonly logger: WinstonProvider,
  ) {}

  private async request<T>(
    endpoint: string,
    query: string,
    variables?: Record<string, any>,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.axios.post<T>(
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
      ),
    );

    this.logger.debug(
      'request method\n' +
        `input => ${JSON.stringify({ endpoint, query, variables })}\n` +
        `response => ${JSON.stringify({
          status: response.status,
          body: response.data,
        })}\n`,
      WPoktService.name,
    );

    return response.data;
  }

  private async requestV2<T>(query: string, variables?: Record<string, any>) {
    return this.request<T>(
      this.config.get<string>('UNISWAP_V2_ENDPOINT_URL'),
      query,
      variables,
    );
  }

  private getUsersWPoktLiquidityV2GQL() {
    return `
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
      }`;
  }

  private async getUsersWPoktLiquidityV2(usersWalletAddr: Array<string>) {
    const query = this.getUsersWPoktLiquidityV2GQL();
    const variables: WPoktLiquidityV2Variables = {
      Users_Wallet_Addr: lodash.map(usersWalletAddr, lodash.toLower),
      WPokt_ID: this.config.get<string>('UNISWAP_WPOKT_TOKEN_ID'),
      Pool_ID: this.config.get<string>('UNISWAP_V2_WPOKT_POOL_ID'),
    };

    return this.requestV2<WPoktLiquidityV2Response>(query, variables);
  }

  private serializeUsersWPoktLiquidityV2(
    response: WPoktLiquidityV2Response,
  ): Record<string, number> {
    const serializedResponse = {};
    const positions = response.data.positions;
    const WPOKT_TOKEN_ID = this.config.get<string>('UNISWAP_WPOKT_TOKEN_ID');

    for (let index = 0; index < positions.length; index++) {
      const position = positions[index];

      const reservedValue =
        position.pair.token0.id === WPOKT_TOKEN_ID
          ? Number(position.pair.reserve0)
          : Number(position.pair.reserve1);
      const point =
        (Number(position.liquidityTokenBalance) /
          Number(position.pair.totalSupply)) *
        reservedValue;

      if (position.user.id in serializedResponse) {
        serializedResponse[position.user.id] += point;
      } else {
        serializedResponse[position.user.id] = point;
      }
    }

    return serializedResponse;
  }

  async getUsersWPoktLiquidity(
    GIDsWalletAddresses: Record<string, Array<string>>,
  ) {
    const result: Record<string, number> = {};
    const gatewayIds = Object.keys(GIDsWalletAddresses);

    for (let gid_idx = 0; gid_idx < gatewayIds.length; gid_idx += 10) {
      const partitionGatewayIDs = gatewayIds.slice(gid_idx, gid_idx + 10);
      const partitionWalletAddresses: Array<string> = [];

      for (let p_idx = 0; p_idx < partitionGatewayIDs.length; p_idx++) {
        const gatewayId = partitionGatewayIDs[p_idx];
        const wallets = GIDsWalletAddresses[gatewayId];

        partitionWalletAddresses.push(...wallets);
      }

      const partitionV2Response = await this.getUsersWPoktLiquidityV2(
        partitionWalletAddresses,
      );
      // const partitionV2Response: WPoktLiquidityV2Response = {
      //   data: {
      //     positions: [
      //       {
      //         user: {
      //           id: '0x97d07b09537088985d5ec3b5ba654e505244b99f',
      //         },
      //         liquidityTokenBalance: '0.032956972206074763',
      //         pair: {
      //           totalSupply: '0.048851216609091387',
      //           token0: {
      //             id: '0x67f4c72a50f8df6487720261e188f2abe83f57d7',
      //           },
      //           reserve0: '7032719.501123',
      //           token1: {
      //             id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      //           },
      //           reserve1: '401.748022236913933935',
      //         },
      //       },
      //     ],
      //   },
      // };
      const partitionResult =
        this.serializeUsersWPoktLiquidityV2(partitionV2Response);

      for (let p_idx = 0; p_idx < partitionGatewayIDs.length; p_idx++) {
        const gatewayId = partitionGatewayIDs[p_idx];
        const wallets = GIDsWalletAddresses[gatewayId];

        if (!(gatewayId in result)) {
          result[gatewayId] = 0;
        }

        for (let w_idx = 0; w_idx < wallets.length; w_idx++) {
          const wallet_addr = wallets[w_idx];

          if (wallet_addr in partitionResult) {
            result[gatewayId] += partitionResult[wallet_addr];
          }
        }
      }
    }

    return result;
  }
}
