export const PoktScanRetriever = jest.fn().mockReturnValue({
  getPoktNodeGQL: jest.fn(() => {
    return 'mockedValue';
  }),
  retrieve: jest.fn(),
  request: jest.fn(),
  nextPage: jest.fn(),
  getListNodeData: jest.fn(),
  serializer: jest.fn(),
});
