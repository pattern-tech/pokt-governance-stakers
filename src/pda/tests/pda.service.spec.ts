import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import {
  IssuedPDA,
  IssuedPDACountResponse,
  IssuedPDAsResponse,
  IssuedStakerPDA,
} from '../interfaces/pda.interface';
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
    test("Should return pagination when max's value less or equal that 15", () => {
      // Assert
      expect(service['pagination'](99)).toEqual([{ take: 99, skip: 0 }]);
      expect(service['pagination'](100)).toEqual([{ take: 100, skip: 0 }]);
    });

    test("Should return pagination when max's value greater that 15", () => {
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

    // beforeEach(() => {
    //   issuedPDACountResponse = {
    //     data: { issuedPDAsCount: 1 },
    //   };
    //   PDAResponse = {
    //     data: {
    //       issuedPDAs: [
    //         {
    //           id: 'Id',
    //           status: 'Valid',
    //           dataAsset: {
    //             claim: {
    //               point: 4,
    //               pdaType: 'staker',
    //               pdaSubtype: 'Gateway',
    //               type: 'custodian',
    //             },
    //             owner: {
    //               gatewayId: 'gatewayID',
    //             },
    //           },
    //         },
    //       ],
    //     },
    //   };
    //   jest
    //     .spyOn(service as any, 'request')
    //     .mockReturnValueOnce(issuedPDACountResponse);
    //   jest.spyOn(service as any, 'request').mockReturnValueOnce(PDAResponse);
    // });
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
      issuedPDACountResponse = {
        data: { issuedPDAsCount: 1 },
      };
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

    test('Should store related PDAs', async () => {
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
          },
          owner: {
            gatewayId: 'gatewayID',
          },
        },
      };
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
  });
});
