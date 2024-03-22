import { Queue } from '../queue.util';

describe('Queue', () => {
  test('Should be defined', () => {
    const queue = new Queue<any>('testQueue');
    expect(queue).toBeDefined();
  });
  describe('constructor', () => {
    let queue;
    beforeEach(() => {
      queue = new Queue<any>('testQueue');
    });
    test('Should set type equal FIFO when type is not provided', () => {
      expect(queue['type']).toBe('FIFO');
    });
    test('Should set type equal LIFO when type is LIFO', () => {
      queue = new Queue<any>('testQueue', 'LIFO');
      expect(queue['type']).toBe('LIFO');
    });
    test('Should set type equal LIFO when type is FIFO', () => {
      queue = new Queue<any>('testQueue', 'FIFO');
      expect(queue['type']).toBe('FIFO');
    });
    describe('name', () => {
      test('Should return the correct name', () => {
        const queue = new Queue<any>('testQueue');
        expect(queue.name).toEqual('testQueue');
      });
    });
    describe('length', () => {
      test('should return 0 when the queue is empty', () => {
        const queue = new Queue<any>('testQueue');
        expect(queue.length).toEqual(0);
      });
    });
    test('should return the number of items in the queue', () => {
      const queue = new Queue<any>('testQueue');
      queue.addJob(1);
      queue.addJob(2);
      expect(queue.length).toEqual(2);
    });
  });
  describe('addJob', () => {
    let queue;
    test('should add a job to the end of the queue when queue type is FIFO', () => {
      queue = new Queue<any>('testQueue', 'FIFO');
      queue.addJob(1);
      queue.addJob(2);
      expect(queue.storage[0]).toEqual(1);
      expect(queue.storage.length).toEqual(2);
      expect(queue.storage[queue.storage.length - 1]).toEqual(2);
    });
    test('should add a job to the beginning of the queue when queue type is LIFO', () => {
      queue = new Queue<any>('testQueue', 'LIFO');
      queue.addJob(1);
      queue.addJob(2);
      expect(queue.storage[0]).toEqual(2);
      expect(queue.storage.length).toEqual(2);
      expect(queue.storage[queue.storage.length - 1]).toEqual(1);
    });
  });
  describe('popJob', () => {
    test('should remove and return the first job in the queue when queue type is FIFO', () => {
      const queue = new Queue<any>('testQueue', 'FIFO');
      queue['storage'] = [1, 2];
      expect(queue.popJob()).toEqual(1);
      expect(queue['storage'].length).toEqual(1);
      expect(queue.popJob()).toEqual(2);
      expect(queue['storage'].length).toEqual(0);
    });

    test('should remove and return the last job in the queue when queue type is LIFO', () => {
      const queue = new Queue<any>('testQueue', 'LIFO');
      queue['storage'] = [1, 2];
      expect(queue.popJob()).toEqual(2);
      expect(queue['storage'].length).toEqual(1);
      expect(queue.popJob()).toEqual(1);
      expect(queue['storage'].length).toEqual(0);
    });
    test('should remove and return specified number of jobs from the queue when queue type is FIFO', () => {
      const queue = new Queue<any>('testQueue', 'FIFO');
      queue['storage'] = [1, 2, 3, 4];
      expect(queue.popJobs(2)).toEqual([1, 2]);
    });
    test('should remove and return specified number of jobs from the queue when queue type is LIFO', () => {
      const queue = new Queue<any>('testQueue', 'LIFO');
      queue['storage'] = [1, 2, 3, 4];
      expect(queue.popJobs(2)).toEqual([3, 4]);
    });
  });
  describe('reset', () => {
    test('should reset the queue and remove all jobs', () => {
      const queue = new Queue<any>('testQueue', 'FIFO');
      queue['storage'] = [1, 2, 3, 4];
      queue.reset();
      expect(queue.length).toEqual(0);
    });
  });
});
