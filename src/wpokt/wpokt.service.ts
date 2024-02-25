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
import {
  WPoktLiquidityV3Variables,
  WPoktLiquidityV3Response,
} from './interfaces/v3.interface';

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

  private async requestV3<T>(query: string, variables?: Record<string, any>) {
    return this.request<T>(
      this.config.get<string>('UNISWAP_V3_ENDPOINT_URL'),
      query,
      variables,
    );
  }

  private getUsersWPoktLiquidityV2GQL() {
    return `
    query UsersLiquidity($Users_Wallet_Addr: [String!]!, $WPokt_ID: String!) {
        positions: liquidityPositions(
          where: {pair_: {or: [{token0: $WPokt_ID}, {token1: $WPokt_ID}]}, user_in: $Users_Wallet_Addr}
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

  private getUsersWPoktLiquidityV3GQL() {
    return `
    query UsersLiquidity($Users_Wallet_Addr: [Bytes!]!, $WPokt_ID: String!) {
        positions(
          where: {pool_: {or: [{token0: $WPokt_ID}, {token1: $WPokt_ID}]}, owner_in: $Users_Wallet_Addr}
        ) {
          owner
          token0 {
            id
          }
          depositedToken0
          token1 {
            id
          }
          depositedToken1
        }
    }`;
  }

  private async getUsersWPoktLiquidityV2(usersWalletAddr: Array<string>) {
    const query = this.getUsersWPoktLiquidityV2GQL();
    const variables: WPoktLiquidityV2Variables = {
      Users_Wallet_Addr: usersWalletAddr,
      WPokt_ID: this.config.get<string>('UNISWAP_WPOKT_TOKEN_ID'),
    };

    return this.requestV2<WPoktLiquidityV2Response>(query, variables);
  }

  private async getUsersWPoktLiquidityV3(usersWalletAddr: Array<string>) {
    const query = this.getUsersWPoktLiquidityV3GQL();
    const variables: WPoktLiquidityV3Variables = {
      Users_Wallet_Addr: usersWalletAddr,
      WPokt_ID: this.config.get<string>('UNISWAP_WPOKT_TOKEN_ID'),
    };

    return this.requestV3<WPoktLiquidityV3Response>(query, variables);
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

  private serializeUsersWPoktLiquidityV3(
    response: WPoktLiquidityV3Response,
  ): Record<string, number> {
    const serializedResponse = {};
    const positions = response.data.positions;
    const WPOKT_TOKEN_ID = this.config.get<string>('UNISWAP_WPOKT_TOKEN_ID');

    for (let index = 0; index < positions.length; index++) {
      const position = positions[index];
      const point =
        position.token0.id === WPOKT_TOKEN_ID
          ? Number(position.depositedToken0)
          : Number(position.depositedToken1);

      if (position.owner in serializedResponse) {
        serializedResponse[position.owner] += point;
      } else {
        serializedResponse[position.owner] = point;
      }
    }

    return serializedResponse;
  }

  private combineUsersWPoktLiquidityResponses(
    v2Response: WPoktLiquidityV2Response,
    v3Response: WPoktLiquidityV3Response,
  ): Record<string, number> {
    const v2Results = this.serializeUsersWPoktLiquidityV2(v2Response);
    const v3Results = this.serializeUsersWPoktLiquidityV3(v3Response);

    return lodash.mergeWith(v3Results, v2Results, lodash.sum);
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

      const [partitionV2Response, partitionV3Response] = await Promise.all([
        this.getUsersWPoktLiquidityV2(partitionWalletAddresses),
        this.getUsersWPoktLiquidityV3(partitionWalletAddresses),
      ]);

      const partitionResult = this.combineUsersWPoktLiquidityResponses(
        partitionV2Response,
        partitionV3Response,
      );

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
