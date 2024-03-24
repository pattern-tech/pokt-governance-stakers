export const PDAService = jest.fn().mockReturnValue({
  getIssueStakerPdaGQL: jest.fn(() => {
    return 'mockedValue';
  }),
  request: jest.fn(),
  getIssuedPDAsGQL: jest.fn(),
  getIssuedPDACountGQL: jest.fn(),
  pagination: jest.fn(),
  issueNewStakerPDA: jest.fn(),
  getIssuedStakerPDAs: jest.fn(),
  getIssuedCitizenAndStakerPDAs: jest.fn(),
  getUpdateStakerPdaGQL: jest.fn(),
  updateIssuedStakerPDAs: jest.fn(),
  getUserEVMWallets: jest.fn(),
  jobListener: jest.fn(),
  stopJobListener: jest.fn(),
});
