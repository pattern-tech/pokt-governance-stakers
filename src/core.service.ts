import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import lodash from 'lodash';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CorePDAsUpcomingActions } from './core.interface';
import { IssuedStakerPDA } from './pda/interfaces/pda.interface';
import { PoktScanOutput } from './poktscan/interfaces/pokt-scan.interface';
import { PDAService } from './pda/pda.service';
import { PoktScanRetriever } from './poktscan/pokt.retriever';
import { WPoktService } from './wpokt/wpokt.service';

@Injectable()
export class CoreService {
  constructor(
    private readonly poktScanRetriever: PoktScanRetriever,
    private readonly dnsResolver: DNSResolver,
    private readonly pdaService: PDAService,
    private readonly wpoktService: WPoktService,
    private readonly logger: WinstonProvider,
    private readonly config: ConfigService,
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

          const sumOfStakedTokens = lodash.sumBy(
            stakedNodesData.custodian[domain],
            (record) => record.staked_amount,
          );
          const image = this.config.get<string>('SUPPLY_STAKER_POKTLOGO_URL');
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
              image: image,
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

        const image = this.config.get<string>('SUPPLY_STAKER_POKTLOGO_URL');
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
            image: image,
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

  private async getValidatorPDAsUpcomingActions(
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

  private async recalculateValidatorPDAs(
    validStakersPDAs: Array<IssuedStakerPDA>,
  ) {
    const stakedNodesData = await this.poktScanRetriever.retrieve();
    const actions = await this.getValidatorPDAsUpcomingActions(
      stakedNodesData,
      validStakersPDAs,
    );

    this.logger.debug(
      `Validator upcoming actions: ${JSON.stringify(actions)}`,
      CoreService.name,
    );

    // issue new PDAs
    await this.pdaService.issueNewStakerPDA(actions.add);
    // update issued PDAs' point
    await this.pdaService.updateIssuedStakerPDAs(actions.update);
  }

  private async getLiquidityProviderPDAsUpcomingActions(
    validStakersPDAs: Array<IssuedStakerPDA>,
    GIDsLiquidity: Record<string, number>,
  ) {
    const actions: CorePDAsUpcomingActions = {
      add: [],
      update: [],
    };
    const updatedPDAsID: Array<string> = [];

    for (let index = 0; index < validStakersPDAs.length; index++) {
      const PDARecord = validStakersPDAs[index];
      const PDARecordGatewayID = PDARecord.dataAsset.owner.gatewayId;
      const gatewayIDLiquidity = GIDsLiquidity[PDARecordGatewayID];

      if (PDARecord.dataAsset.claim.pdaSubtype === 'Liquidity Provider') {
        if (PDARecord.dataAsset.claim.point !== gatewayIDLiquidity) {
          actions.update.push({
            pda_id: PDARecord.id,
            point: gatewayIDLiquidity,
          });
        }

        updatedPDAsID.push(PDARecord.id);
      } else {
        if (gatewayIDLiquidity > 0 && !updatedPDAsID.includes(PDARecord.id)) {
          actions.add.push({
            owner: PDARecordGatewayID,
            pda_sub_type: 'Liquidity Provider',
            point: gatewayIDLiquidity,
          });
        }
      }
    }

    return actions;
  }

  private async recalculateLiquidityProviderPDAs(
    validStakersPDAs: Array<IssuedStakerPDA>,
  ) {
    const GIDsWalletAddresses: Record<string, Array<string>> = {};

    for (let index = 0; index < validStakersPDAs.length; index++) {
      const PDARecord = validStakersPDAs[index];
      const gatewayId = PDARecord.dataAsset.owner.gatewayId;

      if (!(gatewayId in GIDsWalletAddresses)) {
        GIDsWalletAddresses[gatewayId] =
          await this.pdaService.getUserEVMWallets(gatewayId);
      }
    }

    const GIDsLiquidity =
      await this.wpoktService.getUsersWPoktLiquidity(GIDsWalletAddresses);

    const actions = await this.getLiquidityProviderPDAsUpcomingActions(
      validStakersPDAs,
      GIDsLiquidity,
    );

    this.logger.debug(
      `Liquidity Provider upcoming actions: ${JSON.stringify(actions)}`,
      CoreService.name,
    );

    // issue new PDAs
    await this.pdaService.issueNewStakerPDA(actions.add);
    // update issued PDAs' point
    await this.pdaService.updateIssuedStakerPDAs(actions.update);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handler() {
    try {
      this.logger.log('Started task', CoreService.name);

      const validStakersPDAs = await this.pdaService.getIssuedStakerPDAs();

      // Staker -> Validator PDAs
      await this.recalculateValidatorPDAs(validStakersPDAs);

      // Staker -> Liquidity provider PDAs
      await this.recalculateLiquidityProviderPDAs(validStakersPDAs);

      this.logger.log('Completed task', CoreService.name);
    } catch (err) {
      this.logger.error(err.message, CoreService.name, { stack: err.stack });
    }
  }
}
