import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { reduce } from 'lodash';
import { firstValueFrom } from 'rxjs';
import { Pagination } from './interfaces/common.interface';
import {
  IssuedPDA,
  IssuedPDACountResponse,
  IssuedPDACountVariables,
  IssuedPDAsResponse,
  IssuedPDAsVariables,
} from './interfaces/pda.interface';

@Injectable()
export class PDAService {
  constructor(
    private readonly config: ConfigService,
    private readonly axios: HttpService,
  ) {}

  private async request<T>(
    query: string,
    variables?: Record<string, any>,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.axios.post<T>(
        this.config.get<string>('MYGATEWAY_ENDPOINT_URL'),
        {
          query,
          variables,
        },
        {
          headers: {
            Authorization:
              'Bearer ' +
              this.config.get<string>('MYGATEWAY_AUTHENTICATION_TOKEN'),
            'x-api-key': this.config.get<string>('MYGATEWAY_API_KEY'),
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return response.data;
  }

  private getIssuedPDAsGQL() {
    return `
    query getPDAs($org_gateway_id: String!, $take: Float!, $skip: Float!) {
      issuedPDAs(
          filter: { organization: { type: GATEWAY_ID, value: $org_gateway_id } }
          take: $take
          skip: $skip
          order: { issuanceDate: "DESC" }
      ) {
          status
          dataAsset {
              claim
              owner {
                  gatewayId
              }
          }
      }
    }`;
  }

  private getIssuedPDACountGQL() {
    return `
    query IssuedPDAsCount($org_gateway_id: String!) {
        issuedPDAsCount(
            filter: { organization: { type: GATEWAY_ID, value: $org_gateway_id } }
        )
    }`;
  }

  private pagination(max: number): Array<Pagination> {
    const pages: Array<Pagination> = [];

    if (max <= 15) {
      pages.push({ take: max, skip: 0 });
    } else {
      const pages_count = Math.ceil(max / 15);
      let take = 15;
      let skip = 0;

      for (let page = 1; page <= pages_count; page++) {
        const items_diff = max - page * take;

        pages.push({ take, skip });

        skip += take;
        take = items_diff < 15 ? items_diff : 15;
      }
    }

    return pages;
  }

  async getIssuedPDAs() {
    const ORG_GATEWAY_ID = this.config.get<string>('POKT_ORG_GATEWAY_ID');

    const pdaCountQuery = this.getIssuedPDACountGQL();
    const pdaQuery = this.getIssuedPDAsGQL();
    const pdaCountVariables: IssuedPDACountVariables = {
      org_gateway_id: ORG_GATEWAY_ID,
    };

    const countResponse = await this.request<IssuedPDACountResponse>(
      pdaCountQuery,
      pdaCountVariables,
    );

    const partitions = this.pagination(countResponse.data.issuedPDAsCount);
    const promises: Array<Promise<IssuedPDAsResponse>> = [];

    for (let index = 0; index < partitions.length; index++) {
      const pdaVariables: IssuedPDAsVariables = {
        org_gateway_id: ORG_GATEWAY_ID,
        ...partitions[index],
      };

      promises.push(this.request<IssuedPDAsResponse>(pdaQuery, pdaVariables));
    }

    return reduce<IssuedPDAsResponse, Array<IssuedPDA>>(
      await Promise.all(promises),
      (final, current) => {
        final.push(...current.data.issuedPDAs);

        return final;
      },
      [],
    );
  }
}
