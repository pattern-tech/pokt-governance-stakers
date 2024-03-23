export const Queue = jest.fn().mockReturnValue({
  addJob: jest.fn(),
  popJob: jest.fn(),
  popJobs: jest.fn(),
  reset: jest.fn(),
});
