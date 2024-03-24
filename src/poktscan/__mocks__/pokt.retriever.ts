export const PoktScanRetriever = jest.fn().mockReturnValue({
  getPoktNodeGQL: jest.fn(() => {
    return 'mockedValue';
  }),
  retrieve: jest.fn().mockResolvedValue({ custodian: {}, non_custodian: {} }),
  request: jest.fn(),
  nextPage: jest.fn(),
  getListNodeData: jest.fn(),
  serializer: jest.fn(),
});
