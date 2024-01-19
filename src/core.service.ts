import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import lodash from 'lodash';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { CorePDAsUpcomingActions } from './core.interface';
import { IssuedStakerPDA } from './pda/interfaces/pda.interface';
import { PoktScanOutput } from './poktscan/interfaces/pokt-scan.interface';
import { PDAService } from './pda/pda.service';
import { PoktScanRetriever } from './poktscan/pokt.retriever';

@Injectable()
export class CoreService {
  constructor(
    private readonly poktScanRetriever: PoktScanRetriever,
    private readonly dnsResolver: DNSResolver,
    private readonly pdaService: PDAService,
  ) {}

  private async getPDAsUpcomingActions(
    stakedNodesData: PoktScanOutput,
    validStakersPDAs: Array<IssuedStakerPDA>,
  ): Promise<CorePDAsUpcomingActions> {
    const actions: CorePDAsUpcomingActions = {
      add: [],
      update: [],
    };

    // Custodian Section
    for (let idx = 0; idx < stakedNodesData.custodian.length; idx++) {
      const custodian = stakedNodesData.custodian[idx];
      const resolvedGatewayID = await this.dnsResolver.getGatewayIDFromDomain(
        custodian.domain,
      );

      if (resolvedGatewayID !== false) {
        const PDA = validStakersPDAs.filter(
          (PDA) =>
            PDA.dataAsset.owner.gatewayId === resolvedGatewayID &&
            PDA.dataAsset.claim.pdaSubtype === 'Validator',
        )[0];
        const sumOfStakedTokens = lodash.sumBy(
          stakedNodesData.custodian,
          (record) => {
            if (record.domain === custodian.domain) {
              return record.staked_amount;
            } else {
              return 0;
            }
          },
        );

        if (PDA) {
          // update PDA point
          actions.update.push({ pda_id: PDA.id, point: sumOfStakedTokens });
        } else {
          // Issue new PDA
          actions.add.push({
            point: sumOfStakedTokens,
            node_type: 'custodian',
            pda_sub_type: 'Validator',
            owner_gateway_id: resolvedGatewayID,
          });
        }
      }
    }

    // Non-Custodian Section
    // for (let idx = 0; idx < stakedNodesData.non_custodian.length; idx++) {
    //   const non_custodian = stakedNodesData.non_custodian[idx];
    // }

    return actions;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handler() {
    const stakedNodesData = await this.poktScanRetriever.retrieve();
    const validStakersPDAs = await this.pdaService.getIssuedStakerPDAs();

    const actions = await this.getPDAsUpcomingActions(
      stakedNodesData,
      validStakersPDAs,
    );

    // issue new PDAs
    await this.pdaService.issueNewStakerPDA(actions.add);
    // update issued PDAs' point
    await this.pdaService.updateIssuedStakerPDAs(actions.update);
  }
}
