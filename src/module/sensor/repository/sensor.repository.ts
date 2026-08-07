import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from '../entities/sensor.entity';
import { SensorFilterQueryDto } from '../dto/sensor-filter-query.dto';
import { ISensorRepository } from './sensor.repository.interface';
import { EstadoSensor } from '../enums/estado-sensor.enum';

@Injectable()
export class SensorRepository implements ISensorRepository {
  constructor(
    @InjectRepository(Sensor)
    private readonly repo: Repository<Sensor>,
  ) {}

  create(sensor: Sensor): Promise<Sensor> {
    return this.repo.save(sensor);
  }

  findAll(filter: SensorFilterQueryDto, empresaId: number): Promise<Sensor[]> {
    const qb = this.repo
      .createQueryBuilder('sensor')
      .where('sensor.empresaId = :empresaId', { empresaId });

    if (filter.nombre) {
      qb.andWhere('sensor.nombre ILIKE :nombre', { nombre: `%${filter.nombre}%` });
    }
    if (filter.marca) {
      qb.andWhere('sensor.marca ILIKE :marca', { marca: `%${filter.marca}%` });
    }
    if (filter.tipo) {
      qb.andWhere('sensor.tipo = :tipo', { tipo: filter.tipo });
    }
    if (filter.parametro) {
      qb.andWhere('sensor.parametro = :parametro', { parametro: filter.parametro });
    }
    if (filter.estado) {
      qb.andWhere('sensor.estado = :estado', { estado: filter.estado });
    }
    if (filter.ubicacion) {
      qb.andWhere('sensor.ubicacion = :ubicacion', { ubicacion: filter.ubicacion });
    }

    return qb.getMany();
  }

  findOne(id: number, empresaId: number): Promise<Sensor | null> {
    return this.repo.findOne({ where: { id, empresaId } });
  }

  findByNombre(nombre: string, empresaId: number): Promise<Sensor | null> {
    return this.repo.findOne({ where: { nombre, empresaId } });
  }

  save(sensor: Sensor): Promise<Sensor> {
    return this.repo.save(sensor);
  }

  async remove(sensor: Sensor): Promise<void> {
    await this.repo.remove(sensor);
  }

  async setEstado(id: number, estado: EstadoSensor, empresaId: number): Promise<boolean> {
    const result = await this.repo.update({ id, empresaId }, { estado });
    return !!result.affected;
  }
}