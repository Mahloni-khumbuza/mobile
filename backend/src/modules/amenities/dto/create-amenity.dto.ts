import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAmenityDto {
  @ApiProperty({ example: 'Projector' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: '4K HDMI projector with screen mirroring', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'projector', required: false, description: 'Icon key' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}
