import { Injectable } from '@nestjs/common';
import DNS from 'dns/promises';
import { WinstonProvider } from '@common/winston/winston.provider';

@Injectable()
export class DNSResolver {
  constructor(private readonly logger: WinstonProvider) {}

  private async getTXTRecords(domain: string) {
    const finalRecords: Array<string> = [];
    const records = await DNS.resolveTxt(domain);

    for (let r_idx = 0; r_idx < records.length; r_idx++) {
      for (let t_idx = 0; t_idx < records[r_idx].length; t_idx++) {
        finalRecords.push(records[r_idx][t_idx]);
      }
    }

    return finalRecords;
  }

  async getGatewayIDFromDomain(domain: string): Promise<string | false> {
    try {
      const records = await this.getTXTRecords(domain);

      for (let idx = 0; idx < records.length; idx++) {
        const record = records[idx];
        const [identifier, value] = record.split(/=(.*)/, 2);

        if (identifier === 'GATEWAY_ID' && value?.length > 0) {
          return value;
        }
      }
    } catch (err) {
      this.logger.error(err.message, DNSResolver.name, { stack: err.stack });
    }

    return false;
  }
}
