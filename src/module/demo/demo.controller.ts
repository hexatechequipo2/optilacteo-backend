import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { LecturaResponseDto } from '../lectura-sensor/dto/lectura-response.dto';
import { DemoService } from './demo.service';
import { IniciarTurnoDemoDto } from './dto/iniciar-turno-demo.dto';
import { RegistrarLecturaDemoDto } from './dto/registrar-lectura-demo.dto';
import { TurnoDemoResponseDto } from './dto/turno-demo-response.dto';
import { ResumenTurnoDemoResponseDto } from './dto/resumen-turno-demo-response.dto';
import { TableroDemoResponseDto } from './dto/tablero-demo-response.dto';
import { DemoLoteThrottlerGuard } from './guards/demo-lote-throttler.guard';
import { DemoIpThrottlerGuard } from './guards/demo-ip-throttler.guard';
import {
  DEMO_THROTTLE_LECTURAS,
  DEMO_THROTTLE_TURNO,
} from './constants/demo.constants';

// Endpoints públicos (sin JWT) de la demo en vivo. El módulo solo se
// registra con DEMO_MODE=true (ver app.module.ts); sin eso estas rutas no
// existen y responden 404.
@ApiTags('demo')
@Public()
@Controller('demo')
export class DemoController {
  constructor(
    private readonly demoService: DemoService,
    private readonly configService: ConfigService,
  ) {}

  @Post('turno')
  @UseGuards(DemoIpThrottlerGuard)
  @Throttle({ default: DEMO_THROTTLE_TURNO })
  @ApiOperation({
    summary:
      'Inicia un turno: crea un lote demo y le asocia el sensor elegido o, sin sensorId, el disponible de menor N',
  })
  @ApiResponse({ status: 201, type: TurnoDemoResponseDto })
  @ApiResponse({ status: 404, description: 'Sensor fuera de la empresa demo' })
  @ApiResponse({
    status: 409,
    description:
      'Sensor en uso o no es de demo; sin sensorId: "Todos los sensores están en uso"',
  })
  @ApiTooManyRequestsResponse({
    description: 'Más de 60 turnos por minuto desde la misma IP',
  })
  iniciarTurno(
    @Body() dto: IniciarTurnoDemoDto,
  ): Promise<TurnoDemoResponseDto> {
    return this.demoService.iniciarTurno(dto);
  }

  @Post('lecturas')
  @UseGuards(DemoLoteThrottlerGuard)
  @Throttle({ default: DEMO_THROTTLE_LECTURAS })
  @ApiOperation({
    summary: 'Registra una lectura del celular por el flujo real de ingesta',
  })
  @ApiResponse({ status: 201, type: LecturaResponseDto })
  @ApiResponse({ status: 400, description: 'Valor fuera del rango físico' })
  @ApiResponse({ status: 409, description: 'El turno ya terminó' })
  @ApiTooManyRequestsResponse({
    description: 'Más de 10 lecturas por segundo para el lote',
  })
  registrarLectura(@Body() dto: RegistrarLecturaDemoDto) {
    return this.demoService.registrarLectura(dto);
  }

  @Get('tablero')
  @ApiOperation({
    summary:
      'Estado de todos los sensores demo para la tele (solo lectura, liviano)',
  })
  @ApiResponse({ status: 200, type: TableroDemoResponseDto })
  obtenerTablero(): Promise<TableroDemoResponseDto> {
    return this.demoService.obtenerTablero();
  }

  @Get('lotes/:id/resumen')
  @ApiOperation({ summary: 'Resumen del turno (solo lectura)' })
  @ApiResponse({ status: 200, type: ResumenTurnoDemoResponseDto })
  @ApiResponse({ status: 404, description: 'Lote demo no encontrado' })
  obtenerResumen(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResumenTurnoDemoResponseDto> {
    return this.demoService.obtenerResumen(id);
  }

  // Botón de pánico: vuelve todos los sensores a "· libre". Requiere el
  // header X-Demo-Key = DEMO_ADMIN_KEY; sin esa variable el endpoint
  // "no existe" (404).
  @Post('liberar-todos')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  liberarTodos(
    @Headers('x-demo-key') clave?: string,
  ): Promise<{ liberados: number }> {
    const esperada = this.configService.get<string>('DEMO_ADMIN_KEY');
    if (!esperada) throw new NotFoundException();
    if (clave !== esperada) throw new UnauthorizedException('Clave inválida.');
    return this.demoService.liberarTodos();
  }

  @Post('turno/:loteId/fin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Termina el turno: libera el sensor, clasifica, pide destino a la IA y devuelve el resumen',
  })
  @ApiResponse({ status: 200, type: ResumenTurnoDemoResponseDto })
  @ApiResponse({ status: 404, description: 'Lote demo no encontrado' })
  finalizarTurno(
    @Param('loteId', ParseIntPipe) loteId: number,
  ): Promise<ResumenTurnoDemoResponseDto> {
    return this.demoService.finalizarTurno(loteId);
  }
}