import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import {
  IssueNewStakerPDAResponse,
  IssuedPDACountResponse,
  IssuedPDAsResponse,
  IssuedStakerPDA,
  UpdateStakerPDAVariables,
} from '../interfaces/pda.interface';
import { CoreAddAction, CoreUpdateAction } from 'src/core.interface';
import { PDAService } from '../pda.service';

describe('PDAService', () => {
  let service: PDAService;
  let axios: HttpService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      providers: [PDAService],
    }).compile();
    service = module.get<PDAService>(PDAService);
    axios = module.get<HttpService>(HttpService);
    config = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  test('Should be defined', () => {
    // Assert
    expect(service).toBeDefined();
  });

  describe('request', () => {
    let query: string;
    let axiosResponse: AxiosResponse;
    let variables: Record<string, any>;
    let returnValue: Record<string, any>;
    beforeEach(async () => {
      query = 'query { test { test } }';
      variables = {};
      axiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: undefined,
        config: undefined,
      };
      jest.spyOn(config, 'get').mockReturnValue('');
      jest.spyOn(axios, 'post').mockReturnValue(of(axiosResponse));

      returnValue = await service['request'](query, variables);
    });

    test('Should be defined', () => {
      // Assert
      expect(service['request']).toBeDefined();
    });

    test('Should call get method from config', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('MYGATEWAY_ENDPOINT_URL');
    });

    test('Should call get method from config', () => {
      // Assert
      expect(config.get).toHaveBeenCalledWith('MYGATEWAY_API_KEY');
    });

    test('Should call get method from config', () => {
      expect(config.get).toHaveBeenCalledWith('MYGATEWAY_AUTHENTICATION_TOKEN');
    });

    test('Should call post from axios with the correct parameters', () => {
      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        '',
        {
          query,
          variables,
        },
        {
          headers: {
            Authorization: 'Bearer ',
            'x-api-key': '',
            'Content-Type': 'application/json',
          },
        },
      );
    });
    test('Should return body from http response', () => {
      // Assert
      expect(returnValue).toEqual(axiosResponse.data);
    });
  });

  describe('getIssuedPDAsGQL', () => {
    let returnValue: string;

    beforeAll(() => {
      returnValue = service['getIssuedPDAsGQL']();
    });
    test('Should be defined', () => {
      expect(service['getIssuedPDAsGQL']).toBeDefined();
    });

    test('Should return getIssuedPDAs graphQL query', () => {
      // Assert
      expect(returnValue).toBe(
        `
    query getPDAs($org_gateway_id: String!, $take: Float!, $skip: Float!) {
      issuedPDAs(
          filter: { organization: { type: GATEWAY_ID, value: $org_gateway_id } }
          take: $take
          skip: $skip
          order: { issuanceDate: "DESC" }
      ) {
          id
          status
          dataAsset {
              claim
              owner {
                  gatewayId
              }
          }
      }
    }`,
      );
    });
  });
  describe('getIssuedPDACountGQL', () => {
    let returnValue: string;

    beforeEach(() => {
      returnValue = service['getIssuedPDACountGQL']();
    });

    test('Should be defined', () => {
      // Assert
      expect(service['getIssuedPDACountGQL']).toBeDefined();
    });

    test('Should return IssuedPDACount graphQL query', () => {
      // Assert
      expect(returnValue).toBe(
        `
    query IssuedPDAsCount($org_gateway_id: String!) {
        issuedPDAsCount(
            filter: { organization: { type: GATEWAY_ID, value: $org_gateway_id } }
        )
    }`,
      );
    });
  });
  describe('pagination', () => {
    test("Should return pagination when max's value less or equal that 100", () => {
      // Assert
      expect(service['pagination'](99)).toEqual([{ take: 99, skip: 0 }]);
      expect(service['pagination'](100)).toEqual([{ take: 100, skip: 0 }]);
    });

    test("Should return pagination when max's value greater that 100", () => {
      // Assert
      expect(service['pagination'](350)).toEqual([
        { take: 100, skip: 0 },
        { take: 100, skip: 100 },
        { take: 100, skip: 200 },
        { take: 50, skip: 300 },
      ]);
      expect(service['pagination'](400)).toEqual([
        { take: 100, skip: 0 },
        { take: 100, skip: 100 },
        { take: 100, skip: 200 },
        { take: 100, skip: 300 },
      ]);
    });
  });

  describe('getIssuedStakerPDAs', () => {
    let issuedPDACountResponse: IssuedPDACountResponse;
    let returnValue: Array<IssuedStakerPDA>;
    let PDAResponse: IssuedPDAsResponse;
    let PDA: IssuedStakerPDA;
    beforeEach(() => {
      issuedPDACountResponse = {
        data: { issuedPDAsCount: 1 },
      };
      PDA = {
        id: 'id',
        status: 'Valid',
        dataAsset: {
          claim: {
            point: 4,
            pdaType: 'staker',
            pdaSubtype: 'Gateway',
            type: 'custodian',
            serviceDomain: '',
            wallets: [
              {
                address: 'address',
                amount: 1,
              },
            ],
          },
          owner: {
            gatewayId: 'gatewayID',
          },
        },
      };
    });
    test('Should be defined', () => {
      expect(service.getIssuedStakerPDAs).toBeDefined();
    });

    test('Should return an empty array when countResponse is 0', async () => {
      // Arrange
      issuedPDACountResponse = {
        data: { issuedPDAsCount: 0 },
      };
      PDAResponse = {
        data: {
          issuedPDAs: [],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      returnValue = await service.getIssuedStakerPDAs();
      // Assert
      expect(returnValue).toEqual([]);
    });

    test('Should not add PDA if status is not Valid', async () => {
      // Arrange
      PDAResponse = {
        data: {
          issuedPDAs: [
            {
              id: 'id',
              status: 'Expired',
              dataAsset: {
                claim: {
                  point: 4,
                  pdaType: 'staker',
                  pdaSubtype: 'Gateway',
                  type: 'custodian',
                  serviceDomain: '',
                  wallets: [
                    {
                      address: 'address',
                      amount: 1,
                    },
                  ],
                },
                owner: {
                  gatewayId: 'gatewayID',
                },
              },
            },
          ],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      returnValue = await service.getIssuedStakerPDAs();
      // Assert
      expect(returnValue).toEqual([]);
    });
    test('Should not add PDA if pdaType is not staker', async () => {
      // Arrange
      PDAResponse = {
        data: {
          issuedPDAs: [
            {
              id: 'id',
              status: 'Valid',
              dataAsset: {
                claim: {
                  point: 17,
                  pdaType: 'citizen',
                  pdaSubtype: 'POKT DAO',
                },
                owner: {
                  gatewayId: '17',
                },
              },
            },
          ],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      returnValue = await service.getIssuedStakerPDAs();
      // Assert
      expect(returnValue).toEqual([]);
    });

    test('Should store related PDAs', async () => {
      PDAResponse = {
        data: {
          issuedPDAs: [PDA],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      returnValue = await service.getIssuedStakerPDAs();
      expect(returnValue).toEqual([PDA]);
    });

    test('Should call request method two times for each PDA', async () => {
      PDAResponse = {
        data: {
          issuedPDAs: [PDA],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      await service.getIssuedStakerPDAs();
      expect(service['request']).toHaveBeenCalledTimes(2);
    });

    test('Should check all PDAs and collect correct ones', async () => {
      issuedPDACountResponse = {
        data: { issuedPDAsCount: 2 },
      };
      const fakePDA: any = {
        id: 'id',
        status: 'Valid',
        dataAsset: {
          claim: {
            point: 4,
            pdaType: 'someOtherPdaType',
            pdaSubtype: 'Gateway',
            type: 'custodian',
          },
          owner: {
            gatewayId: 'gatewayID',
          },
        },
      };
      PDAResponse = {
        data: {
          issuedPDAs: [PDA, fakePDA],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      await service.getIssuedStakerPDAs();
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      returnValue = await service.getIssuedStakerPDAs();
      expect(returnValue).toEqual([PDA]);
      expect(service['request']).toHaveBeenCalledTimes(4);
    });
  });

  describe('getIssueStakerPdaGQL', () => {
    test('Should be defined', () => {
      expect(service['getIssuedStakerPDAs']).toBeDefined();
    });
    test('Should return getIssueStakerPda graphQL query', () => {
      expect(service['getIssueStakerPdaGQL']()).toBe(
        `
    mutation CreatePDA(
      $org_gateway_id: String!
      $data_model_id: String!
      $owner: String!
      $owner_type: UserIdentifierType!
      $claim: JSON!
    ) {
      createPDA(
          input: {
              dataModelId: $data_model_id
              title: "Pocket Network Staker"
              description: "Servicer or Validator Path"
              owner: { type: $owner_type, value: $owner }
              organization: { type: GATEWAY_ID, value: $org_gateway_id }
              claim: $claim
          }
      ) {
          id
      }
    }`,
      );
    });
  });

  describe('issueNewStakerPDA', () => {
    let addActions: Array<CoreAddAction>;
    let issueNewStakerPDAResponse: IssueNewStakerPDAResponse;
    beforeEach(() => {
      issueNewStakerPDAResponse = {
        data: {
          createPDA: {
            id: 'id',
          },
        },
      };
      addActions = [
        {
          point: 1,
          pda_sub_type: 'Gateway',
          node_type: 'custodian',
          owner: 'owner',
          serviceDomain: '',
          wallets: [
            {
              address: '',
              amount: 1,
            },
          ],
        },
      ];
      jest.spyOn(config, 'get').mockReturnValue('');
    });
    test('Should be defined', () => {
      expect(service.issueNewStakerPDA).toBeDefined();
    });
    test('Should issue new staker PDAs', async () => {
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issueNewStakerPDAResponse);
      await service.issueNewStakerPDA(addActions);
      expect(service['request']).toHaveBeenCalledTimes(addActions.length);
    });
    test('Should call method request with correct parameters', async () => {
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issueNewStakerPDAResponse);
      jest
        .spyOn(service as any, 'getIssueStakerPdaGQL')
        .mockReturnValue('mutationCreatePDA');
      await service.issueNewStakerPDA(addActions);
      expect(service['request']).toHaveBeenCalledWith('mutationCreatePDA', {
        data_model_id: '',
        org_gateway_id: '',
        owner: 'owner',
        owner_type: 'GATEWAY_ID',
        claim: {
          pdaSubtype: 'Gateway',
          pdaType: 'staker',
          type: 'custodian',
          point: 1,
          serviceDomain: '',
          wallets: [
            {
              address: '',
              amount: 1,
            },
          ],
        },
      });
    });
    test(`Should set 'owner_type' ='POKT' and ignore 'serviceDomain' when 'node_type' = 'non-custodian'`, async () => {
      addActions = [
        {
          point: 1,
          pda_sub_type: 'Gateway',
          node_type: 'non-custodian',
          owner: 'owner',
          wallets: [
            {
              address: '',
              amount: 1,
            },
          ],
        },
      ];
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issueNewStakerPDAResponse);
      jest
        .spyOn(service as any, 'getIssueStakerPdaGQL')
        .mockReturnValue('mutationCreatePDA');
      await service.issueNewStakerPDA(addActions);
      expect(service['request']).toHaveBeenCalledWith('mutationCreatePDA', {
        data_model_id: '',
        org_gateway_id: '',
        owner: 'owner',
        owner_type: 'POKT',
        claim: {
          pdaSubtype: 'Gateway',
          pdaType: 'staker',
          type: 'non-custodian',
          point: 1,
          wallets: [
            {
              address: '',
              amount: 1,
            },
          ],
        },
      });
    });

    describe('getUpdateStakerPdaGQL', () => {
      test('Should be defined', () => {
        expect(service['getUpdateStakerPdaGQL']).toBeDefined();
      });
      test('Should return getUpdateStakerPda graphQL query', () => {
        expect(service['getUpdateStakerPdaGQL']()).toBe(
          `
    mutation updatePDA($PDA_ID: String!, $claim: JSON!) {
      updatePDA(input: { id: $PDA_ID, claim: $claim }) {
          id
      }
    }`,
        );
      });
    });

    describe('updateIssuedStakerPDAs', () => {
      let updateActions: Array<CoreUpdateAction>;
      let updateStakerPDAVariables: UpdateStakerPDAVariables;
      beforeEach(() => {
        updateStakerPDAVariables = {
          pda_id: 'id',
          claim: {
            point: 3,
            pdaType: 'staker',
            pdaSubtype: 'Validator',
            type: 'non-custodian',
            serviceDomain: 'example.com',
            wallets: [
              {
                address: '0xabcdef123456789',
                amount: 100,
              },
            ],
          },
        };
        updateActions = [
          {
            pda_id: 'id',
            point: 10,
            wallets: [
              {
                address: 'address',
                amount: 100,
              },
            ],
          },
        ];
      });
      test('Should be defined', () => {
        expect(service.updateIssuedStakerPDAs).toBeDefined();
      });
      test('Should update staker PDAs', async () => {
        jest
          .spyOn(service as any, 'request')
          .mockReturnValueOnce(updateStakerPDAVariables);
        await service.updateIssuedStakerPDAs(updateActions);
        expect(service['request']).toHaveBeenCalledTimes(updateActions.length);
        expect(service['request']).toHaveBeenCalledTimes(1);
      });
      test('Should call method request with correct parameters', async () => {
        jest
          .spyOn(service as any, 'request')
          .mockReturnValueOnce(issueNewStakerPDAResponse);
        jest
          .spyOn(service as any, 'getUpdateStakerPdaGQL')
          .mockReturnValue('mutationCreatePDA');
        await service.updateIssuedStakerPDAs(updateActions);
        expect(service['request']).toHaveBeenCalledWith('mutationCreatePDA', {
          pda_id: 'id',
          claim: {
            point: 10,
            wallets: [
              {
                address: 'address',
                amount: 100,
              },
            ],
          },
        });
      });
      test('Should call method request with correct parameters when wallet is not defined', async () => {
        updateActions = [
          {
            pda_id: 'id',
            point: 10,
          },
        ];
        jest
          .spyOn(service as any, 'request')
          .mockReturnValueOnce(issueNewStakerPDAResponse);
        jest
          .spyOn(service as any, 'getUpdateStakerPdaGQL')
          .mockReturnValue('mutationCreatePDA');
        await service.updateIssuedStakerPDAs(updateActions);
        expect(service['request']).toHaveBeenCalledWith('mutationCreatePDA', {
          pda_id: 'id',
          claim: {
            point: 10,
          },
        });
      });
    });
  });
});
