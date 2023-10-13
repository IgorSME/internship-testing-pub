import { AuthModule } from '@entities/auth/auth.module';
import { JwtGuardsModule } from '@guards/jwtGuard/jwt-guard.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { UserController } from './users.controller';
import { User } from './users.entity';
import { UserService } from './users.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, Role]),
    JwtGuardsModule,
  ],
  controllers: [UserController],
  providers: [UserService, ConfigService],
  exports: [UserService],
})
export class UserModule {}
