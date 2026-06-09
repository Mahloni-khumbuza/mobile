import { PartialType } from '@nestjs/swagger';
import { CreateBoardroomDto } from './create-boardroom.dto';

export class UpdateBoardroomDto extends PartialType(CreateBoardroomDto) {}
