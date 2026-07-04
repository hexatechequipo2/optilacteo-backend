import { Test, TestingModule } from '@nestjs/testing';
import { PermisoService } from './permiso.service';

describe('PermisoService', () => {
  let service: PermisoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermisoService],
    }).compile();

    service = module.get<PermisoService>(PermisoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
