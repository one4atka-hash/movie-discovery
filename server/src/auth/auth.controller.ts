import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { CurrentUser, type AuthedUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    return await this.auth.register(body);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const res = await this.auth.login(body);
    if (!res) throw new UnauthorizedException('Invalid credentials');
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() u: AuthedUser) {
    return { id: u.id, email: u.email };
  }
}
