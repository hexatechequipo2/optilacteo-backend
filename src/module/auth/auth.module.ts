import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { UserRepository } from '../user/repository/user.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RevokedToken } from './entities/revoked-token.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { REVOKED_TOKEN_REPOSITORY } from './repository/revoked-token-repository.interface';
import { RevokedTokenRepository } from './repository/revoked-token.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RevokedToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
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
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
