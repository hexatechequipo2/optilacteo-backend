import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLectura } from '../entities/sensor-lectura.entity';
import { ISensorLecturaRepository } from './sensor-lectura.repository.interface';

@Injectable()
export class SensorLecturaRepository implements ISensorLecturaRepository {
  constructor(
    @InjectRepository(SensorLectura)
    private readonly repo: Repository<SensorLectura>,
  ) {}

  create(lectura: SensorLectura): Promise<SensorLectura> {
    return this.repo.save(lectura);
  }
}
