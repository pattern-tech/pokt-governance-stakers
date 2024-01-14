import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PoktScanRetriever } from './pokt.retriever';

@Module({
  imports: [HttpModule],
  providers: [PoktScanRetriever],
  exports: [PoktScanRetriever],
})
export class PoktModule {}
