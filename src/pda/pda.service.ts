import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CoreAddAction, CoreUpdateAction } from '../core.interface';
import { Pagination } from './interfaces/common.interface';
import {
  IssueNewStakerPDAResponse,
  IssueNewStakerPDAVariables,
  IssuedPDACountResponse,
  IssuedPDACountVariables,
  IssuedPDAsResponse,
  IssuedPDAsVariables,
  IssuedStakerPDA,
  UpdateStakerPDAResponse,
  UpdateStakerPDAVariables,
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

    if (max <= 100) {
      pages.push({ take: max, skip: 0 });
    } else {
      const pages_count = Math.ceil(max / 100);
      let take = 100;
      let skip = 0;

      for (let page = 1; page <= pages_count; page++) {
        const items_diff = max - page * take;

        pages.push({ take, skip });

        skip += take;
        take = items_diff < 100 ? items_diff : 100;
      }
    }

    return pages;
  }

  async getIssuedStakerPDAs() {
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

  private getIssueStakerPdaGQL() {
    return `
    mutation CreatePDA(
      $org_gateway_id: String!
      $data_model_id: String!
      $owner: String!
      $owner_type: UserIdentifierType!
      $claim: JSON!
    ) {
      createPDA(
          input: {
              dataModelId: $data_model_id
              title: "Pocket Network Staker"
              description: "Servicer or Validator Path"
              owner: { type: $owner_type, value: $owner }
              organization: { type: GATEWAY_ID, value: $org_gateway_id }
              claim: $claim
          }
      ) {
          id
      }
    }`;
  }

  async issueNewStakerPDA(addActions: Array<CoreAddAction>) {
    const query = this.getIssueStakerPdaGQL();
    const DATA_MODEL_ID = this.config.get<string>('POKT_STAKER_DATA_MODEL_ID');
    const ORG_GATEWAY_ID = this.config.get<string>('POKT_ORG_GATEWAY_ID');

    for (let idx = 0; idx < addActions.length; idx++) {
      const addAction = addActions[idx];

      const variables: IssueNewStakerPDAVariables = {
        data_model_id: DATA_MODEL_ID,
        org_gateway_id: ORG_GATEWAY_ID,
        owner: addAction.owner,
        owner_type:
          addAction.node_type === 'non-custodian' ? 'POKT' : 'GATEWAY_ID',
        claim: {
          pdaSubtype: addAction.pda_sub_type,
          pdaType: 'staker',
          type: addAction.node_type,
          point: addAction.point,
          ...(addAction.node_type === 'custodian'
            ? { serviceDomain: addAction.serviceDomain }
            : null),
          wallets: addAction.wallets,
        },
      };

      this.request<IssueNewStakerPDAResponse>(query, variables);
    }
  }

  private getUpdateStakerPdaGQL() {
    return `
    mutation updatePDA($pda_id: String!, $claim: JSON!) {
      updatePDA(input: { id: $pda_id, claim: $claim }) {
          id
      }
    }`;
  }

  async updateIssuedStakerPDAs(updateActions: Array<CoreUpdateAction>) {
    const query = this.getUpdateStakerPdaGQL();

    for (let idx = 0; idx < updateActions.length; idx++) {
      const updateAction = updateActions[idx];

      const variables: UpdateStakerPDAVariables = {
        pda_id: updateAction.pda_id,
        claim: {
          point: updateAction.point,
          ...(updateAction.wallets ? { wallets: updateAction.wallets } : null),
        },
      };

      await this.request<UpdateStakerPDAResponse>(query, variables);
    }
  }
}
