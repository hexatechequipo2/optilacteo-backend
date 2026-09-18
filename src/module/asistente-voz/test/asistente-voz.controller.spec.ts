import { Test, TestingModule } from '@nestjs/testing';
import { AsistenteVozController } from '../asistente-voz.controller';
import { AsistenteVozService } from '../asistente-voz.service';
import { ParsearDictadoDto } from '../dto/parsear-dictado.dto';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ROLES } from '../../rol/constants/roles.constants';

describe('AsistenteVozController — endpoint de interpretación de dictado por voz (HU-XX)', () => {
  let controller: AsistenteVozController;
  let service: AsistenteVozService;

  const mockAsistenteVozService = {
    parsearDictado: jest.fn(),
  };

  const mockTenantContext: TenantContext = {
    empresaId: 1,
    rolNombre: ROLES.OPERARIO_LINEA as any,
  };

  const mockDto: ParsearDictadoDto = {
    textoDictado: 'pH de cuatro punto cinco y temperatura de doce grados',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsistenteVozController],
      providers: [
        {
          provide: AsistenteVozService,
          useValue: mockAsistenteVozService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AsistenteVozController>(AsistenteVozController);
    service = module.get<AsistenteVozService>(AsistenteVozService);
  });

  afterEach(() => jest.clearAllMocks());

  it('cuando el usuario envía una solicitud de parseo válida, el controlador debe delegar al servicio convirtiendo el id a number', async () => {
    // Arrange
    const loteIdString = '10';
    const loteIdNumber = 10;
    const mockResultadoParseo = {
      ph: 4.5,
      temperatura: 12,
    };

    mockAsistenteVozService.parsearDictado.mockResolvedValue(mockResultadoParseo);

    // Act
    const resultado = await controller.parsear(loteIdString, mockDto, mockTenantContext);

    // Assert
    expect(service.parsearDictado).toHaveBeenCalledWith(
      loteIdNumber,
      mockDto,
      mockTenantContext,
    );
    expect(resultado).toEqual(mockResultadoParseo);
  });

  it('cuando el servicio arroja un error durante el parseo, el controlador debe propagar la excepción', async () => {
    // Arrange
    const loteIdString = '5';
    mockAsistenteVozService.parsearDictado.mockRejectedValue(
      new Error('No se pudo interpretar el dictado'),
    );

    // Act & Assert
    await expect(
      controller.parsear(loteIdString, mockDto, mockTenantContext),
    ).rejects.toThrow('No se pudo interpretar el dictado');
  });
});