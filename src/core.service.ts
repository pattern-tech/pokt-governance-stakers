import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import lodash from 'lodash';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  IssuedCitizenAndStakerPDA,
  IssuedStakerPDA,
} from './pda/interfaces/pda.interface';
import { PoktScanOutput } from './poktscan/interfaces/pokt-scan.interface';
import { PDAService } from './pda/pda.service';
import { PoktScanRetriever } from './poktscan/pokt.retriever';
import { WPoktService } from './wpokt/wpokt.service';
import { PDAQueue } from './pda/pda.queue';

@Injectable()
export class CoreService {
  constructor(
    private readonly poktScanRetriever: PoktScanRetriever,
    private readonly dnsResolver: DNSResolver,
    private readonly pdaService: PDAService,
    private readonly wpoktService: WPoktService,
    private readonly logger: WinstonProvider,
    private readonly config: ConfigService,
    private readonly pdaQueue: PDAQueue,
  ) {}

  private async setCustodianActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
  ) {
    this.logger.log('Started set custodian actions', CoreService.name);
    const STAKER_POKT_LOGO_URL = this.config.get<string>(
      'SUPPLY_STAKER_POKT_LOGO_URL',
    );

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

          if (PDA_record) {
            // update PDA point
            this.pdaQueue.addJob({
              action: 'update',
              payload: {
                pda_id: PDA_record.id,
                point: sumOfStakedTokens,
              },
            });
          } else {
            // Issue new PDA
            this.pdaQueue.addJob({
              action: 'add',
              payload: {
                point: sumOfStakedTokens,
                image: STAKER_POKT_LOGO_URL,
                node_type: 'custodian',
                pda_sub_type: 'Validator',
                owner: resolvedGatewayID,
                serviceDomain: domain,
              },
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
          this.pdaQueue.addJob({
            action: 'update',
            payload: {
              pda_id: PDA_record.id,
              point: 0,
            },
          });
        }
      }
    }

    this.logger.log('Completed set custodian actions', CoreService.name);
  }

  private async setNonCustodianActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
  ) {
    this.logger.log('Started set nonCustodian actions', CoreService.name);
    const STAKER_POKT_LOGO_URL = this.config.get<string>(
      'SUPPLY_STAKER_POKT_LOGO_URL',
    );

    for (const walletAddress in stakedNodesData.non_custodian) {
      if (
        Object.prototype.hasOwnProperty.call(
          stakedNodesData.non_custodian,
          walletAddress,
        )
      ) {
        const PDA_record = lodash.find(validStakersPDAs, (PDA_record) => {
          return (
            PDA_record.dataAsset.claim.wallets?.[0]?.address ===
              walletAddress &&
            PDA_record.dataAsset.claim.pdaSubtype === 'Validator' &&
            PDA_record.dataAsset.claim.type === 'non-custodian'
          );
        });

        const sumOfStakedTokens = lodash.sumBy(
          stakedNodesData.non_custodian[walletAddress],
          (record) => record.staked_amount,
        );

        const wallets = [{ address: walletAddress, amount: sumOfStakedTokens }];

        if (PDA_record) {
          // update PDA point
          this.pdaQueue.addJob({
            action: 'update',
            payload: {
              pda_id: PDA_record.id,
              point: sumOfStakedTokens,
              wallets: wallets,
            },
          });
        } else {
          // Issue new PDA
          this.pdaQueue.addJob({
            action: 'add',
            payload: {
              point: sumOfStakedTokens,
              image: STAKER_POKT_LOGO_URL,
              node_type: 'non-custodian',
              pda_sub_type: 'Validator',
              owner: walletAddress,
              wallets: wallets,
            },
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
            PDA_record.dataAsset.claim.wallets?.[0]?.address ===
              nodeRecordsWallet &&
            PDA_record.dataAsset.claim.pdaSubtype === 'Validator'
          ) {
            isPDAValid = true;
            break;
          }
        }

        if (!isPDAValid) {
          // update zero point
          this.pdaQueue.addJob({
            action: 'update',
            payload: {
              pda_id: PDA_record.id,
              point: 0,
              wallets: [],
            },
          });
        }
      }
    }

    this.logger.log('Completed set nonCustodian actions', CoreService.name);
  }

  private async getValidatorPDAsUpcomingActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
  ) {
    // Custodian Section
    await this.setCustodianActions(stakedNodesData, validStakersPDAs);

    // Non-Custodian Section
    await this.setNonCustodianActions(stakedNodesData, validStakersPDAs);
  }

  private async recalculateValidatorPDAs(
    validStakersPDAs: Array<IssuedStakerPDA>,
  ) {
    const stakedNodesData = await this.poktScanRetriever.retrieve();
    await this.getValidatorPDAsUpcomingActions(
      stakedNodesData,
      validStakersPDAs,
    );
  }

  private async getLiquidityProviderPDAsUpcomingActions(
    validCitizenAndStakersPDAs: Array<IssuedCitizenAndStakerPDA>,
    GIDsLiquidity: Record<string, number>,
  ) {
    const havingLPPdaGIDs: Array<string> = [];
    const uniqueGIDs = Object.keys(GIDsLiquidity);
    const STAKER_POKT_LOGO_URL = this.config.get<string>(
      'LIQUIDITY_STAKER_POKT_LOGO_URL',
    );

    for (let index = 0; index < validCitizenAndStakersPDAs.length; index++) {
      const PDARecord = validCitizenAndStakersPDAs[index];
      const PDARecordGatewayID = PDARecord.dataAsset.owner.gatewayId;
      const gatewayIDLiquidity = GIDsLiquidity[PDARecordGatewayID];

      if (PDARecord.dataAsset.claim.pdaSubtype === 'Liquidity Provider') {
        if (PDARecord.dataAsset.claim.point !== gatewayIDLiquidity) {
          this.pdaQueue.addJob({
            action: 'update',
            payload: {
              pda_id: PDARecord.id,
              point: gatewayIDLiquidity,
            },
          });
        }

        havingLPPdaGIDs.push(PDARecordGatewayID);
      }
    }

    for (let index = 0; index < uniqueGIDs.length; index++) {
      const gatewayID = uniqueGIDs[index];
      const gatewayIDLiquidity = GIDsLiquidity[gatewayID];

      if (gatewayIDLiquidity > 0 && !havingLPPdaGIDs.includes(gatewayID)) {
        this.pdaQueue.addJob({
          action: 'add',
          payload: {
            owner: gatewayID,
            image: STAKER_POKT_LOGO_URL,
            pda_sub_type: 'Liquidity Provider',
            point: gatewayIDLiquidity,
          },
        });
      }
    }
  }

  private async recalculateLiquidityProviderPDAs(
    validCitizenAndStakersPDAs: Array<IssuedCitizenAndStakerPDA>,
  ) {
    const GIDsWalletAddresses: Record<string, Array<string>> = {};

    for (let index = 0; index < validCitizenAndStakersPDAs.length; index++) {
      const PDARecord = validCitizenAndStakersPDAs[index];
      const gatewayId = PDARecord.dataAsset.owner.gatewayId;

      if (!(gatewayId in GIDsWalletAddresses)) {
        GIDsWalletAddresses[gatewayId] =
          await this.pdaService.getUserEVMWallets(gatewayId);
      }
    }

    const GIDsLiquidity =
      await this.wpoktService.getUsersWPoktLiquidity(GIDsWalletAddresses);

    await this.getLiquidityProviderPDAsUpcomingActions(
      validCitizenAndStakersPDAs,
      GIDsLiquidity,
    );
  }

  async handler() {
    try {
      this.logger.log('Started task', CoreService.name);

      const validCitizenAndStakersPDAs =
        await this.pdaService.getIssuedCitizenAndStakerPDAs();
      const validStakersPDAs = validCitizenAndStakersPDAs.filter(
        (pda) => pda.dataAsset.claim.pdaType === 'staker',
      ) as Array<IssuedStakerPDA>;

      // Initialize pda job listener
      this.pdaQueue.reset();
      const pdaJobListenerID = await this.pdaService.jobListener(2000, 2);
      // Staker -> Validator PDAs
      await this.recalculateValidatorPDAs(validStakersPDAs);

      // Staker -> Liquidity provider PDAs
      await this.recalculateLiquidityProviderPDAs(validCitizenAndStakersPDAs);

      await this.pdaQueue.wait();
      await this.pdaService.stopJobListener(pdaJobListenerID);

      this.logger.log('Completed task', CoreService.name);
    } catch (err) {
      this.logger.error(err.message, CoreService.name, { stack: err.stack });
      throw err;
    }
  }
}
