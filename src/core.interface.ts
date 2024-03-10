import { StakerPDASubType, StakerPDAType } from './pda/types/pda.type';

export interface CoreUpdateAction {
  pda_id: string;
  point: number;
  wallets?: Array<{
    address: string;
    amount: number;
  }>;
}

export interface CoreAddAction {
  image: string;
  point: number;
  pda_sub_type: StakerPDASubType;
  node_type?: StakerPDAType;
  owner: string;
  serviceDomain?: string;
  wallets?: Array<{
    address: string;
    amount: number;
  }>;
}

export interface CorePDAsUpcomingActions {
  update: Array<CoreUpdateAction>;
  add: Array<CoreAddAction>;
}
