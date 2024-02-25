interface LiquidityPositionBlock {
  user: {
    id: string;
  };
  liquidityTokenBalance: string;
  pair: {
    totalSupply: string;
    token0: {
      id: string;
    };
    reserve0: string;
    token1: {
      id: string;
    };
    reserve1: string;
  };
}
export interface WPoktLiquidityV2Response {
  data: {
    positions: Array<LiquidityPositionBlock>;
  };
}

export interface WPoktLiquidityV2Variables {
  Users_Wallet_Addr: Array<string>;
  WPokt_ID: string;
}
