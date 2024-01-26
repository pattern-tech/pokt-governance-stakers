export const PoktScanRetriever = jest.fn().mockReturnValue({
  getPoktNodeGQL: jest.fn(() => {
    return 'mockedValue';
  }),
  retrieve: jest.fn(),
});
