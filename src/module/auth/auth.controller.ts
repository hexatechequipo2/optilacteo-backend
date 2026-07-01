import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesion de usuario' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna access_token JWT y datos del usuario.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  @ApiResponse({ status: 403, description: 'Usuario inactivo o cuenta bloqueada por intentos fallidos.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cierre de sesion manual' })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso. El token queda invalidado en el servidor.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalido, ausente o revocado.',
  })
  logout(@Req() request: AuthenticatedRequest) {
    return this.authService.logout(request.accessToken ?? '');
  }
}
