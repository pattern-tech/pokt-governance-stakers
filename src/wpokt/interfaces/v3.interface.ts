interface LiquidityPositionBlock {
  owner: string;
  token0: {
    id: string;
  };
  depositedToken0: string;
  token1: {
    id: string;
  };
  depositedToken1: string;
}

export interface WPoktLiquidityV3Response {
  data: {
    positions: Array<LiquidityPositionBlock>;
  };
}

export interface WPoktLiquidityV3Variables {
  Users_Wallet_Addr: Array<string>;
  WPokt_ID: string;
}
