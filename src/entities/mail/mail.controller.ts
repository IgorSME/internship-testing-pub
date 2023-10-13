import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MailService } from './mail.service';

@ApiTags('Email')
@Controller('api/email')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('check-email')
  @ApiOperation({ summary: 'Check email uniqueness' })
  @ApiQuery({
    name: 'email',
    description: 'Email to check',
    example: 'example@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns if the email is unique or not',
  })
  async checkEmailUnique(
    @Query('email') email: string,
  ): Promise<{ unique: boolean }> {
    const isUnique = await this.mailService.checkEmailUnique(email);
    return { unique: isUnique };
  }
}
