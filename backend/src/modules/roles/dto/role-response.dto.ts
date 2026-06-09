import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from '../../permissions/dto/permission-response.dto';

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Admin' })
  name: string;

  @ApiProperty({ nullable: true, example: 'Manages rooms and bookings' })
  description: string | null;

  @ApiProperty({ type: [PermissionResponseDto] })
  permissions: PermissionResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
