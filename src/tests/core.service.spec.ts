import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DNSResolver } from '@common/DNS-lookup/dns.resolver';
import { WinstonProvider } from '@common/winston/winston.provider';
import {
  IssuedCitizenAndStakerPDA,
  IssuedStakerPDA,
} from '../pda/interfaces/pda.interface';
import { PoktScanOutput } from '../poktscan/interfaces/pokt-scan.interface';
import { CoreService } from '../core.service';
import { PDAService } from '../pda/pda.service';
import { PoktScanRetriever } from '../poktscan/pokt.retriever';
import { WPoktService } from '../wpokt/wpokt.service';
import { PDAQueue } from '../pda/pda.queue';

// Mock the PDAService
jest.mock('../pda/pda.service');

// Mock the WPoktService
jest.mock('../wpokt/wpokt.service');

// Mock the PoktScanRetriever
jest.mock('../poktscan/pokt.retriever');

// Mock the DNSResolver
jest.mock('@common/DNS-lookup/dns.resolver');

// Mock the WinstonProvider
jest.mock('@common/winston/winston.provider');

// Mock the the Queue
jest.mock('@common/utils/queue.util');

// Describe the test suite for the CoreService
describe('CoreService', () => {
  let coreService: CoreService;
  let dnsResolver: DNSResolver;
  let pdaService: PDAService;
  let wpoktService: WPoktService;
  let queue: PDAQueue;
  let logger: WinstonProvider;
  let pokt: PoktScanRetriever;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoreService,
        PoktScanRetriever,
        DNSResolver,
        PDAService,
        WinstonProvider,
        WPoktService,
        PDAQueue,
        PoktScanRetriever,
      ],
      imports: [ConfigModule],
    }).compile();

    coreService = module.get<CoreService>(CoreService);
    dnsResolver = module.get<DNSResolver>(DNSResolver);
    pdaService = module.get<PDAService>(PDAService);
    queue = module.get<PDAQueue>(PDAQueue);
    wpoktService = module.get<WPoktService>(WPoktService);
    logger = module.get<WinstonProvider>(WinstonProvider);
    pokt = module.get<PoktScanRetriever>(PoktScanRetriever);
    config = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });
  test('Should be defined', () => {
    // Assert
    expect(coreService).toBeDefined();
  });

  describe('setCustodianActions', () => {
    let stakedNodesData: PoktScanOutput;
    let validStakersPDAs: Array<IssuedStakerPDA>;
    // let actions: CorePDAsUpcomingActions;

    beforeEach(() => {
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
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
          'example.comPOKT_GATEWAY_ID=gatewayID': [
            {
              domain: 'example.comPOKT_GATEWAY_ID=gatewayID',
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
          ],
        },
        non_custodian: {},
      };

      jest.spyOn(config, 'get').mockReturnValue('');
    });

    test('Should be defined', () => {
      // Assert
      expect(coreService['setCustodianActions']).toBeDefined();
    });
    test('Should call log method from logger with correct parameters', async () => {
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Started set custodian actions',
        CoreService.name,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Started check PDAs custodian',
        CoreService.name,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Completed set custodian actions',
        CoreService.name,
      );
      expect(logger.log).toHaveBeenCalledTimes(3);
    });
    test('Should call get method from config with the correct parameter', async () => {
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(config.get).toHaveBeenCalledWith('SUPPLY_STAKER_POKT_LOGO_URL');
    });
    test('Should update PDA with point 0 when PDA suits with no service domain', async () => {
      // Arrange
      stakedNodesData = {
        custodian: {
          'some domain which is different with PDA service domain ': [
            {
              domain: 'example.comPOKT_GATEWAY_ID=gatewayID',
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
          ],
        },
        non_custodian: {},
      };
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 0,
        },
      });
    });
    test('Should update PDA with point 0 when PDA suits with no gatewayID', async () => {
      // Arrange
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
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
              wallets: [
                {
                  address: 'address',
                  amount: 1,
                },
              ],
            },
            owner: {
              gatewayId: 'someOtherID',
            },
          },
        },
      ];
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 0,
        },
      });
    });
    test('Should update PDA with point 0 when pdaSubtype is not "Validator"', async () => {
      // Arrange
      validStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Gateway',
              type: 'custodian',
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 0,
        },
      });
    });
    test('Should updated PDA with correct parameters when PDA already exists', async () => {
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 1000,
        },
      });
    });
    test('Should add PDA with correct parameters when PDA is new', async () => {
      // Arrange
      validStakersPDAs = [];
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'add',
        payload: {
          image: '',
          point: 1000,
          node_type: 'custodian',
          pda_sub_type: 'Validator',
          owner: 'gatewayID',
          serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
        },
      });
    });
    test('Should sum staked amount and add all wallets correctly for custodian', async () => {
      // Arrange
      stakedNodesData = {
        custodian: {
          'example.comPOKT_GATEWAY_ID=gatewayID': [
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
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 3000,
        },
      });
    });
    test('Should call getGatewayIDFromDomain method with correct parameter', async () => {
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(dnsResolver['getGatewayIDFromDomain']).toHaveBeenCalledWith(
        'example.comPOKT_GATEWAY_ID=gatewayID',
      );
      expect(dnsResolver['getGatewayIDFromDomain']).toHaveBeenCalledTimes(2);
    });
    test('Should update PDA with point 0 when POKT_GATEWAY_ID is not defined', async () => {
      // Arrange
      jest
        .spyOn(dnsResolver as any, 'getGatewayIDFromDomain')
        .mockReturnValue(false);
      // Act
      await coreService['setCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 0,
        },
      });
    });
  });

  describe('setNonCustodianActions', () => {
    let stakedNodesData: PoktScanOutput;
    let validStakersPDAs: Array<IssuedStakerPDA>;

    beforeEach(() => {
      validStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'non-custodian',
              serviceDomain: 'example.com',
              wallets: [
                {
                  address: 'example.com',
                  amount: 1000,
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
        custodian: {},
        non_custodian: {
          'example.com': [
            {
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
          ],
        },
      };

      jest.spyOn(config, 'get').mockReturnValue('');
    });
    test('Should be defined', () => {
      // Assert
      expect(coreService['setNonCustodianActions']).toBeDefined();
    });
    test('Should call log method from logger with correct parameters', async () => {
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Started set nonCustodian actions',
        CoreService.name,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Started check PDAs nonCustodian',
        CoreService.name,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Completed set nonCustodian actions',
        CoreService.name,
      );
      expect(logger.log).toHaveBeenCalledTimes(3);
    });
    test('Should call get method from config with the correct parameter', async () => {
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(config.get).toHaveBeenCalledWith('SUPPLY_STAKER_POKT_LOGO_URL');
    });
    test('Should update PDA with correct parameters when PDA already exists', async () => {
      // Act
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 1000,
          wallets: [{ address: 'example.com', amount: 1000 }],
        },
      });
    });
    test('Should update PDA with point 0 when PDA is Invaid', async () => {
      // Arrange
      stakedNodesData = {
        custodian: {},
        non_custodian: {
          'someOtherExample.com': [
            {
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
          ],
        },
      };
      // Act
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 0,
          wallets: [],
        },
      });
    });
    test('Should update PDA with point 0 when address is not equal with "walletAddress"', async () => {
      // Arrange
      validStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'non-custodian',
              serviceDomain: 'example.com',
              wallets: [
                {
                  address: 'someOtherWalletAddress',
                  amount: 1000,
                },
              ],
            },
            owner: {
              gatewayId: 'gatewayID',
            },
          },
        },
      ];
      // Act
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 0,
          wallets: [],
        },
      });
    });
    test('Shouls add PDA when PDA is new and Valid', async () => {
      // Arrange
      validStakersPDAs = [];
      // Act
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'add',
        payload: {
          image: '',
          point: 1000,
          node_type: 'non-custodian',
          pda_sub_type: 'Validator',
          owner: 'example.com',
          wallets: [{ address: 'example.com', amount: 1000 }],
        },
      });
    });
    test('Should sum staked amount and add all wallets correctly for non-custodian', async () => {
      // Arrange
      stakedNodesData = {
        custodian: {},
        non_custodian: {
          'example.com': [
            {
              staked_amount: 1000,
              wallet_address: 'wallet_address',
            },
            {
              staked_amount: 2000,
              wallet_address: 'wallet_address2',
            },
            {
              staked_amount: 3000,
              wallet_address: 'wallet_address3',
            },
          ],
        },
      };
      // Act
      await coreService['setNonCustodianActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      // Assert
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 6000,
          wallets: [{ address: 'example.com', amount: 6000 }],
        },
      });
    });
  });
  describe('getValidatorPDAsUpcomingActions', () => {
    const stakedNodesData: PoktScanOutput = {
      custodian: {},
      non_custodian: {},
    };
    const validStakersPDAs: Array<IssuedStakerPDA> = [];
    test('Should be defined', () => {
      expect(coreService['getValidatorPDAsUpcomingActions']).toBeDefined();
    });
    test('Should call "setCustodianActions" and "setNonCustodianActions" methods with the correct parameters', async () => {
      // Arrange
      jest
        .spyOn(coreService as any, 'setCustodianActions')
        .mockResolvedValue('');
      jest
        .spyOn(coreService as any, 'setNonCustodianActions')
        .mockResolvedValue('');
      // Act
      await coreService['getValidatorPDAsUpcomingActions'](
        stakedNodesData,
        validStakersPDAs,
      );
      expect(coreService['setCustodianActions']).toHaveBeenCalledWith(
        stakedNodesData,
        validStakersPDAs,
      );
      expect(coreService['setNonCustodianActions']).toHaveBeenCalledWith(
        stakedNodesData,
        validStakersPDAs,
      );
    });
  });

  describe('recalculateValidatorPDAs', () => {
    const validStakersPDAs: Array<IssuedStakerPDA> = [];
    test('Should be defined', () => {
      expect(coreService['recalculateValidatorPDAs']).toBeDefined();
    });
    test('Should call retrieve method from poktScanRetriever', async () => {
      // Act
      await coreService['recalculateValidatorPDAs'](validStakersPDAs);
      expect(pokt.retrieve).toHaveBeenCalledTimes(1);
    });
    test('Should call "getValidatorPDAsUpcomingActions" method with correct parameters', async () => {
      // Arrange
      jest
        .spyOn(coreService as any, 'getValidatorPDAsUpcomingActions')
        .mockResolvedValue('');
      // Act
      await coreService['recalculateValidatorPDAs'](validStakersPDAs);
      // Assert
      expect(
        coreService['getValidatorPDAsUpcomingActions'],
      ).toHaveBeenCalledWith(
        { custodian: {}, non_custodian: {} },
        validStakersPDAs,
      );
    });
  });
  describe('getLiquidityProviderPDAsUpcomingActions', () => {
    let validStakersPDAs: Array<IssuedStakerPDA>;
    let GIDsLiquidity: Record<string, number>;
    beforeEach(() => {
      validStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Liquidity Provider',
              type: 'custodian',
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
      jest.spyOn(config, 'get').mockReturnValue('');
      GIDsLiquidity = { gatewayID: 10 };
    });
    test('Should be defined', () => {
      expect(
        coreService['getLiquidityProviderPDAsUpcomingActions'],
      ).toBeDefined();
    });
    test(`Shoiuld call addJob with correct parameters when pdaSubtype is equal to "Liquidity Provider" 
        and PDA point is not equal to gatewayIDLiquidity`, async () => {
      GIDsLiquidity = { gatewayID: 15 };
      await coreService['getLiquidityProviderPDAsUpcomingActions'](
        validStakersPDAs,
        GIDsLiquidity,
      );
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'update',
        payload: {
          pda_id: 'pda_id',
          point: 15,
        },
      });
    });
    test(`Should not call addJob when pdaSubtype is equal to "Liquidity Provider"
        and PDA point is equal to gatewayIDLiquidity`, async () => {
      // Act
      await coreService['getLiquidityProviderPDAsUpcomingActions'](
        validStakersPDAs,
        GIDsLiquidity,
      );
      expect(queue.addJob).not.toHaveBeenCalled();
    });
    test(`Should call addJob with the correct parameters when pdaSubtype is not equal to "Liquidity Provider"
       and gatewayIDLiquidity is greater that 0`, async () => {
      // Arrange
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
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
      // Act
      await coreService['getLiquidityProviderPDAsUpcomingActions'](
        validStakersPDAs,
        GIDsLiquidity,
      );
      expect(queue.addJob).toHaveBeenCalledWith({
        action: 'add',
        payload: {
          image: '',
          owner: 'gatewayID',
          pda_sub_type: 'Liquidity Provider',
          point: 10,
        },
      });
    });
    test('Should not call queue when pdaSubtype is not equal to "Liquidity Provider" and GIDsLiquidity is less that 1', async () => {
      // Arrange
      GIDsLiquidity = { gatewayID: 0 };
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
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
      // Act
      await coreService['getLiquidityProviderPDAsUpcomingActions'](
        validStakersPDAs,
        GIDsLiquidity,
      );
      // Assert
      expect(queue.addJob).not.toHaveBeenCalled();
    });
  });
  describe('recalculateLiquidityProviderPDAs', () => {
    let validCitizenAndStakersPDAs: Array<IssuedCitizenAndStakerPDA>;
    beforeEach(() => {
      validCitizenAndStakersPDAs = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'custodian',
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
        {
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
      ];
      jest
        .spyOn(coreService as any, 'getLiquidityProviderPDAsUpcomingActions')
        .mockResolvedValue('');
    });
    test('Should ne defined', () => {
      //Assert
      expect(coreService['recalculateLiquidityProviderPDAs']).toBeDefined();
    });
    test('Should call getUserEVMWallets method for each PDA with correct parameter', async () => {
      // Act
      await coreService['recalculateLiquidityProviderPDAs'](
        validCitizenAndStakersPDAs,
      );
      // assert
      expect(pdaService.getUserEVMWallets).toHaveBeenCalledTimes(2);
      expect(pdaService.getUserEVMWallets).toHaveBeenCalledWith('gatewayID');
      expect(pdaService.getUserEVMWallets).toHaveBeenCalledWith('gatewayID2');
    });
    test('Should nit call getUserEVMWallets method when there is no validCitizenAndStakersPDAs', async () => {
      // Arrange
      validCitizenAndStakersPDAs = [];
      // Act
      await coreService['recalculateLiquidityProviderPDAs'](
        validCitizenAndStakersPDAs,
      );
      // Assert
      expect(pdaService.getUserEVMWallets).toHaveBeenCalledTimes(0);
    });
    test('Should call getUsersWPoktLiquidity with correct parameter', async () => {
      // Arrange
      jest
        .spyOn(pdaService, 'getUserEVMWallets')
        .mockResolvedValueOnce(['ethWallet1', 'ethWallet2']);
      jest
        .spyOn(pdaService, 'getUserEVMWallets')
        .mockResolvedValueOnce(['ethWallet3', 'ethWallet4']);
      // Act
      await coreService['recalculateLiquidityProviderPDAs'](
        validCitizenAndStakersPDAs,
      );
      // Assert
      expect(wpoktService.getUsersWPoktLiquidity).toHaveBeenCalledWith({
        gatewayID: ['ethWallet1', 'ethWallet2'],
        gatewayID2: ['ethWallet3', 'ethWallet4'],
      });
    });
    test('Should call getLiquidityProviderPDAsUpcomingActions method with correct parameters', async () => {
      // Arrabge
      jest
        .spyOn(wpoktService, 'getUsersWPoktLiquidity')
        .mockResolvedValue({ gatewayID: 1, gatewayID2: 2 });
      // Act
      await coreService['recalculateLiquidityProviderPDAs'](
        validCitizenAndStakersPDAs,
      );
      // Assert
      expect(
        coreService['getLiquidityProviderPDAsUpcomingActions'],
      ).toHaveBeenCalledWith(validCitizenAndStakersPDAs, {
        gatewayID: 1,
        gatewayID2: 2,
      });
    });
  });
  describe('handler', () => {
    test('Should handle the condition when Error occurs', async () => {
      try {
        await coreService.handler();
        // to check the case if Error occurs
        throw new Error('Test failed');
      } catch (err) {
        expect(logger.error).toHaveBeenCalled();
      }
    });
    test('Should call getIssuedCitizenAndStakerPDAs method', async () => {
      // Act
      await coreService.handler();
      // Assert
      expect(pdaService.getIssuedCitizenAndStakerPDAs).toHaveBeenCalled();
    });

    test('Should call recalculateValidatorPDAs method with correct parameter', async () => {
      // Arrange
      jest
        .spyOn(pdaService, 'getIssuedCitizenAndStakerPDAs')
        .mockResolvedValue([
          {
            id: 'pda_id',
            status: 'Valid',
            dataAsset: {
              claim: {
                point: 10,
                pdaType: 'staker',
                pdaSubtype: 'Validator',
                type: 'custodian',
                serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
          {
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
        ]);
      jest
        .spyOn(coreService as any, 'recalculateValidatorPDAs')
        .mockResolvedValue('');
      // Act
      await coreService.handler();
      // Assert
      expect(coreService['recalculateValidatorPDAs']).toHaveBeenCalledWith([
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'custodian',
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
      ]);
    });
    test('Should call recalculateLiquidityProviderPDAs method with correct parameter', async () => {
      // Arrange
      const mockPDAs: any = [
        {
          id: 'pda_id',
          status: 'Valid',
          dataAsset: {
            claim: {
              point: 10,
              pdaType: 'staker',
              pdaSubtype: 'Validator',
              type: 'custodian',
              serviceDomain: 'example.comPOKT_GATEWAY_ID=gatewayID',
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
        {
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
      ];
      jest
        .spyOn(pdaService, 'getIssuedCitizenAndStakerPDAs')
        .mockResolvedValue(mockPDAs);
      jest
        .spyOn(coreService as any, 'recalculateLiquidityProviderPDAs')
        .mockResolvedValue('');
      // Act
      await coreService.handler();
      // Assert
      expect(
        coreService['recalculateLiquidityProviderPDAs'],
      ).toHaveBeenCalledWith(mockPDAs);
    });
    test('Should call log method from logger with correct parameter', async () => {
      // Act
      await coreService.handler();
      // Assert
      expect(logger.log).toHaveBeenCalledWith('Started task', CoreService.name);
      expect(logger.log).toHaveBeenCalledWith(
        'Completed task',
        CoreService.name,
      );
    });
    test('Should call jobListener and stopJobListener methods with correct pat=rameter', async () => {
      // Arrange
      jest.spyOn(pdaService, 'jobListener').mockResolvedValue(1 as any);
      // Act
      await coreService.handler();
      expect(pdaService.jobListener).toHaveBeenCalledWith(2000, 10);
      // Assert
      expect(pdaService.stopJobListener).toHaveBeenCalledWith(1);
    });
    test('Should call reset and wait wethods from pdaQueue', async () => {
      // Act
      await coreService.handler();
      expect(queue.reset).toHaveBeenCalled();
      // Assert
      expect(queue.wait).toHaveBeenCalled();
    });
  });
});
