import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PDAService } from './pda.service';
import { PDAQueue } from './pda.queue';

@Module({
  imports: [HttpModule],
  providers: [PDAService, PDAQueue],
  exports: [PDAService, PDAQueue],
})
export class PDAModule {}
