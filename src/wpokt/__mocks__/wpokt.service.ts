export const WPoktService = jest.fn().mockReturnValue({
  request: jest.fn(),
  requestV2: jest.fn(),
  getUsersWPoktLiquidityV2GQL: jest.fn(),
  getUsersWPoktLiquidityV2: jest.fn(),
  serializeUsersWPoktLiquidityV2: jest.fn(),
  getUsersWPoktLiquidity: jest.fn(),
});
