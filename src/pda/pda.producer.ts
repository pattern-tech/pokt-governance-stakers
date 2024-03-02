import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CoreAddAction, CoreUpdateAction } from '../core.interface';
import {
  IssueNewStakerPDAVariables,
  UpdateStakerPDAVariables,
} from './interfaces/pda.interface';

@Injectable()
export class PDAProducer {
  constructor(
    private readonly config: ConfigService,
    protected readonly logger: WinstonProvider,
    @InjectQueue('ValidatorStakerPDA') private pdaQueue: Queue,
  ) {}

  async issueNewStakerPDA(addActions: Array<CoreAddAction>) {
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
          point: Math.round(addAction.point),
          ...(addAction.node_type === 'custodian'
            ? { serviceDomain: addAction.serviceDomain }
            : null),
          wallets: [], // wallets: addAction.wallets,
        },
      };
      const job = await this.pdaQueue.add('pda', variables);
      this.logger.log(`job ${job.id} added to the queue`);
    }
  }

  async updateIssuedStakerPDAs(updateActions: Array<CoreUpdateAction>) {
    for (let idx = 0; idx < updateActions.length; idx++) {
      const updateAction = updateActions[idx];

      const variables: UpdateStakerPDAVariables = {
        PDA_id: updateAction.pda_id,
        claim: {
          point: Math.round(updateAction.point),
          ...(updateAction.wallets
            ? { wallets: [] /* updateAction.wallets */ }
            : null),
        },
      };

      const job = await this.pdaQueue.add('pda', variables);
      this.logger.log(`job ${job.id} added to the queue`);
    }
  }

  async obliterate(): Promise<void> {
    await this.pdaQueue.obliterate();
  }

  //   chunkVars(array){
  //     const chunkSize = 10;
  //     for (let i = 0; i < array.length; i += chunkSize) {
  //       const chunk = array.slice(i, i + chunkSize);
  //     }
  //   }
}
