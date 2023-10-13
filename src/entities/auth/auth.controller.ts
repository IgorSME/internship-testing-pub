import { User } from '@entities/users/users.entity';
import { JwtAuthGuard } from '@guards/jwtGuard/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MyRequest } from '@src/types/request.interface';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterUserDto } from './dto/create-user.dto';
import {
  EmailResendResponseDto,
  EmailSendResponseDto,
} from './dto/email-send.dto';
import {
  LoginDto,
  LoginResponseDto,
  LogoutResponseDto,
  UsernameDto,
} from './dto/login.dto';
import { PhoneCodeDto, PhoneDto } from './dto/phone.dto';
import { RegularExpressionResponseDto } from './dto/regular-expression.response.dto';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Register
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: RegisterUserDto })
  async registerUser(
    @Body(ValidationPipe) registerUserDto: RegisterUserDto,
  ): Promise<User> {
    return this.authService.registerUser(registerUserDto);
  }

  // Verify email
  @Get('verify-email/:verificationToken')
  @ApiOperation({ summary: 'User email verification' })
  async verifyEmail(
    @Param('verificationToken') verificationToken: string,
    @Res() res: Response,
  ) {
    const userData = await this.authService.verifyEmail(verificationToken);
    const redirectUrl = `${
      process.env.REDIRECT_TO_SITE_INTERNSHIP
    }?userData=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  }

  // Login
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Email is wrong, or password is wrong or email not verified',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Too many failed login attempts. Please try again after 15 minutes.',
  })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: MyRequest) {
    const data = await this.authService.login(loginDto, req.ip);
    return {
      refreshToken: data.refreshToken,
      accessToken: data.accessToken,
      user: data.user,
    };
  }

  // Check phone
  @ApiOperation({ summary: 'Check phone' })
  @ApiResponse({ status: 201, description: 'OK' })
  @ApiConflictResponse({ description: 'Phone number already exists' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @Post('check-phone')
  async checkPhone(@Body() body: PhoneDto) {
    return this.authService.checkPhone(body.phone);
  }

  // Request change password
  @ApiOperation({ summary: 'Request change password' })
  @ApiResponse({
    status: 201,
    description: 'Email send',
    type: EmailSendResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @Post('request-change-password')
  async requestChangePassword(@Body() body: UsernameDto) {
    return this.authService.requestChangePassword(body.email);
  }

  // Resend email
  @ApiOperation({ summary: 'Resend email' })
  @ApiResponse({
    status: 201,
    description: 'Email resend',
    type: EmailResendResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiConflictResponse({ description: 'Email is already verified' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @Post('resend-email')
  async resendingEmail(@Body() body: UsernameDto) {
    return this.authService.resendEmail(body.email);
  }

  // Verify change password
  @ApiOperation({ summary: 'Verify change password' })
  @ApiOkResponse({ description: 'OK' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @Get('verify-change-password/:verifyToken')
  async verifyChangePassword(
    @Param('verifyToken') verifyToken: string,
    @Res() res: Response,
  ) {
    const userData = await this.authService.verifyChangePassword(verifyToken);
    const redirectUrl = `${
      process.env.REDIRECT_TO_PASSWORD_CHANGE_FORM
    }?userData=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  }

  // Change password
  @ApiOperation({ summary: 'Password change' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'token-type',
    description: 'Token type',
    required: true,
    schema: {
      type: 'string',
      format: 'token-type: access_token',
    },
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Access token',
    required: true,
    schema: {
      type: 'string',
      format: 'Bearer YOUR_TOKEN_HERE',
    },
  })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({ description: 'Passwords do not match' })
  @ApiUnauthorizedResponse({
    description:
      'Not authorized jwt expired || Not authorized Invalid token type',
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: MyRequest,
  ) {
    return this.authService.changePassword(changePasswordDto, req.user.id);
  }

  // Refresh token
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'token-type',
    description: 'Token type',
    required: true,
    schema: {
      type: 'string',
      format: 'token-type: refresh_token',
    },
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh token',
    required: true,
    schema: {
      type: 'string',
      format: 'Bearer YOUR_TOKEN_HERE',
    },
  })
  @ApiOkResponse({ description: 'Refresh token' })
  @ApiUnauthorizedResponse({
    description:
      'Not authorized jwt expired || Not authorized Invalid token type',
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @UseGuards(JwtAuthGuard)
  @Get('refresh-token')
  async refreshToken(@Req() req: MyRequest) {
    const data = await this.authService.refreshToken(req.user);
    return {
      refreshToken: data.refreshToken,
      accessToken: data.accessToken,
    };
  }

  // Get phone code
  @ApiOperation({ summary: 'Get phone code' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'token-type',
    description: 'Token type',
    required: true,
    schema: {
      type: 'string',
      format: 'token-type: access_token',
    },
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Access token',
    required: true,
    schema: {
      type: 'string',
      format: 'Bearer YOUR_TOKEN_HERE',
    },
  })
  @ApiResponse({ status: 200, type: [PhoneCodeDto] })
  @ApiUnauthorizedResponse({
    description:
      'Not authorized jwt expired || Not authorized Invalid token type',
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @UseGuards(JwtAuthGuard)
  @Get('phone-code')
  async getPhoneCode() {
    return this.authService.getPhoneCode();
  }

  // Get regular expression
  @ApiOperation({ summary: 'Get regular expression' })
  @ApiResponse({ status: 200, type: RegularExpressionResponseDto })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @Get('regular-expression')
  getRegularExpression() {
    return this.authService.getRegularExpression();
  }

  // Logout
  @ApiOperation({ summary: 'Logout' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'token-type',
    description: 'Token type',
    required: true,
    schema: {
      type: 'string',
      format: 'token-type: access_token',
    },
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Access token',
    required: true,
    schema: {
      type: 'string',
      format: 'Bearer YOUR_TOKEN_HERE',
    },
  })
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'Not authorized jwt expired || Not authorized Invalid token type',
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiInternalServerErrorResponse({ description: 'Server error' })
  @UseGuards(JwtAuthGuard)
  @Get('logout')
  logout(@Req() req: MyRequest) {
    this.authService.logout(req.user.email);
    return { message: 'Disconnect...' };
  }
}
