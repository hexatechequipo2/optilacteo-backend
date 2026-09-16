import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('InternalApiKeyGuard — autenticación servicio a servicio con API key', () => {
  let guard: InternalApiKeyGuard;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (headers: Record<string, string | undefined>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as unknown as ExecutionContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalApiKeyGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<InternalApiKeyGuard>(InternalApiKeyGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  it('cuando NEST_INTERNAL_API_KEY no está configurada en el servidor, debe lanzar UnauthorizedException', () => {
    mockConfigService.get.mockReturnValue(undefined);
    const context = createMockExecutionContext({
      'x-internal-api-key': 'secret-key',
    });

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException(
        'NEST_INTERNAL_API_KEY no está configurada en el servidor',
      ),
    );
    expect(configService.get).toHaveBeenCalledWith('NEST_INTERNAL_API_KEY');
  });

  it('cuando la API key enviada en los headers no coincide o está ausente, debe lanzar UnauthorizedException', () => {
    const expectedKey = 'secret-key-2026';
    mockConfigService.get.mockReturnValue(expectedKey);

    const contextInvalid = createMockExecutionContext({
      'x-internal-api-key': 'key-incorrecta',
    });
    const contextMissing = createMockExecutionContext({});

    expect(() => guard.canActivate(contextInvalid)).toThrow(
      new UnauthorizedException('API key interna inválida'),
    );
    expect(() => guard.canActivate(contextMissing)).toThrow(
      new UnauthorizedException('API key interna inválida'),
    );
  });

  it('cuando la API key enviada en el header coincide con la configurada, debe retornar true', () => {
    const expectedKey = 'secret-key-2026';
    mockConfigService.get.mockReturnValue(expectedKey);

    const context = createMockExecutionContext({
      'x-internal-api-key': expectedKey,
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('NEST_INTERNAL_API_KEY');
  });
});