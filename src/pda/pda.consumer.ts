import { HttpService } from '@nestjs/axios';
import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  OnQueuePaused,
  OnQueueRemoved,
  Process,
  Processor,
} from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { sleep } from '@common/utils/sleep.util';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  IssueNewStakerPDAResponse,
  UpdateStakerPDAResponse,
} from './interfaces/pda.interface';
import { AxsiosRequest } from './axios.pda';

@Processor('ValidatorStakerPDA')
export class PDAConsumer extends AxsiosRequest {
  constructor(
    protected readonly axios: HttpService,
    protected readonly logger: WinstonProvider,
    protected readonly config: ConfigService,
  ) {
    super(axios, logger, config);
  }

  static readonly getIssueStakerPdaGQL: string = `
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

  static readonly getUpdateStakerPdaGQL: string = `
    mutation updatePDA($PDA_id: String!, $claim: JSON!) {
      updatePDA(input: { id: $PDA_id, claim: $claim }) {
          id
      }
    }`;
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name}`,
      PDAConsumer.name,
    );
  }

  @OnQueueError()
  onError(error: Error) {
    this.logger.error(
      `error processing job ${error.message}...`,
      PDAConsumer.name,
      {
        stack: error.stack,
      },
    );
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: any) {
    this.logger.log(
      `Completed job ${job.id} of type ${job.name}`,
      PDAConsumer.name,
    );

    this.logger.log(
      `Result job ${job.id} ===================> ${JSON.stringify(result)}`,
      PDAConsumer.name,
    );

    await job.remove();
  }

  @OnQueueRemoved()
  onRemove(job: Job) {
    this.logger.log(
      `Removed job ${job.id} of type ${job.name}`,
      PDAConsumer.name,
    );
  }
  @OnQueuePaused()
  onPuase() {
    this.logger.log('queue have been paused', PDAConsumer.name);
  }

  @Process({ name: 'pda' })
  async createPDA(job: Job<Record<any, any>>) {
    const createQuery = PDAConsumer.getIssueStakerPdaGQL;
    const updateQuery = PDAConsumer.getUpdateStakerPdaGQL;
    await sleep(2000);
    if (job.data.PDA_id) {
      return this.request<UpdateStakerPDAResponse>(updateQuery, job.data);
    } else {
      return this.request<IssueNewStakerPDAResponse>(createQuery, job.data);
    }
  }

  // @Process({ name: 'update', concurrency: 2 })
  // async updatePDA(job: Job<Array<Record<any, any>>>) {
  //   const requests = job.data.map<any>(({ query, variables }) =>
  //     this.request<UpdateStakerPDAResponse>(query, variables),
  //   );

  //   return Promise.all(requests);
  // }
}
