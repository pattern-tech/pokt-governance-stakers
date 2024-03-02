import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import lodash from 'lodash';
import { time } from 'node:console';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CorePDAsUpcomingActions } from './core.interface';
import { IssuedStakerPDA } from './pda/interfaces/pda.interface';
import { PoktScanOutput } from './poktscan/interfaces/pokt-scan.interface';
import { PDAService } from './pda/pda.service';
import { PoktScanRetriever } from './poktscan/pokt.retriever';
import { PDAProducer } from './pda/pda.producer';

@Injectable()
export class CoreService {
  constructor(
    private readonly poktScanRetriever: PoktScanRetriever,
    private readonly dnsResolver: DNSResolver,
    private readonly pdaService: PDAService,
    private readonly pdaProducer: PDAProducer,
    private readonly logger: WinstonProvider,
  ) {}

  private async setCustodianActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
    actions: CorePDAsUpcomingActions,
  ) {
    this.logger.log('Started set custodian actions', CoreService.name);

    for (const domain in stakedNodesData.custodian) {
      if (
        Object.prototype.hasOwnProperty.call(stakedNodesData.custodian, domain)
      ) {
        const resolvedGatewayID =
          await this.dnsResolver.getGatewayIDFromDomain(domain);

        if (resolvedGatewayID) {
          const PDA_record = lodash.find(validStakersPDAs, (PDA_record) => {
            return (
              PDA_record.dataAsset.claim.serviceDomain === domain &&
              PDA_record.dataAsset.owner.gatewayId === resolvedGatewayID &&
              PDA_record.dataAsset.claim.pdaSubtype === 'Validator' &&
              PDA_record.dataAsset.claim.type === 'custodian'
            );
          });

          console.log(PDA_record);

          const sumOfStakedTokens = lodash.sumBy(
            stakedNodesData.custodian[domain],
            (record) => record.staked_amount,
          );
          const wallets = lodash.map(
            stakedNodesData.custodian[domain],
            (record) => {
              return {
                address: record.wallet_address,
                amount: record.staked_amount,
              };
            },
          );

          if (PDA_record) {
            // update PDA point
            actions.update.push({
              pda_id: PDA_record.id,
              point: sumOfStakedTokens,
              wallets: wallets,
            });
          } else {
            // Issue new PDA
            actions.add.push({
              point: sumOfStakedTokens,
              node_type: 'custodian',
              pda_sub_type: 'Validator',
              owner: resolvedGatewayID,
              serviceDomain: domain,
              wallets: wallets,
            });
          }
        }
      }
    }

    this.logger.log('Started check PDAs custodian', CoreService.name);

    for (let index = 0; index < validStakersPDAs.length; index++) {
      const PDA_record = validStakersPDAs[index];

      if (PDA_record.dataAsset.claim.type === 'custodian') {
        const nodRecordsDomain = Object.keys(stakedNodesData.custodian);
        let isPDAValid = false;

        for (let node_idx = 0; node_idx < nodRecordsDomain.length; node_idx++) {
          const nodeRecordDomain = nodRecordsDomain[node_idx];
          const resolvedGatewayID =
            await this.dnsResolver.getGatewayIDFromDomain(nodeRecordDomain);

          if (
            PDA_record.dataAsset.claim.serviceDomain === nodeRecordDomain &&
            PDA_record.dataAsset.owner.gatewayId === resolvedGatewayID &&
            PDA_record.dataAsset.claim.pdaSubtype === 'Validator'
          ) {
            isPDAValid = true;
            break;
          }
        }

        if (!isPDAValid) {
          // update zero point
          actions.update.push({
            pda_id: PDA_record.id,
            point: 0,
            wallets: [],
          });
        }
      }
    }

    this.logger.log('Completed set custodian actions', CoreService.name);
  }

  private async setNonCustodianActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
    actions: CorePDAsUpcomingActions,
  ) {
    this.logger.log('Started set nonCustodian actions', CoreService.name);

    for (const walletAddress in stakedNodesData.non_custodian) {
      if (
        Object.prototype.hasOwnProperty.call(
          stakedNodesData.non_custodian,
          walletAddress,
        )
      ) {
        const PDA_record = lodash.find(validStakersPDAs, (PDA_record) => {
          return (
            PDA_record.dataAsset.claim.wallets[0]?.address === walletAddress &&
            PDA_record.dataAsset.claim.pdaSubtype === 'Validator' &&
            PDA_record.dataAsset.claim.type === 'non-custodian'
          );
        });

        const sumOfStakedTokens = lodash.sumBy(
          stakedNodesData.non_custodian[walletAddress],
          (record) => record.staked_amount,
        );
        const wallets = lodash.map(
          stakedNodesData.non_custodian[walletAddress],
          (record) => {
            return {
              address: record.wallet_address,
              amount: record.staked_amount,
            };
          },
        );

        if (PDA_record) {
          // update PDA point
          actions.update.push({
            pda_id: PDA_record.id,
            point: sumOfStakedTokens,
            wallets: wallets,
          });
        } else {
          // Issue new PDA
          actions.add.push({
            point: sumOfStakedTokens,
            node_type: 'non-custodian',
            pda_sub_type: 'Validator',
            owner: walletAddress,
            wallets: wallets,
          });
        }
      }
    }

    this.logger.log('Started check PDAs nonCustodian', CoreService.name);

    for (let index = 0; index < validStakersPDAs.length; index++) {
      const PDA_record = validStakersPDAs[index];

      if (PDA_record.dataAsset.claim.type === 'non-custodian') {
        const nodeRecordsWallets = Object.keys(stakedNodesData.non_custodian);
        let isPDAValid = false;

        for (
          let node_idx = 0;
          node_idx < nodeRecordsWallets.length;
          node_idx++
        ) {
          const nodeRecordsWallet = nodeRecordsWallets[node_idx];

          if (
            PDA_record.dataAsset.claim.wallets[0]?.address ===
              nodeRecordsWallet &&
            PDA_record.dataAsset.claim.pdaSubtype === 'Validator'
          ) {
            isPDAValid = true;
            break;
          }
        }

        if (!isPDAValid) {
          // update zero point
          actions.update.push({
            pda_id: PDA_record.id,
            point: 0,
          });
        }
      }
    }

    this.logger.log('Completed set nonCustodian actions', CoreService.name);
  }

  private async getPDAsUpcomingActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
  ): Promise<CorePDAsUpcomingActions> {
    const actions: CorePDAsUpcomingActions = {
      add: [],
      update: [],
    };

    // Custodian Section
    await this.setCustodianActions(stakedNodesData, validStakersPDAs, actions);

    // Non-Custodian Section
    await this.setNonCustodianActions(
      stakedNodesData,
      validStakersPDAs,
      actions,
    );

    return actions;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handler() {
    try {
      await this.pdaProducer.obliterate();

      this.logger.log('Started task', CoreService.name);

      const stakedNodesData = await this.poktScanRetriever.retrieve();
      this.logger.log('all cus and non-cus node`s fetched', CoreService.name, {
        data: stakedNodesData,
      });
      const validStakersPDAs = await this.pdaService.getIssuedStakerPDAs();
      this.logger.log('all PDA`s for pokt orge fetched', CoreService.name, {
        data: validStakersPDAs,
      });

      const actions = await this.getPDAsUpcomingActions(
        stakedNodesData,
        validStakersPDAs,
      );

      this.logger.debug(actions, CoreService.name);

      this.logger.log('issueing new PDA', CoreService.name);
      // issue new PDAs
      await this.pdaProducer.issueNewStakerPDA(actions.add);
      console.log('all PDA`s issued successfully');

      // update issued PDAs' point
      await this.pdaProducer.updateIssuedStakerPDAs(actions.update);

      this.logger.log('Completed task', CoreService.name);
    } catch (err) {
      this.logger.error(err.message, CoreService.name, { stack: err.stack });
    }
  }
}
