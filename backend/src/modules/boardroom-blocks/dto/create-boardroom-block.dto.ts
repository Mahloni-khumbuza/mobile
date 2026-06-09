import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateBoardroomBlockDto {
  @ApiProperty()
  @IsUUID('4')
  boardroomId: string;

  @ApiProperty()
  @IsISO8601()
  startTime: string;

  @ApiProperty()
  @IsISO8601()
  endTime: string;

  @ApiProperty({ example: 'HVAC maintenance' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  reason: string;
}
