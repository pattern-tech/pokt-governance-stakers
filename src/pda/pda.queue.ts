import { Injectable } from '@nestjs/common';
import { Queue } from '@common/utils/queue.util';
import { sleep } from '@common/utils/sleep.util';
import { PDAJob } from './types/pda.type';

@Injectable()
export class PDAQueue extends Queue<PDAJob> {
  constructor() {
    super(PDAQueue.name, 'FIFO');
  }

  async wait() {
    while (this.length > 0) {
      await sleep(1000);
    }
  }
}
