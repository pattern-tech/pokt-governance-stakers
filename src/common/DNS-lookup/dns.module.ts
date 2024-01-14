import { Module } from '@nestjs/common';
import { DNSResolver } from './dns.resolver';

@Module({
  providers: [DNSResolver],
  exports: [DNSResolver],
})
export class DNSModule {}
