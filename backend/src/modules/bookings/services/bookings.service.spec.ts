import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Amenity } from '../../amenities/entities/amenity.entity';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import { BoardroomBlocksService } from '../../boardroom-blocks/services/boardroom-blocks.service';
import { Boardroom } from '../../boardrooms/entities/boardroom.entity';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { SystemSettingsService } from '../../system-settings/services/system-settings.service';
import { Booking } from '../entities/booking.entity';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: {} },
        { provide: getRepositoryToken(Boardroom), useValue: {} },
        { provide: getRepositoryToken(Amenity), useValue: {} },
        { provide: AuditLogsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: BoardroomBlocksService, useValue: {} },
        { provide: SystemSettingsService, useValue: {} },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
