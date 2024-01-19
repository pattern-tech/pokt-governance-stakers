import { StakerPDASubType, StakerPDAType } from './pda/types/pda.type';

export interface CoreUpdateAction {
  pda_id: string;
  point: number;
}

export interface CoreAddAction {
  point: number;
  pda_sub_type: StakerPDASubType;
  node_type: StakerPDAType;
  owner_gateway_id: string;
}

export interface CorePDAsUpcomingActions {
  update: Array<CoreUpdateAction>;
  add: Array<CoreAddAction>;
}
