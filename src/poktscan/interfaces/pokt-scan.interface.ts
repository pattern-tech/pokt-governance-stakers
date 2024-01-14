interface PoktScanNodeItem {
  address: string;
  output_address: string;
  balance: number;
  output_balance: number;
  service_domain: string;
  custodial: boolean;
  stake_weight: number;
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

export interface PoktScanOutput extends Array<PoktScanNodeItem> {}
