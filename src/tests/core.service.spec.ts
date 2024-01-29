import { Test, TestingModule } from '@nestjs/testing';
import { result } from 'lodash';
import { async } from 'rxjs';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { WinstonProvider } from '@common/winston/winston.provider';
import { CorePDAsUpcomingActions } from '../core.interface';
import { PoktScanOutput } from '../poktscan/interfaces/pokt-scan.interface';
import { IssuedStakerPDA } from 'src/pda/interfaces/pda.interface';
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
  let poktScanRetriever: PoktScanRetriever;
  let pdaService: PDAService;

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
    poktScanRetriever = module.get<PoktScanRetriever>(PoktScanRetriever);
    pdaService = module.get<PDAService>(PDAService);

    jest.clearAllMocks();
  });
  test('Should be defined', () => {
    expect(coreService).toBeDefined();
  });

  describe('setCustodianActions', () => {
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
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'custodian',
              serviceDomain: 'example.comGATEWAY_ID=gatewayID',
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
      ];
      stakedNodesData = {
        custodian: {
          'example.comGATEWAY_ID=gatewayID': [
            {
              domain: 'example.comGATEWAY_ID=gatewayID',
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
          ],
        },
        non_custodian: {},
      };
    });

    test('Should be defined', () => {
      expect(coreService['setCustodianActions']).toBeDefined();
    });
    // Should update PDA with point 0 when PDA suits with no condition
    test('Should update PDA with point 0 when PDA suits with no service domain', async () => {
      stakedNodesData = {
        custodian: {
          'some domain which is different with PDA service domain ': [
            {
              domain: 'example.comGATEWAY_ID=gatewayID',
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
          ],
        },
        non_custodian: {},
      };
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
        actions,
      );
      expect(actions.update).toEqual([
        {
          pda_id: 'pda_id',
          point: 0,
          wallets: [],
        },
      ]);
    });

    // Should I check other false condirions??!

    test('Should updated PDA with correct parameters when PDA already exists', async () => {
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
        actions,
      );
      expect(actions.update).toEqual([
        {
          pda_id: 'pda_id',
          point: 1000,
          wallets: [{ address: 'wallet_address', amount: 1000 }],
        },
      ]);
    });
    test('Should add PDA with correct parameters when PDA is new', async () => {
      validStakersPDAs = [];
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
        actions,
      );
      expect(actions.add).toEqual([
        {
          point: 1000,
          node_type: 'custodian',
          pda_sub_type: 'Validator',
          owner: 'gatewayID',
          serviceDomain: 'example.comGATEWAY_ID=gatewayID',
          wallets: [{ address: 'wallet_address', amount: 1000 }],
        },
      ]);
    });
    test('Should sum staked amount and add all wallets correctly for custodian', async () => {
      stakedNodesData = {
        custodian: {
          'example.comGATEWAY_ID=gatewayID': [
            {
              domain: 'example1.com',
              staked_amount: 1000,
              wallet_address: 'wallet_address1',
            },
            {
              domain: 'example2.com',
              staked_amount: 2000,
              wallet_address: 'wallet_address2',
            },
          ],
        },
        non_custodian: {},
      };
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
        actions,
      );
      expect(actions.update).toEqual([
        {
          pda_id: 'pda_id',
          point: 3000,
          wallets: [
            { address: 'wallet_address1', amount: 1000 },
            { address: 'wallet_address2', amount: 2000 },
          ],
        },
      ]);
    });
    test('Should call getGatewayIDFromDomain method with correct parameter', async () => {
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
        actions,
      );
      expect(dnsResolver['getGatewayIDFromDomain']).toHaveBeenCalledWith(
        'example.comGATEWAY_ID=gatewayID',
      );
      expect(dnsResolver['getGatewayIDFromDomain']).toHaveBeenCalledTimes(2);
    });
    // as last test
    test('Should update PDA with point 0 when GATEWAY_ID is not defined', async () => {
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockReturnValue(false);
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
        actions,
      );
      expect(actions.update).toEqual([
        {
          pda_id: 'pda_id',
          point: 0,
          wallets: [],
        },
      ]);
    });
  });
});
