export interface PoktScanNodeItem {
  output_address: string;
  service_domain: string;
  custodial: boolean;
  tokens: number;
}

export interface PoktScanNodePagination {
  has_next: boolean;
  next: string;
}

export interface PoktScanResponse {
  data: {
    ListPoktNode: {
      items: Array<PoktScanNodeItem>;
      pageInfo: PoktScanNodePagination;
    };
  };
}

export interface PoktScanOutput {
  custodian: Array<{
    domain: string;
    staked_amount: number;
  }>;
  non_custodian: Array<{
    wallet_address: string;
    staked_amount: number;
  }>;
}
