export const PDAService = jest.fn().mockReturnValue({
  getIssueStakerPdaGQL: jest.fn(() => {
    return 'mockedValue';
  }),
  issueNewStakerPDA: jest.fn(),
  getIssuedStakerPDAs: jest.fn(),
  updateIssuedStakerPDAs: jest.fn(),
});
