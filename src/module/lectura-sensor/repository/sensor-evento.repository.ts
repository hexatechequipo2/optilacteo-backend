import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorEvento } from '../entities/sensor-evento.entity';
import { ISensorEventoRepository } from './sensor-evento.repository.interface';

@Injectable()
export class SensorEventoRepository implements ISensorEventoRepository {
  constructor(
    @InjectRepository(SensorEvento)
    private readonly repo: Repository<SensorEvento>,
  ) {}

  create(evento: SensorEvento): Promise<SensorEvento> {
    return this.repo.save(evento);
  }
}
