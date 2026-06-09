import { ApiProperty } from '@nestjs/swagger';

export class AmenityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Projector' })
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  icon: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
