import { Test, TestingModule } from '@nestjs/testing';
import { async } from 'rxjs';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CorePDAsUpcomingActions } from 'src/core.interface';
import { IssuedStakerPDA } from 'src/pda/interfaces/pda.interface';
import { PoktScanOutput } from 'src/poktscan/interfaces/pokt-scan.interface';
import { CoreService } from '../core.service';
import { PDAService } from '../pda/pda.service';
import { PoktScanRetriever } from '../poktscan/pokt.retriever';

jest.mock('@common/winston/winston.provider');
jest.mock('../pda/pda.service');
jest.mock('../poktscan/pokt.retriever');
jest.mock('@common/DNS-lookup/dns.resolver');

describe('CoreService', () => {
  let coreService: CoreService;
  let logger: WinstonProvider;
  let dnsResolver: DNSResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoreService,
        PDAService,
        PoktScanRetriever,
        WinstonProvider,
        DNSResolver,
      ],
    }).compile();

    coreService = module.get<CoreService>(CoreService);
    logger = module.get<WinstonProvider>(WinstonProvider);
    dnsResolver = module.get<DNSResolver>(DNSResolver);

    jest.clearAllMocks();
  });
  test('Should be defined', () => {
    expect(coreService).toBeDefined();
  });

  describe('getPDAsUpcomingActions', () => {
    let stakedNodesData: PoktScanOutput;
    let validStakersPDAs: Array<IssuedStakerPDA>;
    let actions: CorePDAsUpcomingActions;
    beforeEach(() => {
      actions = {
        add: [],
        update: [],
      };
      validStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 1000,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'custodian',
            },
            owner: {
              gatewayId: 'gatewayID',
            },
          },
        },
      ];
      stakedNodesData = {
        custodian: [
          {
            domain: 'domainGATEWAY_ID=gatewayID',
            staked_amount: 1000,
          },
        ],
        non_custodian: [],
      };
    });
    test('Should be defined', () => {
      expect(coreService).toBeDefined();
    });

    test(`Should add PDA to 'update' when PDA.dataAsset.owner.gatewayId === resolvedGatewayID &&
PDA.dataAsset.claim.pdaSubtype === 'Validator`, async () => {
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockImplementation(() => {
          return 'gatewayID';
        });
      actions = await coreService['getPDAsUpcomingActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(actions.update.length).toEqual(1);
      expect(actions.update[0].point).toEqual(1000);
    });

    test(`Should add PDA to 'add' when PDA.dataAsset.owner.gatewayId !== resolvedGatewayID ||
PDA.dataAsset.claim.pdaSubtype !== 'Validator`, async () => {
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockImplementation(() => {
          return 'gatewayID';
        });
      validStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 1000,
              pdaType: 'staker',
              pdaSubtype: 'Gateway',
              type: 'custodian',
            },
            owner: {
              gatewayId: 'gatewayID',
            },
          },
        },
      ];
      actions = await coreService['getPDAsUpcomingActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(actions.add.length).toEqual(1);
      expect(actions.add[0].point).toEqual(1000);
    });

    test('Should not update actions when getGatewayIDFromDomain === false', async () => {
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockImplementation(() => {
          return false;
        });
      const result = await coreService['getPDAsUpcomingActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(result).toEqual(actions);
    });

    //     test('should correctly handle existing PDA', async () => {
    //       jest
    //         .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
    //         .mockImplementation(() => {
    //           return 'gatewayID';
    //         });
    //       const result = await coreService['getPDAsUpcomingActions'](
    //         stakedNodesData,
    //         validStakersPDAs,
    //       );
    //       expect(result.add).toHaveLength(1);
    //       expect(result.add[0].point).toEqual(1000);
    //       expect(result.add[0].node_type).toEqual('custodian');
    //       expect(result.add[0].pda_sub_type).toEqual('Validator');
    //       expect(result.add[0].owner_gateway_id).toEqual('id');
    // });
  });
});
