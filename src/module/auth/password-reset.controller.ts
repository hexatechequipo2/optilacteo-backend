import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PasswordResetService } from './password-reset.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth — Reset de contraseña')
@Controller()
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request-password-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña',
    description:
      'Envía un email con enlace de restablecimiento al email registrado. ' +
      'Siempre responde con éxito para no revelar si el email existe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email enviado (o silenciado si el correo no existe)',
    schema: { example: { message: 'Si el email está registrado, recibirás un enlace de restablecimiento.' } },
  })
  @ApiResponse({ status: 400, description: 'Formato de email inválido' })
  async requestReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    return this.passwordResetService.requestReset(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar nueva contraseña',
    description:
      'Valida el token del enlace (debe ser válido, no expirado y de un solo uso) ' +
      'y actualiza la contraseña del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida correctamente',
    schema: { example: { message: 'Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.' } },
  })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado, ya utilizado o contraseñas no coinciden' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordResetService.resetPassword(dto);
  }
}