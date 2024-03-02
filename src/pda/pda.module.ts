import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PDAService } from './pda.service';
import { PDAConsumer } from './pda.consumer';
import { PDAProducer } from './pda.producer';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'ValidatorStakerPDA',
    }),
  ],
  providers: [PDAService, PDAProducer, PDAConsumer],
  exports: [PDAService, PDAProducer],
})
export class PDAModule {}
