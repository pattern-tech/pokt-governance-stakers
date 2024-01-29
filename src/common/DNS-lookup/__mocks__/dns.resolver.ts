export const DNSResolver = jest.fn().mockReturnValue({
  getGatewayIDFromDomain: jest.fn(() => {
    return 'gatewayID';
  }),
  getTXTRecords: jest.fn(),
});
