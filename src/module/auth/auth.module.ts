import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { UserRepository } from '../user/repository/user.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RevokedToken } from './entities/revoked-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { REVOKED_TOKEN_REPOSITORY } from './repository/revoked-token-repository.interface';
import { RevokedTokenRepository } from './repository/revoked-token.repository';
import { REFRESH_TOKEN_REPOSITORY } from './repository/refresh-token-repository.interface';
import { RefreshTokenRepository } from './repository/refresh-token.repository';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';
import { MailService } from './mail.service';
import { PasswordResetTokenRepository } from './repository/password-reset-token.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './repository/password-reset-token.interface';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RevokedToken,
      RefreshToken,
      PasswordResetTokenEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '45m') as StringValue,
        },
      }),
    }),
    // Solo se aplica explicitamente via @UseGuards(ThrottlerGuard) en el
    // endpoint de login (ver auth.controller.ts) -- no esta registrado como
    // APP_GUARD global, para no afectar al resto de la API.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [
    AuthService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: REVOKED_TOKEN_REPOSITORY,
      useClass: RevokedTokenRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: RefreshTokenRepository,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    PasswordResetService, MailService,
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PasswordResetTokenRepository,
    },
  ],
})
export class AuthModule {}
