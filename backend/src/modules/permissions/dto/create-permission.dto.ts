import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'bookings:approve',
    description: 'Permission key in "<resource>:<action>" form',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/, {
    message: 'name must match "<resource>:<action>" (lowercase, alphanumeric or dashes)',
  })
  name: string;

  @ApiProperty({ example: 'Approve pending bookings', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
