import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  IssueNewStakerPDAResponse,
  IssuedCitizenAndStakerPDA,
  IssuedPDACountResponse,
  IssuedPDAsResponse,
  IssuedStakerPDA,
  UpdateStakerPDAVariables,
  UserAuthenticationsResponse,
  UserAuthenticationsVariables,
} from '../interfaces/pda.interface';
import { CoreAddAction, CoreUpdateAction } from 'src/core.interface';
import { PDAService } from '../pda.service';
import { PDAQueue } from '../pda.queue';

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

// Mock the the Queue
jest.mock('@common/utils/queue.util');

// Describe the test suite for the PDAService
describe('PDAService', () => {
  let service: PDAService;
  let axios: HttpService;
  let config: ConfigService;
  let logger: WinstonProvider;
  let queue: PDAQueue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      providers: [PDAService, WinstonProvider, PDAQueue],
    }).compile();
    service = module.get<PDAService>(PDAService);
    axios = module.get<HttpService>(HttpService);
    config = module.get<ConfigService>(ConfigService);
    logger = module.get<WinstonProvider>(WinstonProvider);
    queue = new PDAQueue();
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
    test('Should call debug from logger with the correct parameters', () => {
      expect(logger.debug).toHaveBeenCalledWith(
        'request method\n' +
          `input => ${JSON.stringify({ query, variables })}\n`,
        PDAService.name,
      );
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
      // Assert
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
    test('Should call debug from logger with the correct parameters for the second call', () => {
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        `response => ${JSON.stringify({
          status: 200,
          body: {},
        })}\n`,
        PDAService.name,
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
      // Assert
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

    beforeAll(() => {
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
    test('Should handle the case when max is 0', () => {
      // Assert
      expect(service['pagination'](0)).toEqual([{ take: 0, skip: 0 }]);
    });
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

  describe('getIssuedCitizenAndStakerPDAs', () => {
    let issuedPDACountResponse: IssuedPDACountResponse;
    let returnValue: Array<IssuedCitizenAndStakerPDA>;
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
      jest.spyOn(service as any, 'getIssuedPDACountGQL').mockReturnValue('');
      jest.spyOn(service as any, 'getIssuedPDAsGQL').mockReturnValue('');
      jest.spyOn(config, 'get').mockReturnValue('POKT_ORG_GATEWAY_ID');
    });
    test('Should be defined', () => {
      // Assert
      expect(service.getIssuedCitizenAndStakerPDAs).toBeDefined();
    });
    test('Should call getIssuedPDACountGQL & getIssuedPDAsGQL', async () => {
      // Arrange
      jest.spyOn(service as any, 'getIssuedPDACountGQL').mockReturnValue('');
      jest.spyOn(service as any, 'getIssuedPDAsGQL').mockReturnValue('');
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
      // Act
      await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(service['getIssuedPDACountGQL']).toHaveBeenCalledTimes(1);
      expect(service['getIssuedPDAsGQL']).toHaveBeenCalledTimes(1);
    });
    test('Should call get method from config', async () => {
      // Assert
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      await service.getIssuedCitizenAndStakerPDAs();
      expect(config.get).toHaveBeenCalledWith('POKT_ORG_GATEWAY_ID');
    });
    test('Should throw Error when countResponse.data === null', async () => {
      // Arrange
      issuedPDACountResponse = {
        data: null,
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      try {
        // Act
        await service.getIssuedCitizenAndStakerPDAs();
        // to check the case if countResponse.data === null and Error does not run
        throw new Error('Test failed');
      } catch (err) {
        // Assert
        expect(err.message).toBe('Does not have any valid organization');
      }
    });
    test('Should return an empty array when issuedPDAsCount is 0', async () => {
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
      // Act
      returnValue = await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(returnValue).toEqual([]);
    });
    test('Should not add PDA if status is not Valid', async () => {
      // Arrange
      const citizenPDA: IssuedCitizenAndStakerPDA = {
          id: 'pda_id2',
          status: 'Suspended',
          dataAsset: {
            claim: {
              point: 1,
              pdaType: 'citizen',
              pdaSubtype: 'POKT DAO',
            },
            owner: {
              gatewayId: 'gatewayID2',
            },
          },
        },
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
              citizenPDA,
            ],
          },
        };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      // Act
      returnValue = await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(returnValue).toEqual([]);
    });
    test('Should store related PDAs', async () => {
      // Arrange
      const citizenPDA: IssuedCitizenAndStakerPDA = {
          id: 'pda_id2',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 1,
              pdaType: 'citizen',
              pdaSubtype: 'POKT DAO',
            },
            owner: {
              gatewayId: 'gatewayID2',
            },
          },
        },
        PDAResponse = {
          data: {
            issuedPDAs: [PDA, citizenPDA],
          },
        };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      // Act
      returnValue = await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(returnValue).toEqual([PDA, citizenPDA]);
    });
    test('Should call request method two times for each PDA with correct parameters', async () => {
      // Arrange
      PDAResponse = {
        data: {
          issuedPDAs: [PDA],
        },
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      // act
      await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(service['request']).toHaveBeenCalledWith('', {
        org_gateway_id: 'POKT_ORG_GATEWAY_ID',
      });
      expect(service['request']).toHaveBeenCalledWith('', {
        org_gateway_id: 'POKT_ORG_GATEWAY_ID',
        skip: 0,
        take: 1,
      });
      expect(service['request']).toHaveBeenCalledTimes(2);
    });
    test('Should check all PDAs and collect correct ones', async () => {
      // Arrange
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
      // Act
      await service.getIssuedCitizenAndStakerPDAs();
      // Rearrange
      jest
        .spyOn(service as any, 'request')
        .mockReturnValueOnce(issuedPDACountResponse);
      jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
      //React
      returnValue = await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(returnValue).toEqual([PDA]);
      expect(service['request']).toHaveBeenCalledTimes(4);
    });
  });

  describe('getIssueStakerPdaGQL', () => {
    test('Should be defined', () => {
      // Assert
      expect(service['getIssueStakerPdaGQL']).toBeDefined();
    });
    test('Should return getIssueStakerPda graphQL query', () => {
      // Assert
      expect(service['getIssueStakerPdaGQL']()).toBe(
        `
    mutation CreatePDA(
      $org_gateway_id: String!
      $data_model_id: String!
      $owner: String!
      $owner_type: UserIdentifierType!
      $image: String!
      $claim: JSON!
    ) {
      createPDA(
          input: {
              dataModelId: $data_model_id
              title: "Pocket Network Staker"
              description: "Servicer or Validator Path"
              owner: { type: $owner_type, value: $owner }
              image: $image
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
    let addActions: CoreAddAction;
    let issueNewStakerPDAResponse: IssueNewStakerPDAResponse;
    beforeEach(() => {
      issueNewStakerPDAResponse = {
        data: {
          createPDA: {
            id: 'id',
          },
        },
      };
      addActions = {
        point: 1,
        image: '',
        pda_sub_type: 'Gateway',
        node_type: 'custodian',
        owner: 'owner',
        serviceDomain: 'example.com',
        wallets: [
          {
            address: '',
            amount: 1,
          },
        ],
      };
      jest
        .spyOn(service as any, 'request')
        .mockReturnValue(issueNewStakerPDAResponse);
      jest.spyOn(config, 'get').mockReturnValue('');
      jest
        .spyOn(service as any, 'getIssueStakerPdaGQL')
        .mockReturnValue('mutationCreatePDA');
    });
    test('Should be defined', () => {
      // Assert
      expect(service.issueNewStakerPDA).toBeDefined();
    });
    test('Should call get method from config', async () => {
      // Act
      await service.getIssuedCitizenAndStakerPDAs();
      // Assert
      expect(config.get).toHaveBeenCalledWith('POKT_ORG_GATEWAY_ID');
    });
    test('Should call getIssueStakerPdaGQL method', async () => {
      await service.issueNewStakerPDA(addActions);
      expect(service['getIssueStakerPdaGQL']).toHaveBeenCalled();
    });

    test(`Should set 'owner_type' ='POKT' and ignore 'serviceDomain' when 'node_type' = 'non-custodian' 
and call method request with correct parameters`, async () => {
      // Arrange
      addActions = {
        point: 1,
        image: '',
        pda_sub_type: 'Gateway',
        node_type: 'non-custodian',
        owner: 'owner',
        wallets: [
          {
            address: '',
            amount: 1,
          },
        ],
      };
      // Act
      await service.issueNewStakerPDA(addActions);
      // Assert
      expect(service['request']).toHaveBeenCalledWith('mutationCreatePDA', {
        data_model_id: '',
        image: '',
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
    test(`Should set 'owner_type' = 'GATEWAY_ID' and set related 'serviceDomain' when 'node_type' = 'custodian' 
and call method request with correct parameters`, async () => {
      // Act
      await service.issueNewStakerPDA(addActions);
      // Assert
      expect(service['request']).toHaveBeenCalledWith('mutationCreatePDA', {
        data_model_id: '',
        image: '',
        org_gateway_id: '',
        owner: 'owner',
        owner_type: 'GATEWAY_ID',
        claim: {
          pdaSubtype: 'Gateway',
          pdaType: 'staker',
          type: 'custodian',
          point: 1,
          serviceDomain: 'example.com',
          wallets: [
            {
              address: '',
              amount: 1,
            },
          ],
        },
      });
    });
  });
  describe('getUpdateStakerPdaGQL', () => {
    test('Should be defined', () => {
      // Assert
      expect(service['getUpdateStakerPdaGQL']).toBeDefined();
    });
    test('Should return getUpdateStakerPda graphQL query', () => {
      // Assert
      expect(service['getUpdateStakerPdaGQL']()).toBe(
        `
    mutation updatePDA($PDA_id: String!, $claim: JSON!) {
      updatePDA(input: { id: $PDA_id, claim: $claim }) {
          id
      }
    }`,
      );
    });
  });

  describe('updateIssuedStakerPDAs', () => {
    let updateActions: CoreUpdateAction;
    let updateStakerPDAVariables: UpdateStakerPDAVariables;
    beforeEach(() => {
      updateStakerPDAVariables = {
        PDA_id: 'id',
        claim: {
          point: 3,
          pdaType: 'staker',
          pdaSubtype: 'Validator',
          type: 'non-custodian',
          serviceDomain: 'example.com',
          wallets: [
            {
              address: 'address',
              amount: 100,
            },
          ],
        },
      };
      updateActions = {
        pda_id: 'id',
        point: 10,
        wallets: [
          {
            address: 'address',
            amount: 100,
          },
        ],
      };
      jest
        .spyOn(service as any, 'getUpdateStakerPdaGQL')
        .mockReturnValue('mutationUpdatePDA');
      jest
        .spyOn(service as any, 'request')
        .mockReturnValue(updateStakerPDAVariables);
    });
    test('Should be defined', () => {
      // Assert
      expect(service.updateIssuedStakerPDA).toBeDefined();
    });
    test('Should call getUpdateStakerPdaGQL method', async () => {
      // Act
      await service.updateIssuedStakerPDA(updateActions);
      expect(service['getUpdateStakerPdaGQL']).toHaveBeenCalledTimes(1);
    });
    test('Should update staker PDAs', async () => {
      // Act
      await service.updateIssuedStakerPDA(updateActions);
      // Assert;
      expect(service['request']).toHaveBeenCalledTimes(1);
    });
    test('Should call method request with correct parameters', async () => {
      // Act
      await service.updateIssuedStakerPDA(updateActions);
      // Assert
      expect(service['request']).toHaveBeenCalledWith('mutationUpdatePDA', {
        PDA_id: 'id',
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
    test('Should call request method with correct parameters when wallet is not defined', async () => {
      // Arrange
      updateActions = {
        pda_id: 'id',
        point: 10,
      };
      // Act
      await service.updateIssuedStakerPDA(updateActions);
      // Assert
      expect(service['request']).toHaveBeenCalledWith('mutationUpdatePDA', {
        PDA_id: 'id',
        claim: {
          point: 10,
        },
      });
    });
  });

  describe('getUserAuthenticationsGQL', () => {
    test('Should be defined', () => {
      // Assert
      expect(service['getUserAuthenticationsGQL']).toBeDefined();
    });
    test('Should return getUpdateStakerPda graphQL query', () => {
      // Assert
      expect(service['getUserAuthenticationsGQL']()).toBe(`
    query UserAuthentications($user_GID: String!) {
      userAuthentications(user: { type: GATEWAY_ID, value: $user_GID }) {
        address
        chain
      }
    }`);
    });
  });

  describe('getUserAuthentications', () => {
    const user_GID: string = 'mockUser';
    const variables: UserAuthenticationsVariables = { user_GID };
    let userAuthenticationsVariables: UserAuthenticationsVariables;
    beforeEach(() => {
      jest
        .spyOn(service as any, 'getUserAuthenticationsGQL')
        .mockReturnValue('');
      jest
        .spyOn(service as any, 'request')
        .mockReturnValue(userAuthenticationsVariables);
    });
    test('Should call getUserAuthenticationsGQL method', async () => {
      // Act
      await service['getUserAuthentications'](user_GID);
      // Assert
      expect(service['getUserAuthenticationsGQL']).toHaveBeenCalled();
    });
    test('Should call request method with the correct parameters', async () => {
      // Act
      await service['getUserAuthentications'](user_GID);
      // Assert
      expect(service['request']).toHaveBeenCalledWith('', variables);
    });
  });

  describe('getUserEVMWallets', () => {
    const user_GID: string = 'mockUser';
    const authreturnValue: UserAuthenticationsResponse = {
      data: {
        userAuthentications: [
          {
            address: '0x97d07b09537088985d5ec3b5ba654e505244b99f',
            chain: 'EVM',
          },
          {
            address: 'example@gmail.com',
            chain: null,
          },
        ],
      },
    };
    beforeEach(() => {
      jest
        .spyOn(service as any, 'getUserAuthentications')
        .mockResolvedValue(authreturnValue);
    });
    test('Should call getUserAuthentications method with correct parameter', async () => {
      await service.getUserEVMWallets(user_GID);
      expect(service['getUserAuthentications']).toHaveBeenCalledWith(user_GID);
    });
    test('Should store related EVM address', async () => {
      expect(await service.getUserEVMWallets(user_GID)).toEqual([
        '0x97d07b09537088985d5ec3b5ba654e505244b99f',
      ]);
    });
    test('Should not store address when chain is not equal with "EVM"', async () => {
      // Arrange
      const authreturnValue = {
        data: {
          userAuthentications: [
            {
              address: '0x97d07b09537088985d5ec3b5ba654e505244b99f',
              chain: 'someChain',
            },
            {
              address: '0x97d07bwlefwmcpwir23423m3cr21qcr23424cc23',
              chain: 'someOtherChain',
            },
          ],
        },
      };
      jest
        .spyOn(service as any, 'getUserAuthentications')
        .mockResolvedValue(authreturnValue);
      // Assert
      expect(await service.getUserEVMWallets(user_GID)).toEqual([]);
    });
  });

  describe('jobListener', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'issueNewStakerPDA').mockReturnValue({});
      jest.spyOn(service as any, 'updateIssuedStakerPDA').mockReturnValue({});
      jest.spyOn(queue, 'popJobs').mockReturnValue([
        {
          action: 'add',
          payload: {
            image: '',
            point: 1,
            pda_sub_type: 'Validator',
            node_type: 'custodian',
            owner: '',
          },
        },
        {
          action: 'update',
          payload: {
            pda_id: '',
            point: 1,
          },
        },
      ]);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
    test('should call issueNewStakerPDA for "add" action', async () => {
      // Arrange
      jest.useFakeTimers();
      const latency = 1000;
      const chuckSize = 10;
      const intervalIdPromise = service.jobListener(latency, chuckSize);
      const intervalId = await intervalIdPromise;
      jest.advanceTimersByTime(latency);
      //Assert
      expect(service.issueNewStakerPDA).toHaveBeenCalledWith({
        image: '',
        point: 1,
        pda_sub_type: 'Validator',
        node_type: 'custodian',
        owner: '',
      });
      clearInterval(intervalId);
    });
    test('should call issueNewStakerPDA for "update" action', async () => {
      // Arrange
      jest.useFakeTimers();
      const latency = 1000;
      const chuckSize = 10;
      const intervalIdPromise = service.jobListener(latency, chuckSize);
      const intervalId = await intervalIdPromise;
      jest.advanceTimersByTime(latency);
      // Assert
      expect(service.updateIssuedStakerPDA).toHaveBeenCalledWith({
        pda_id: '',
        point: 1,
      });
      clearInterval(intervalId);
    });
    test('Should call all method from Promise whrn promises.length > 0 with correct parameters', async () => {
      // Arrange
      jest.useFakeTimers();
      jest.spyOn(Promise, 'all').mockResolvedValue;
      const latency = 1000;
      const chuckSize = 10;
      const intervalIdPromise = service.jobListener(latency, chuckSize);
      const intervalId = await intervalIdPromise;
      jest.advanceTimersByTime(latency);
      // Assert
      expect(Promise.all).toHaveBeenCalledWith([{}, {}]);
      clearInterval(intervalId);
    });
  });

  describe('stopJobListener', () => {
    test('Should be defined', async () => {
      // Assert
      expect(service.stopJobListener).toBeDefined();
    });
    test('Should call clearInterval method with the correct parameter', async () => {
      // Arrange
      const listenerID: any = 12;
      jest.spyOn(global, 'clearInterval').mockReturnValue;
      await service.stopJobListener(listenerID);
      // Assert
      expect(clearInterval).toHaveBeenCalledWith(listenerID);
    });
  });
});
