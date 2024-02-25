import { Module } from '@nestjs/common';
import { WPoktService } from './wpokt.service';

@Module({
  providers: [WPoktService],
  exports: [WPoktService],
})
export class WPoktModule {}
