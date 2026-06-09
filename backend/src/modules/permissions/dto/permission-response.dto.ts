import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: '8c2d7f3a-1c4b-4ec2-b46c-29f5f0c2c8fa' })
  id: string;

  @ApiProperty({ example: 'bookings:approve' })
  name: string;

  @ApiProperty({ example: 'Approve pending bookings', nullable: true })
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
