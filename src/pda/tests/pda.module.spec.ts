import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { PDAModule } from '../pda.module';
import { PDAService } from '../pda.service';

jest.mock('../pda.service');

describe('PDAModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [HttpModule, PDAModule],
    }).compile();
  });

  test('should be defined', () => {
    // Assert
    expect(module).toBeDefined();
  });

  test('should provide PDAService', () => {
    // Arrange
    const pdaService = module.get<PDAService>(PDAService);
    // Assert
    expect(pdaService).toBeDefined();
    expect(pdaService['getIssueStakerPdaGQL']()).toBe('mockedValue');
  });
});
