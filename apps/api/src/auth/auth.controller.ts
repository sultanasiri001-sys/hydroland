import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
type Credentials={email:string;password:string}; type Refresh={refreshToken:string};
@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService){}
 @Post('register') register(@Body() b:Credentials){return this.auth.register(b)}
 @Post('login') @HttpCode(HttpStatus.OK) login(@Body() b:Credentials){return this.auth.login(b)}
 @Post('refresh') @HttpCode(HttpStatus.OK) refresh(@Body() b:Refresh){return this.auth.refresh(b.refreshToken)}
 @Post('logout') @HttpCode(HttpStatus.NO_CONTENT) async logout(@Body() b:Refresh){await this.auth.logout(b.refreshToken)}
}