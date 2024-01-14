import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import { BaseRetriever } from './interfaces/common.interface';
import {
  PoktScanNodePagination,
  PoktScanOutput,
  PoktScanResponse,
} from './interfaces/pokt-scan.interface';

@Injectable()
export class PoktScanRetriever implements BaseRetriever<never, PoktScanOutput> {
  constructor(
    private readonly config: ConfigService,
    private readonly axios: HttpService,
    private readonly logger: WinstonProvider,
  ) {}

  private async request<T>(query: string, variables?: Record<string, any>) {
    const response = await firstValueFrom(
      this.axios.post<T>(
        this.config.get<string>('POKT_SCAN_API_BASE_URL'),
        {
          query,
          variables,
        },
        {
          headers: {
            Authorization: this.config.get<string>('POKT_SCAN_API_TOKEN'),
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    this.logger.debug(
      'request method\n' +
        `input => ${JSON.stringify({ query, variables })}\n` +
        `response => ${JSON.stringify({
          status: response.status,
          body: response.data,
        })}\n`,
      PoktScanRetriever.name,
    );

    return response.data;
  }

  private getPoktNodeGQL() {
    return `
    query ListPoktNode($cursor: ID) {
      ListPoktNode(
        pagination: {
          cursor: $cursor
          limit: 1000000
          sort: { property: "_id", direction: -1 }
        }
      ) {
        items {
          address
          output_address
          balance
          output_balance
          service_domain
          custodial
          stake_weight
        }
        pageInfo {
          has_next
          next
        }
      }
    }`;
  }

  private nextPage(pageInfo: PoktScanNodePagination): string | null {
    return pageInfo.has_next === true ? pageInfo.next : null;
  }

  private async getListNodeData() {
    const query = this.getPoktNodeGQL();
    const results: PoktScanOutput = [];

    let nextPage = null;

    do {
      const result = await this.request<PoktScanResponse>(query, {
        cursor: nextPage,
      });

      results.push(...result.data.ListPoktNode.items);
      nextPage = this.nextPage(result.data.ListPoktNode.pageInfo);
    } while (nextPage !== null);

    return results;
  }

  async retrieve(): Promise<PoktScanOutput> {
    return await this.getListNodeData();
  }
}
