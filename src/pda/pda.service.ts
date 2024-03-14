import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CoreAddAction, CoreUpdateAction } from '../core.interface';
import { Pagination } from './interfaces/common.interface';
import {
  IssueNewStakerPDAResponse,
  IssueNewStakerPDAVariables,
  IssuedCitizenAndStakerPDA,
  IssuedPDACountResponse,
  IssuedPDACountVariables,
  IssuedPDAsResponse,
  IssuedPDAsVariables,
  UpdateStakerPDAResponse,
  UpdateStakerPDAVariables,
  UserAuthenticationsResponse,
  UserAuthenticationsVariables,
} from './interfaces/pda.interface';
import { PDAQueue } from './pda.queue';

@Injectable()
export class PDAService {
  constructor(
    private readonly config: ConfigService,
    private readonly axios: HttpService,
    private readonly logger: WinstonProvider,
    private readonly pdaQueue: PDAQueue,
  ) {}

  private async request<T>(
    query: string,
    variables?: Record<string, any>,
  ): Promise<T> {
    this.logger.debug(
      'request method\n' + `input => ${JSON.stringify({ query, variables })}\n`,
      PDAService.name,
    );

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

    this.logger.debug(
      `response => ${JSON.stringify({
        status: response.status,
        body: response.data,
      })}\n`,
      PDAService.name,
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

  async getIssuedCitizenAndStakerPDAs() {
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
    const results: Array<IssuedCitizenAndStakerPDA> = [];

    for (let res_idx = 0; res_idx < responses.length; res_idx++) {
      const PDAs = responses[res_idx].data.issuedPDAs;

      for (let pda_idx = 0; pda_idx < PDAs.length; pda_idx++) {
        const PDA = PDAs[pda_idx];

        if (
          PDA.status === 'Valid' &&
          (PDA.dataAsset.claim.pdaType === 'staker' ||
            PDA.dataAsset.claim.pdaType === 'citizen')
        ) {
          results.push(PDA as IssuedCitizenAndStakerPDA);
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
      $image: String!
      $claim: JSON!
    ) {
      createPDA(
          input: {
              dataModelId: $data_model_id
              title: "Pocket Network Staker"
              description: "Servicer or Validator Path"
              owner: { type: $owner_type, value: $owner }
              image: $image
              organization: { type: GATEWAY_ID, value: $org_gateway_id }
              claim: $claim
          }
      ) {
          id
      }
    }`;
  }

  async issueNewStakerPDA(addAction: CoreAddAction) {
    const query = this.getIssueStakerPdaGQL();
    const DATA_MODEL_ID = this.config.get<string>('POKT_STAKER_DATA_MODEL_ID');
    const ORG_GATEWAY_ID = this.config.get<string>('POKT_ORG_GATEWAY_ID');

    const variables: IssueNewStakerPDAVariables = {
      image: addAction.image,
      data_model_id: DATA_MODEL_ID,
      org_gateway_id: ORG_GATEWAY_ID,
      owner: addAction.owner,
      owner_type:
        addAction.node_type === 'non-custodian' ? 'POKT' : 'GATEWAY_ID',
      claim: {
        pdaSubtype: addAction.pda_sub_type,
        pdaType: 'staker',
        ...(addAction.node_type ? { type: addAction.node_type } : null),
        point: addAction.point,
        ...(addAction.node_type === 'custodian'
          ? { serviceDomain: addAction.serviceDomain }
          : null),
        wallets: addAction.wallets,
      },
    };

    await this.request<IssueNewStakerPDAResponse>(query, variables);
  }

  private getUpdateStakerPdaGQL() {
    return `
    mutation updatePDA($PDA_id: String!, $claim: JSON!) {
      updatePDA(input: { id: $PDA_id, claim: $claim }) {
          id
      }
    }`;
  }

  async updateIssuedStakerPDA(updateAction: CoreUpdateAction) {
    const query = this.getUpdateStakerPdaGQL();

    const variables: UpdateStakerPDAVariables = {
      PDA_id: updateAction.pda_id,
      claim: {
        point: updateAction.point,
        ...(updateAction.wallets ? { wallets: updateAction.wallets } : null),
      },
    };

    await this.request<UpdateStakerPDAResponse>(query, variables);
  }

  private getUserAuthenticationsGQL() {
    return `
    query UserAuthentications($user_GID: String!) {
      userAuthentications(user: { type: GATEWAY_ID, value: $user_GID }) {
        address
        chain
      }
    }`;
  }

  private async getUserAuthentications(user_GID: string) {
    const query = this.getUserAuthenticationsGQL();
    const variables: UserAuthenticationsVariables = { user_GID };

    return this.request<UserAuthenticationsResponse>(query, variables);
  }

  async getUserEVMWallets(user_GID: string) {
    const result: Array<string> = [];

    const userAuthentications = await this.getUserAuthentications(user_GID);
    const userAuthMethods = userAuthentications.data.userAuthentications;

    for (let index = 0; index < userAuthMethods.length; index++) {
      const userAuthMethod = userAuthMethods[index];

      if (userAuthMethod.chain === 'EVM') {
        result.push(userAuthMethod.address);
      }
    }

    return result;
  }

  async jobListener(latency: number, chuckSize: number) {
    return setInterval(async () => {
      const jobs = this.pdaQueue.popJobs(chuckSize);
      const promises = [];

      for (let index = 0; index < jobs?.length; index++) {
        const job = jobs[index];

        if (job.action === 'add') {
          promises.push(this.issueNewStakerPDA(job.payload));
        } else {
          promises.push(this.updateIssuedStakerPDA(job.payload));
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }, latency);
  }

  async stopJobListener(listenerID: NodeJS.Timeout) {
    clearInterval(listenerID);
  }
}
