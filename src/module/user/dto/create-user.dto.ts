import { IsEmail, IsString, MinLength, IsNotEmpty, IsEnum, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
    @ApiProperty({ example: 'Juan Pérez' })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty({ example: 'admin@optilacteo.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'strongPassword' })
    @IsString()
    @MinLength(6)
    password!: string;

    @ApiProperty({ example: 'admin', enum: Role, default: Role.ADMIN })
    @IsEnum(Role)
    role: Role = Role.ADMIN;

    @ApiProperty({ example: 1, description: 'ID de la empresa a la que pertenece el usuario' })
    @IsInt()
    @IsPositive()
    empresaId!: number;
}