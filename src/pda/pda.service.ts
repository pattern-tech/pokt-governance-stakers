import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  IssuedPDACountResponse,
  IssuedPDACountVariables,
  IssuedPDAsResponse,
  IssuedPDAsVariables,
  IssuedStakerPDA,
} from './interfaces/pda.interface';
import { AxsiosRequest } from './axios.pda';

@Injectable()
export class PDAService extends AxsiosRequest {
  constructor(
    protected readonly axios: HttpService,
    protected readonly logger: WinstonProvider,
    protected readonly config: ConfigService,
  ) {
    super(axios, logger, config);
  }

  static readonly getIssuedPDAsGQL: string = `
    query getPDAs($org_gateway_id: String!, $take: Float!, $skip: Float!) {
      issuedPDAs(
          filter: { organization: { type: GATEWAY_ID, value: $org_gateway_id } }
          take: $take
          skip: $skip
          order: { issuanceDate: "DESC" }
      ) {
          id
          status
          dataAsset {
              claim
              owner {
                  gatewayId
              }
          }
      }
    }`;
  static readonly getIssuedPDACountGQL: string = `
    query IssuedPDAsCount($org_gateway_id: String!) {
        issuedPDAsCount(
            filter: { organization: { type: GATEWAY_ID, value: $org_gateway_id } }
        )
    }`;

  async getIssuedStakerPDAs() {
    const ORG_GATEWAY_ID = this.config.get<string>('POKT_ORG_GATEWAY_ID');

    const pdaCountQuery = PDAService.getIssuedPDACountGQL;
    const pdaQuery = PDAService.getIssuedPDAsGQL;
    const pdaCountVariables: IssuedPDACountVariables = {
      org_gateway_id: ORG_GATEWAY_ID,
    };

    const countResponse = await this.request<IssuedPDACountResponse>(
      pdaCountQuery,
      pdaCountVariables,
    );

    if (countResponse.data === null) {
      throw new Error('Does not have any valid organization');
    }

    const partitions = this.pagination(countResponse.data.issuedPDAsCount);
    const promises: Array<Promise<IssuedPDAsResponse>> = [];

    for (let index = 0; index < partitions.length; index++) {
      const pdaVariables: IssuedPDAsVariables = {
        org_gateway_id: ORG_GATEWAY_ID,
        ...partitions[index],
      };

      promises.push(this.request<IssuedPDAsResponse>(pdaQuery, pdaVariables));
    }

    const responses: Array<IssuedPDAsResponse> = await Promise.all(promises);
    const results: Array<IssuedStakerPDA> = [];

    for (let res_idx = 0; res_idx < responses.length; res_idx++) {
      const PDAs = responses[res_idx].data.issuedPDAs;

      for (let pda_idx = 0; pda_idx < PDAs.length; pda_idx++) {
        const PDA = PDAs[pda_idx];

        if (
          PDA.status === 'Valid' &&
          PDA.dataAsset.claim.pdaType === 'staker'
        ) {
          results.push(PDA as IssuedStakerPDA);
        }
      }
    }

    return results;
  }
}
