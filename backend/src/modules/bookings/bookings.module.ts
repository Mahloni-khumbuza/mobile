import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { BoardroomBlock } from '../boardroom-blocks/entities/boardroom-block.entity';
import { Boardroom } from '../boardrooms/entities/boardroom.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from './entities/booking.entity';
import { BookingsService } from './services/bookings.service';
import { BookingsController } from './controllers/bookings.controller';
import { BookingReminderScheduler } from './schedulers/booking-reminder.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Boardroom,
      BoardroomBlock,
      Notification,
      AuditLog,
      User,
      SystemSetting,
    ]),
    NotificationsModule,
    SystemSettingsModule,
  ],
  providers: [BookingsService, BookingReminderScheduler],
  controllers: [BookingsController],
  exports: [BookingsService, TypeOrmModule],
})
export class BookingsModule {}
