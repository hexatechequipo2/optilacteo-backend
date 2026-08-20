import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PasswordResetService } from './password-reset.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@ApiTags('Auth — Reset de contraseña')
@Controller()
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request-password-reset')
  @Public()
  @UseGuards(ThrottlerGuard)
  // Límite más estricto que login: pedir un reset es una acción poco
  // frecuente para un usuario legítimo, así que 3/min por IP frena
  // enumeración automatizada y abuso del SMTP sin afectar uso real.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @AuditLog('PASSWORD_REQUEST', 'Usuario')
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña',
    description:
      'Envía un email con enlace de restablecimiento al email registrado. ' +
      'Siempre responde con éxito para no revelar si el email existe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email enviado (o silenciado si el correo no existe)',
    schema: {
      example: {
        message:
          'Si el email está registrado, recibirás un enlace de restablecimiento.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Formato de email inválido' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes. Intente nuevamente en unos minutos.',
  })
  async requestReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    return this.passwordResetService.requestReset(dto);
  }

  @Post('reset-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  // Mismo criterio: acción infrecuente, así que un límite bajo no afecta
  // a usuarios reales pero corta intentos de fuerza bruta sobre el token
  // UUID (aunque de por sí es prácticamente imposible de adivinar, defensa
  // en profundidad no está de más).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @AuditLog('PASSWORD_RESET', 'Usuario')
  @ApiOperation({
    summary: 'Confirmar nueva contraseña',
    description:
      'Valida el token del enlace (debe ser válido, no expirado y de un solo uso) ' +
      'y actualiza la contraseña del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida correctamente',
    schema: {
      example: {
        message:
          'Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Token inválido, expirado, ya utilizado o contraseñas no coinciden',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes. Intente nuevamente en unos minutos.',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordResetService.resetPassword(dto);
  }
}