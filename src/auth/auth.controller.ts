import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    const login = this.config.get<string>('SUPERADMIN_LOGIN') ?? 'admin';
    const password =
      this.config.get<string>('SUPERADMIN_PASSWORD') ?? 'admin123';
    if (body.login !== login || body.password !== password) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }
    const token = this.jwt.sign({ sub: 'superadmin', role: 'SUPERADMIN' });
    return { accessToken: token };
  }
}
