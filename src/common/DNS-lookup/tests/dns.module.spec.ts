import { Test, TestingModule } from '@nestjs/testing';
import { DNSModule } from '../dns.module';
import { DNSResolver } from '../dns.resolver';

// Mocking the DNSResolver to isolate the module being tested
jest.mock('../dns.resolver');

// Describing the DNSModule test suite
describe('DNSModule', () => {
  // Variables to store the testing module and DNSResolver instance
  let module: TestingModule;
  let resolver: DNSResolver;

  // Setup before each test
  beforeEach(async () => {
    // Creating a testing module with the DNSModule as an import
    module = await Test.createTestingModule({
      imports: [DNSModule],
    }).compile();

    // Getting an instance of DNSResolver from the testing module
    resolver = module.get<DNSResolver>(DNSResolver);
  });

  // Cleanup after each test
  afterEach(async () => {
    // Closing the testing module to release resources
    await module.close();
  });

  // Ensuring the module is defined
  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  // Checking if DNSResolver is provided by the module
  it('should provide DNSResolver', () => {
    expect(resolver).toBeDefined();
  });

  // Checking a method of DNSResolver with a specific input
  it('should have a method that returns something', () => {
    // Expecting the result of the getGatewayIDFromDomain method to be false
    expect(resolver.getGatewayIDFromDomain('example.com')).toEqual(false);
  });
});
