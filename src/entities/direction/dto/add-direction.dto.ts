import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddDirectionDto {
  @ApiProperty({
    example: 'FullStack',
    description: 'Internship direction',
  })
  @IsString()
  @Transform(({ value }) => value.trim())
  @IsNotEmpty()
  direction: string;
}
