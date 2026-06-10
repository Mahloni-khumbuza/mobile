import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Amenity } from '../amenities/entities/amenity.entity';
import { BoardroomBlock } from '../boardroom-blocks/entities/boardroom-block.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Boardroom } from './entities/boardroom.entity';
import { BoardroomsController } from './controllers/boardrooms.controller';
import { BoardroomsService } from './services/boardrooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Boardroom, Amenity, Booking, BoardroomBlock])],
  controllers: [BoardroomsController],
  providers: [BoardroomsService],
  exports: [BoardroomsService, TypeOrmModule],
})
export class BoardroomsModule {}
