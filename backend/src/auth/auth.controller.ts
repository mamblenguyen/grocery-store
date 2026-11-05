import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/decorators';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register') register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login') login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Auth() @Get('me') me(@CurrentUser('sub') id: number) {
    return this.auth.me(id);
  }

  @Auth() @Patch('me') update(@CurrentUser('sub') id: number, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(id, dto);
  }

  @Auth() @Patch('change-password') changePassword(@CurrentUser('sub') id: number, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(id, dto);
  }
}
