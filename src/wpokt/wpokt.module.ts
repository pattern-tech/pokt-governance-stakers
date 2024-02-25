import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WPoktService } from './wpokt.service';

@Module({
  imports: [HttpModule],
  providers: [WPoktService],
  exports: [WPoktService],
})
export class WPoktModule {}
