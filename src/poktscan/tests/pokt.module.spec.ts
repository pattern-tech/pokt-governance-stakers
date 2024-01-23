import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { PoktModule } from '../pokt.module';
import { PoktScanRetriever } from '../pokt.retriever';

jest.mock('../pokt.retriever');

describe('poktService', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [HttpModule, PoktModule],
    }).compile();
  });

  test('should be defined', () => {
    // Assert
    expect(module).toBeDefined();
  });

  test('should provide poktService', () => {
    // Arrange
    const poktService = module.get<PoktScanRetriever>(PoktScanRetriever);
    // Assert
    expect(poktService).toBeDefined();
    expect(poktService['getPoktNodeGQL']()).toBe('mockedValue');
  });
});
