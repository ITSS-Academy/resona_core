import { Controller, Get, Headers, HttpException, HttpStatus, Param, Request } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get()
  async  verfifyToken(@Headers('authorization') token: string) {
    try{
      if (!token) {
        return new HttpException('Token is required', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyToken(token)
    }catch (error){
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }

  }

  @Get(':id')
  async getUserByUid(@Param('id') id: string) {
    try {
      return await this.authService.getUserById(id);
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
