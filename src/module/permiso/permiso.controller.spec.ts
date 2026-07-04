import { Test, TestingModule } from '@nestjs/testing';
import { PermisoController } from './permiso.controller';
import { PermisoService } from './permiso.service';

describe('PermisoController', () => {
  let controller: PermisoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermisoController],
      providers: [PermisoService],
    }).compile();

    controller = module.get<PermisoController>(PermisoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
