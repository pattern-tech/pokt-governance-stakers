import { Injectable } from '@nestjs/common';
import DNS from 'dns/promises';

@Injectable()
export class DNSResolver {
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
    const records = await this.getTXTRecords(domain);

    for (let idx = 0; idx < records.length; idx++) {
      const record = records[idx];
      const [identifier, value] = record.split('=');

      if (identifier === 'GATEWAY_ID') {
        return value;
      }
    }

    return false;
  }
}
