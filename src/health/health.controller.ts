import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../module/auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check del servidor (uso interno de deploy/monitoreo)',
  })
  @ApiResponse({
    status: 200,
    description: 'El servidor está levantado y respondiendo',
  })
  check() {
    return { status: 'ok' };
  }
}
