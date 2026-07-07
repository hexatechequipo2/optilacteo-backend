import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesion de usuario' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna access_token JWT y datos del usuario.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  @ApiResponse({ status: 403, description: 'Usuario inactivo o cuenta bloqueada por intentos fallidos.' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos de login. Intente nuevamente en unos minutos.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cierre de sesion manual' })
  @ApiBody({ type: LogoutDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso. El token queda invalidado en el servidor.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalido, ausente o revocado.',
  })
  logout(@Req() request: AuthenticatedRequest, @Body() body?: LogoutDto) {
    return this.authService.logout(
      request.accessToken ?? '',
      body?.refresh_token,
    );
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovación de access_token via refresh_token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Renovación exitosa. Retorna un nuevo access_token y refresh_token (rotado).',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado o ya utilizado.',
  })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refresh_token);
  }
}