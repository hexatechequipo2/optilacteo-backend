import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlcConfig } from '../entities/plc-config.entity';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { TipoSensor } from '../../sensor/enums/tipo-sensor.enum';
import type { IPlcConfigRepository } from './plc-config-repository.interface';

@Injectable()
export class PlcConfigRepository implements IPlcConfigRepository {
  constructor(
    @InjectRepository(PlcConfig)
    private readonly repo: Repository<PlcConfig>,

    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
  ) {}

  async findByEmpresa(empresaId: number): Promise<PlcConfig | null> {
    return this.repo.findOne({ where: { empresaId } });
  }

  async create(entity: PlcConfig): Promise<PlcConfig> {
    return this.repo.save(this.repo.create(entity));
  }

  async save(entity: PlcConfig): Promise<PlcConfig> {
    return this.repo.save(entity);
  }

  async existsSensorDigitalOAnalogico(empresaId: number): Promise<boolean> {
    const count = await this.sensorRepo.count({
      where: [
        { empresaId, tipo: TipoSensor.DIGITAL },
        { empresaId, tipo: TipoSensor.ANALOGICO },
      ],
    });
    return count > 0;
  }
}
