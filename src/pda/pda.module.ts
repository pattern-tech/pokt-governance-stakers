import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PDAService } from './pda.service';

@Module({
  imports: [HttpModule],
  providers: [PDAService],
  exports: [PDAService],
})
export class PDAModule {}
