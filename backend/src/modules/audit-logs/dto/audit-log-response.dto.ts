import { ApiProperty } from '@nestjs/swagger';

export class AuditLogActorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'user.created' })
  action: string;

  @ApiProperty({ example: 'user' })
  entity: string;

  @ApiProperty({ nullable: true })
  entityId: string | null;

  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ nullable: true, type: AuditLogActorDto })
  actor: AuditLogActorDto | null;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items: AuditLogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}
