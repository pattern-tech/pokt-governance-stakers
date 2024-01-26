import { Test, TestingModule } from '@nestjs/testing';
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

    test('Should not add or update when resolvedGatewayID === false', async () => {
      expect(
        await coreService['getPDAsUpcomingActions'](
          stakedNodesData,
          validStakersPDAs,
        ),
      ).toEqual(actions);
    });

    test('Should not update actions when getGatewayIDFromDomain === false', async () => {
      const result = await coreService['getPDAsUpcomingActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(result).toEqual(actions);
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

    test('Should add PDA when PDA is new', async () => {
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
              pdaSubtype: 'Validator',
              type: 'custodian',
            },
            owner: {
              gatewayId: 'gatewayid',
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
      expect(actions.add[0].owner_gateway_id).toEqual('gatewayID');
    });

    test('Should update when PDA exists', async () => {
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
      expect(actions.update[0].pda_id).toEqual('pda_id');
      expect(actions.update[0].point).toEqual(1000);
    });

    test('Should store related data correctly', async () => {
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockImplementationOnce(() => {
          return 'gatewayID';
        });
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockImplementationOnce(() => {
          return 'gatewayid';
        });
      stakedNodesData = {
        custodian: [
          {
            domain: 'domainGATEWAY_ID=gatewayID',
            staked_amount: 1000,
          },
          {
            domain: 'domainGATEWAY_ID=gatewayid',
            staked_amount: 5000,
          },
        ],
        non_custodian: [],
      };

      actions = await coreService['getPDAsUpcomingActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      console.log(actions);
      expect(actions.update.length).toBeGreaterThan(0);
      expect(actions.update[0].point).toEqual(1000);
      expect(actions.update[0].pda_id).toEqual('pda_id');
      expect(actions.add.length).toBeGreaterThan(0);
      expect(actions.add[0].node_type).toEqual('custodian');
      expect(actions.add[0].point).toEqual(5000);
      expect(actions.add[0].owner_gateway_id).toEqual('gatewayid');
      expect(actions.add[0].pda_sub_type).toEqual('Validator');
    });
  });
});
