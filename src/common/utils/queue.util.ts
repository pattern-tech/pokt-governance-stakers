export class Queue<JobType> {
  private readonly _name: string;
  private storage: Array<JobType> = [];

  constructor(
    name: string,
    private readonly type: 'FIFO' | 'LIFO' = 'FIFO',
  ) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  get length() {
    return this.storage.length;
  }

  addJob(job: JobType): void {
    if (this.type === 'FIFO') {
      this.storage.push(job);
    } else {
      this.storage.unshift(job);
    }
  }

  popJob(): JobType {
    if (this.type === 'FIFO') {
      return this.storage.shift();
    } else {
      return this.storage.pop();
    }
  }

  popJobs(count: number): Array<JobType> {
    let result: Array<JobType> = [];

    if (this.length > 0) {
      if (this.type === 'FIFO') {
        result = this.storage.splice(0, count);
      } else {
        const index = this.length - count > 0 ? this.length - count : 0;

        result = this.storage.splice(index, count);
      }
    }

    return result;
  }

  reset() {
    this.storage = [];
  }
}
