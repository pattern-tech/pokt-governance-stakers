export const PDAService = jest.fn().mockReturnValue({
  getIssueStakerPdaGQL: jest.fn(() => {
    return 'mockedValue';
  }),
});
