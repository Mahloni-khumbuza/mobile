import { ApiProperty } from '@nestjs/swagger';

export class BlockBoardroomDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class BoardroomBlockResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: BlockBoardroomDto })
  boardroom: BlockBoardroomDto;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  reason: string;

  @ApiProperty({ nullable: true })
  createdById: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
