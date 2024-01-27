export interface PoktScanNodeItem {
  address: string;
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
  custodian: Record<
    string,
    Array<{
      domain: string;
      staked_amount: number;
      wallet_address: string;
    }>
  >;
  non_custodian: Record<
    string,
    Array<{
      wallet_address: string;
      staked_amount: number;
    }>
  >;
}
