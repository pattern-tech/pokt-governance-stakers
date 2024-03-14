import { CoreAddAction, CoreUpdateAction } from '../../core.interface';
import {
  BuilderPDASubType,
  CitizenPDASubType,
  PDAType,
  StakerPDASubType,
  StakerPDAType,
  UserAuthenticationChain,
} from '../types/pda.type';

interface PDAClaimBase<Type extends PDAType> {
  point: number;
  pdaType: Type;
  pdaSubtype: Type extends 'citizen'
    ? CitizenPDASubType
    : Type extends 'builder'
      ? BuilderPDASubType
      : StakerPDASubType;
}

interface StakerPDAClaim {
  type: StakerPDAType;
  serviceDomain: string;
  wallets: Array<{
    address: string;
    amount: number;
  }>;
}

interface UserAuthenticationBlock {
  address: string;
  chain: UserAuthenticationChain | null;
}

export interface IssuedPDA {
  id: string;
  status: 'Valid' | 'Suspended' | 'Revoked' | 'Expired';
  dataAsset: {
    claim:
      | PDAClaimBase<'citizen'>
      | PDAClaimBase<'builder'>
      | (PDAClaimBase<'staker'> & StakerPDAClaim);
    owner: {
      gatewayId: string;
    };
  };
}

export interface IssuedStakerPDA extends IssuedPDA {
  dataAsset: {
    claim: PDAClaimBase<'staker'> & StakerPDAClaim;
    owner: {
      gatewayId: string;
    };
  };
}

export interface IssuedCitizenAndStakerPDA extends IssuedPDA {
  dataAsset: {
    claim: PDAClaimBase<'citizen'> | (PDAClaimBase<'staker'> & StakerPDAClaim);
    owner: {
      gatewayId: string;
    };
  };
}

export interface IssuedPDAsResponse {
  data: {
    issuedPDAs: Array<IssuedPDA>;
  };
}

export interface IssuedPDAsVariables {
  org_gateway_id: string;
  take: number;
  skip: number;
}

export interface IssuedPDACountResponse {
  data: {
    issuedPDAsCount: number;
  };
}

export interface IssuedPDACountVariables {
  org_gateway_id: string;
}

export interface IssueNewStakerPDAVariables {
  org_gateway_id: string;
  data_model_id: string;
  owner: string;
  owner_type: 'GATEWAY_ID' | 'POKT';
  claim: PDAClaimBase<'staker'> & StakerPDAClaim;
}

export interface IssueNewStakerPDAResponse {
  data: {
    createPDA: {
      id: string;
    };
  };
}

export interface UpdateStakerPDAVariables {
  PDA_id: string;
  claim: Partial<PDAClaimBase<'staker'> & StakerPDAClaim>;
}

export interface UpdateStakerPDAResponse {
  data: {
    updatePDA: {
      id: string;
    };
  };
}

export interface UserAuthenticationsResponse {
  data: {
    userAuthentications: Array<UserAuthenticationBlock>;
  };
}

export interface UserAuthenticationsVariables {
  user_GID: string;
}

export interface IssuePDAJob {
  action: 'add';
  payload: CoreAddAction;
}
export interface UpdatePDAJob {
  action: 'update';
  payload: CoreUpdateAction;
}
