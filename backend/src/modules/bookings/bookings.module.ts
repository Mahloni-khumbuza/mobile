import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Amenity } from '../amenities/entities/amenity.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BoardroomBlocksModule } from '../boardroom-blocks/boardroom-blocks.module';
import { Boardroom } from '../boardrooms/entities/boardroom.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { BookingsService } from './services/bookings.service';
import { BookingsController } from './controllers/bookings.controller';
import { Booking } from './entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Boardroom, Amenity]),
    AuditLogsModule,
    NotificationsModule,
    BoardroomBlocksModule,
    SystemSettingsModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [TypeOrmModule, BookingsService],
})
export class BookingsModule {}
