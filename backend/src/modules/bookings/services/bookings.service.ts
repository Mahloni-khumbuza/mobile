import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';
import { BoardroomBlock } from '../../boardroom-blocks/entities/boardroom-block.entity';
import { Boardroom } from '../../boardrooms/entities/boardroom.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { SystemSetting } from '../../system-settings/entities/system-setting.entity';
import { User } from '../../users/entities/user.entity';
import { Booking, BookingStatus, MeetingType } from '../entities/booking.entity';
import { BookingResponseDto, CalendarEventResponseDto } from '../dto/booking-response.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { MailService } from '../../mail/mail.service';
import {
  bookingCreatedHtml,
  bookingConfirmedHtml,
  bookingUpdatedHtml,
  bookingCancelledHtml,
  bookingRejectedHtml,
  BookingEmailContext,
} from '../../mail/mail-templates';

@Injectable()
export class BookingsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BookingsService.name);
  private reminderTimer?: ReturnType<typeof setInterval>;
  private reminderStartupTimer?: ReturnType<typeof setTimeout>;
  private reminderWorkerRunning = false;

  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(Boardroom)
    private readonly rooms: Repository<Boardroom>,
    @InjectRepository(BoardroomBlock)
    private readonly blocks: Repository<BoardroomBlock>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    private readonly mail: MailService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.booleanEnv('BOOKING_REMINDER_WORKER_ENABLED', true)) {
      this.logger.log('Booking reminder worker is disabled');
      return;
    }
    const intervalSeconds = Math.max(
      30,
      Number(process.env.BOOKING_REMINDER_POLL_INTERVAL_SECONDS) || 60,
    );
    this.reminderStartupTimer = setTimeout(() => { void this.runReminderWorker(); }, 5000);
    this.reminderTimer = setInterval(() => { void this.runReminderWorker(); }, intervalSeconds * 1000);
    this.logger.log(`Booking reminder worker started; checking every ${intervalSeconds} seconds`);
  }

  onApplicationShutdown(): void {
    if (this.reminderStartupTimer) clearTimeout(this.reminderStartupTimer);
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  private async runReminderWorker(): Promise<void> {
    if (this.reminderWorkerRunning) return;
    this.reminderWorkerRunning = true;
    try {
      const result = await this.sendDueReminders();
      if (result.sent || result.failed) {
        this.logger.log(
          `Reminder worker: sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`,
        );
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Booking reminder worker failed');
    } finally {
      this.reminderWorkerRunning = false;
    }
  }

  async create(dto: CreateBookingDto, user: User): Promise<BookingResponseDto> {
    try {
      const room = await this.rooms.findOne({ where: { id: dto.boardroomId } });
      if (!room) throw new NotFoundException('Boardroom not found');

      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);

      await this.validateBookingBasics(dto, room, start, end);
      await this.validateOperatingRules(room, start, end);

      const conflictWindow = this.applyBufferWindow(room, start, end);
      await this.validateNoConflicts(room.id, conflictWindow.start, conflictWindow.end);

      const booking = this.bookings.create({
        title: dto.title,
        description: dto.description ?? null,
        boardroom: room,
        boardroomId: room.id,
        bookedByUser: user,
        bookedByUserId: user.id,
        startDateTime: start,
        endDateTime: end,
        attendeeCount: dto.attendeeCount,
        meetingType: dto.meetingType ?? MeetingType.Internal,
        requiresCatering: dto.requiresCatering ?? false,
        cateringNotes: dto.cateringNotes ?? null,
        requiresSetup: dto.requiresSetup ?? false,
        setupNotes: dto.setupNotes ?? null,
        status: room.requiresApproval ? BookingStatus.PENDING_APPROVAL : BookingStatus.APPROVED,
      });

      const saved = await this.bookings.save(booking);

      await this.notifyUser(
        user,
        'Booking created',
        room.requiresApproval
          ? `Your booking for ${room.name} is pending approval.`
          : `Your booking for ${room.name} has been approved.`,
        'BOOKING_CREATED',
        { bookingId: saved.id },
      );
      await this.sendBookingEmail(
        user,
        room.requiresApproval ? `Booking submitted: ${saved.title}` : `Booking confirmed: ${saved.title}`,
        room.requiresApproval ? bookingCreatedHtml(this.buildEmailCtx(saved)) : bookingConfirmedHtml(this.buildEmailCtx(saved)),
      );

      if (room.requiresApproval) {
        await this.notifyOperationalUsers(
          'Booking requires approval',
          `${user.firstName} ${user.lastName} requested ${room.name}.`,
          'BOOKING_APPROVAL_REQUIRED',
          { bookingId: saved.id, boardroomId: room.id },
        );
      }

      await this.notifyFacilitiesRequests(saved);
      await this.audit(user, 'BOOKING_CREATED', 'Booking', saved.id, null, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  private async validateBookingBasics(
    dto: CreateBookingDto,
    room: Boardroom,
    start: Date,
    end: Date,
  ): Promise<void> {
    if (!dto.title?.trim()) throw new BadRequestException('Booking title is required');
    if (!room.isActive || !room.isBookable) throw new BadRequestException('Boardroom is not bookable');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Start and end date-times are required');
    }
    if (end <= start) throw new BadRequestException('End date-time must be after start date-time');
    if (start < new Date()) throw new BadRequestException('Booking cannot start in the past');
    if (dto.attendeeCount > room.capacity) {
      throw new BadRequestException(`Attendee count exceeds the boardroom capacity of ${room.capacity}.`);
    }

    const minutes = (end.getTime() - start.getTime()) / 60000;
    const minimumMinutes = Math.max(
      room.minimumBookingMinutes,
      await this.getNumberSetting('DEFAULT_MINIMUM_BOOKING_MINUTES', room.minimumBookingMinutes),
    );
    const maximumMinutes = Math.min(
      room.maximumBookingMinutes,
      await this.getNumberSetting('DEFAULT_MAXIMUM_BOOKING_MINUTES', room.maximumBookingMinutes),
    );
    if (minutes < minimumMinutes) {
      throw new BadRequestException(`Minimum meeting duration is ${minimumMinutes} minutes.`);
    }
    if (minutes > maximumMinutes) {
      throw new BadRequestException(`You have exceeded the meeting time limit of ${maximumMinutes} minutes.`);
    }
  }

  private async validateOperatingRules(room: Boardroom, start: Date, end: Date): Promise<void> {
    const allowWeekends = await this.getBooleanSetting('ALLOW_WEEKEND_BOOKINGS', false);
    const allowAfterHours = await this.getBooleanSetting('ALLOW_AFTER_HOURS_BOOKINGS', false);

    const isWeekend = [0, 6].includes(start.getDay()) || [0, 6].includes(end.getDay());
    if (!allowWeekends && isWeekend) throw new BadRequestException("You can't book on a weekend.");

    if (!allowAfterHours) {
      const startTime = start.toTimeString().substring(0, 5);
      const endTime = end.toTimeString().substring(0, 5);
      if (startTime < room.openingTime || endTime > room.closingTime) {
        throw new BadRequestException('Booking is outside boardroom operating hours');
      }
    }
  }

  private applyBufferWindow(room: Boardroom, start: Date, end: Date): { start: Date; end: Date } {
    return {
      start: new Date(start.getTime() - room.bufferTimeBeforeMinutes * 60000),
      end: new Date(end.getTime() + room.bufferTimeAfterMinutes * 60000),
    };
  }

  async validateNoConflicts(
    boardroomId: string,
    start: Date,
    end: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    try {
      const bookingQb = this.bookings
        .createQueryBuilder('booking')
        .where('booking.boardroomId = :boardroomId', { boardroomId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED],
        })
        .andWhere('booking.startDateTime < :end', { end })
        .andWhere('booking.endDateTime > :start', { start });

      if (excludeBookingId) {
        bookingQb.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
      }

      const conflicts = await bookingQb.getCount();
      if (conflicts > 0) {
        throw new BadRequestException('Booking conflicts with an existing active booking');
      }

      const blockConflicts = await this.blocks
        .createQueryBuilder('block')
        .where('block.boardroomId = :boardroomId', { boardroomId })
        .andWhere('block.isActive = true')
        .andWhere('block.startTime < :end', { end })
        .andWhere('block.endTime > :start', { start })
        .getCount();

      if (blockConflicts > 0) {
        throw new BadRequestException('Booking conflicts with an active room block');
      }
    } catch (error) {
      throw error;
    }
  }

  async myBookings(user: User): Promise<BookingResponseDto[]> {
    try {
      const bookings = await this.bookings.find({
        where: { bookedByUserId: user.id },
        relations: { boardroom: true, bookedByUser: true, requestedAmenities: true },
        order: { startDateTime: 'DESC' },
      });
      return BookingResponseDto.collection(bookings);
    } catch (error) {
      throw error;
    }
  }

  async findAll(query: Record<string, string> = {}): Promise<BookingResponseDto[]> {
    try {
      return BookingResponseDto.collection(await this.findAllEntities(query));
    } catch (error) {
      throw error;
    }
  }

  private async findAllEntities(query: Record<string, string> = {}): Promise<Booking[]> {
    const qb = this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.boardroom', 'boardroom')
      .leftJoinAndSelect('booking.bookedByUser', 'bookedByUser')
      .leftJoinAndSelect('booking.approvedByUser', 'approvedByUser')
      .leftJoinAndSelect('booking.rejectedByUser', 'rejectedByUser')
      .leftJoinAndSelect('booking.requestedAmenities', 'requestedAmenities');

    if (query.status) qb.andWhere('booking.status = :status', { status: query.status });
    if (query.boardroomId) qb.andWhere('booking.boardroomId = :boardroomId', { boardroomId: query.boardroomId });
    if (query.department) {
      qb.andWhere('bookedByUser.department ILIKE :department', { department: `%${query.department}%` });
    }
    if (query.startDateTime) {
      qb.andWhere('booking.endDateTime >= :startDateTime', { startDateTime: query.startDateTime });
    }
    if (query.endDateTime) {
      qb.andWhere('booking.startDateTime <= :endDateTime', { endDateTime: query.endDateTime });
    }

    return qb.orderBy('booking.startDateTime', 'DESC').getMany();
  }

  async calendar(query: Record<string, string> = {}): Promise<CalendarEventResponseDto[]> {
    try {
      const bookings = await this.findAllEntities(query);
      const bookingEvents: CalendarEventResponseDto[] = bookings.map((b) => ({
        id: b.id,
        title: b.title,
        start: b.startDateTime,
        end: b.endDateTime,
        status: b.status,
        boardroomId: b.boardroom?.id ?? null,
        boardroom: b.boardroom?.name ?? null,
        owner: `${b.bookedByUser?.firstName ?? ''} ${b.bookedByUser?.lastName ?? ''}`.trim(),
      }));

      const blockQb = this.blocks
        .createQueryBuilder('block')
        .leftJoinAndSelect('block.boardroom', 'boardroom')
        .where('block.isActive = true');

      if (query.boardroomId) {
        blockQb.andWhere('block.boardroomId = :boardroomId', { boardroomId: query.boardroomId });
      }
      if (query.startDateTime) {
        blockQb.andWhere('block.endTime >= :startDateTime', { startDateTime: query.startDateTime });
      }
      if (query.endDateTime) {
        blockQb.andWhere('block.startTime <= :endDateTime', { endDateTime: query.endDateTime });
      }

      const roomBlocks = !query.status || query.status === 'ROOM_BLOCK'
        ? await blockQb.getMany()
        : [];

      const blockEvents: CalendarEventResponseDto[] = roomBlocks.map((block) => ({
        id: block.id,
        title: `Room block: ${block.reason}`,
        start: block.startTime,
        end: block.endTime,
        status: 'ROOM_BLOCK',
        boardroomId: block.boardroom?.id ?? null,
        boardroom: block.boardroom?.name ?? null,
        owner: 'Facilities',
      }));

      return [...bookingEvents, ...blockEvents].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string): Promise<BookingResponseDto> {
    try {
      return BookingResponseDto.fromEntity(await this.findOneEntity(id));
    } catch (error) {
      throw error;
    }
  }

  private async findOneEntity(id: string): Promise<Booking> {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: {
        boardroom: true,
        bookedByUser: true,
        approvedByUser: true,
        rejectedByUser: true,
        requestedAmenities: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, user: User): Promise<BookingResponseDto> {
    try {
      const booking = await this.findOneEntity(id);
      const before = this.safeBooking(booking);

      if (user.role?.name === 'Employee' && booking.bookedByUserId !== user.id) {
        throw new ForbiddenException('You can only update your own bookings');
      }
      if (![BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED].includes(booking.status)) {
        throw new BadRequestException('Only pending or approved bookings can be updated');
      }

      const room = booking.boardroom;
      if (!room) throw new NotFoundException('Boardroom not found');

      const start = dto.startTime ? new Date(dto.startTime) : booking.startDateTime;
      const end = dto.endTime ? new Date(dto.endTime) : booking.endDateTime;
      const attendeeCount = dto.attendeeCount ?? booking.attendeeCount;

      await this.validateBookingBasics(
        { ...dto, title: dto.title ?? booking.title, boardroomId: room.id, startTime: start.toISOString(), endTime: end.toISOString(), attendeeCount } as CreateBookingDto,
        room,
        start,
        end,
      );
      await this.validateOperatingRules(room, start, end);
      const conflictWindow = this.applyBufferWindow(room, start, end);
      await this.validateNoConflicts(room.id, conflictWindow.start, conflictWindow.end, booking.id);

      if (dto.title !== undefined) booking.title = dto.title;
      if (dto.description !== undefined) booking.description = dto.description ?? null;
      if (dto.attendeeCount !== undefined) booking.attendeeCount = attendeeCount;
      if (dto.meetingType !== undefined) booking.meetingType = dto.meetingType;
      if (dto.requiresCatering !== undefined) booking.requiresCatering = dto.requiresCatering;
      if (dto.cateringNotes !== undefined) booking.cateringNotes = dto.cateringNotes ?? null;
      if (dto.requiresSetup !== undefined) booking.requiresSetup = dto.requiresSetup;
      if (dto.setupNotes !== undefined) booking.setupNotes = dto.setupNotes ?? null;
      booking.startDateTime = start;
      booking.endDateTime = end;
      if (room.requiresApproval) booking.status = BookingStatus.PENDING_APPROVAL;

      const saved = await this.bookings.save(booking);
      await this.notifyUser(saved.bookedByUser!, 'Booking updated', `Your booking ${saved.title} was updated.`, 'BOOKING_UPDATED', { bookingId: saved.id });
      if (saved.bookedByUser) {
        await this.sendBookingEmail(saved.bookedByUser, `Booking updated: ${saved.title}`, bookingUpdatedHtml(this.buildEmailCtx(saved)));
      }
      await this.notifyFacilitiesRequests(saved);
      await this.audit(user, 'BOOKING_UPDATED', 'Booking', saved.id, before, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  async approve(id: string, user: User): Promise<BookingResponseDto> {
    try {
      const booking = await this.findOneEntity(id);
      const before = this.safeBooking(booking);
      if (booking.status !== BookingStatus.PENDING_APPROVAL) {
        throw new BadRequestException('Only pending approval bookings can be approved');
      }
      await this.validateNoConflicts(booking.boardroom.id, booking.startDateTime, booking.endDateTime, booking.id);
      booking.status = BookingStatus.APPROVED;
      booking.approvedByUser = user;
      booking.approvedByUserId = user.id;
      booking.approvedAt = new Date();
      const saved = await this.bookings.save(booking);
      await this.notifyUser(saved.bookedByUser!, 'Booking approved', `Your booking ${saved.title} was approved.`, 'BOOKING_APPROVED', { bookingId: saved.id });
      if (saved.bookedByUser) {
        await this.sendBookingEmail(saved.bookedByUser, `Booking confirmed: ${saved.title}`, bookingConfirmedHtml(this.buildEmailCtx(saved)));
      }
      await this.audit(user, 'BOOKING_APPROVED', 'Booking', saved.id, before, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  async reject(id: string, user: User, reason: string): Promise<BookingResponseDto> {
    try {
      const booking = await this.findOneEntity(id);
      const before = this.safeBooking(booking);
      if (!reason?.trim()) throw new BadRequestException('Rejection reason is required');
      if (booking.status !== BookingStatus.PENDING_APPROVAL) {
        throw new BadRequestException('Only pending approval bookings can be rejected');
      }
      booking.status = BookingStatus.REJECTED;
      booking.rejectedByUser = user;
      booking.rejectedByUserId = user.id;
      booking.rejectionReason = reason;
      booking.rejectedAt = new Date();
      const saved = await this.bookings.save(booking);
      await this.notifyUser(saved.bookedByUser!, 'Booking rejected', `Your booking ${saved.title} was rejected: ${reason}`, 'BOOKING_REJECTED', { bookingId: saved.id });
      if (saved.bookedByUser) {
        await this.sendBookingEmail(saved.bookedByUser, `Booking rejected: ${saved.title}`, bookingRejectedHtml(this.buildEmailCtx(saved)));
      }
      await this.audit(user, 'BOOKING_REJECTED', 'Booking', saved.id, before, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  async cancel(id: string, user: User, reason?: string): Promise<BookingResponseDto> {
    try {
      const booking = await this.findOneEntity(id);
      const before = this.safeBooking(booking);
      if (user.role?.name === 'Employee' && booking.bookedByUserId !== user.id) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }
      if ([BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW].includes(booking.status)) {
        throw new BadRequestException('This booking can no longer be cancelled');
      }
      booking.status = BookingStatus.CANCELLED;
      booking.cancellationReason = reason ?? 'Cancelled';
      const saved = await this.bookings.save(booking);
      await this.notifyUser(saved.bookedByUser!, 'Booking cancelled', `Your booking ${saved.title} was cancelled.`, 'BOOKING_CANCELLED', { bookingId: saved.id });
      if (saved.bookedByUser) {
        await this.sendBookingEmail(saved.bookedByUser, `Booking cancelled: ${saved.title}`, bookingCancelledHtml(this.buildEmailCtx(saved)));
      }
      await this.notifyOperationalUsers('Booking cancelled', `${saved.title} was cancelled.`, 'BOOKING_CANCELLED', { bookingId: saved.id });
      await this.audit(user, 'BOOKING_CANCELLED', 'Booking', saved.id, before, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  async complete(id: string, user?: User): Promise<BookingResponseDto> {
    try {
      const booking = await this.findOneEntity(id);
      const before = this.safeBooking(booking);
      if (booking.status !== BookingStatus.APPROVED) {
        throw new BadRequestException('Only approved bookings can be completed');
      }
      booking.status = BookingStatus.COMPLETED;
      const saved = await this.bookings.save(booking);
      await this.audit(user ?? null, 'BOOKING_COMPLETED', 'Booking', saved.id, before, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  async noShow(id: string, user?: User): Promise<BookingResponseDto> {
    try {
      const booking = await this.findOneEntity(id);
      const before = this.safeBooking(booking);
      if (booking.status !== BookingStatus.APPROVED) {
        throw new BadRequestException('Only approved bookings can be marked no-show');
      }
      booking.status = BookingStatus.NO_SHOW;
      const saved = await this.bookings.save(booking);
      await this.audit(user ?? null, 'BOOKING_NO_SHOW', 'Booking', saved.id, before, this.safeBooking(saved));
      return BookingResponseDto.fromEntity(saved);
    } catch (error) {
      throw error;
    }
  }

  async sendDueReminders(): Promise<{ windowMinutes: number; sent: number; failed: number; skipped: number }> {
    try {
      const remindersEnabled = await this.getBooleanSetting('EMAIL_REMINDERS_ENABLED', true);
      const windowMinutes = await this.getNumberSetting('BOOKING_REMINDER_MINUTES_BEFORE', 15);
      if (!remindersEnabled) return { windowMinutes, sent: 0, failed: 0, skipped: 0 };

      const now = new Date();
      const windowEnd = new Date(now.getTime() + windowMinutes * 60000);
      const dueBookings = await this.bookings
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.boardroom', 'boardroom')
        .leftJoinAndSelect('booking.bookedByUser', 'bookedByUser')
        .where('booking.status = :status', { status: BookingStatus.APPROVED })
        .andWhere('booking.startDateTime >= :now', { now })
        .andWhere('booking.startDateTime <= :windowEnd', { windowEnd })
        .orderBy('booking.startDateTime', 'ASC')
        .getMany();

      let sent = 0;
      let skipped = 0;

      for (const booking of dueBookings) {
        if (!booking.bookedByUser) { skipped += 1; continue; }
        await this.notifyUser(
          booking.bookedByUser,
          'Booking reminder',
          `Reminder: your booking "${booking.title}" starts in ${windowMinutes} minute(s) or less.`,
          'BOOKING_REMINDER',
          { bookingId: booking.id, boardroomId: booking.boardroom?.id },
        );
        sent += 1;
      }

      return { windowMinutes, sent, failed: 0, skipped };
    } catch (error) {
      throw error;
    }
  }

  private async sendBookingEmail(
    recipient: User,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!recipient?.email) return;
    await this.mail.sendMail({ to: recipient.email, subject, html });
  }

  private buildEmailCtx(booking: Booking): BookingEmailContext {
    return {
      userName: `${booking.bookedByUser?.firstName ?? ''} ${booking.bookedByUser?.lastName ?? ''}`.trim(),
      boardroomName: booking.boardroom?.name ?? 'Boardroom',
      bookingTitle: booking.title,
      startTime: booking.startDateTime,
      endTime: booking.endDateTime,
      status: booking.status,
      cancellationReason: booking.cancellationReason ?? undefined,
      rejectionReason: booking.rejectionReason ?? undefined,
    };
  }

  private async notifyUser(
    user: User,
    title: string,
    message: string,
    type: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!user?.id) return;
    await this.notifications.save(
      this.notifications.create({ recipientId: user.id, title, message, type: type as any, metadata } as any),
    );
  }

  private async notifyOperationalUsers(
    title: string,
    message: string,
    type: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const operationalUsers = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['Admin', 'SuperAdmin', 'FacilitiesManager'] })
      .getMany();

    for (const user of operationalUsers) {
      await this.notifyUser(user, title, message, type, metadata);
    }
  }

  private async notifyFacilitiesRequests(booking: Booking): Promise<void> {
    const requests: string[] = [];
    if (booking.requiresCatering) {
      requests.push(`Catering${booking.cateringNotes ? `: ${booking.cateringNotes}` : ''}`);
    }
    if (booking.requiresSetup) {
      requests.push(`Setup${booking.setupNotes ? `: ${booking.setupNotes}` : ''}`);
    }
    if (requests.length === 0) return;

    const facilitiesUsers = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['Admin', 'SuperAdmin', 'FacilitiesManager'] })
      .andWhere('user.isActive = true')
      .getMany();

    for (const user of facilitiesUsers) {
      await this.notifyUser(
        user,
        'Facilities request',
        `${booking.title} in ${booking.boardroom?.name ?? 'a boardroom'} needs ${requests.join(' and ')}.`,
        'FACILITIES_REQUEST',
        { bookingId: booking.id, boardroomId: booking.boardroom?.id, requiresCatering: booking.requiresCatering, requiresSetup: booking.requiresSetup },
      );
    }
  }

  private async audit(
    actor: User | null,
    action: string,
    entityName: string,
    entityId?: string,
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.auditLogs.save(
      this.auditLogs.create({
        actorId: actor?.id ?? null,
        action,
        entity: entityName,
        entityId: entityId ?? null,
        metadata: { before: before ?? undefined, after: after ?? undefined },
      }),
    );
  }

  private safeBooking(booking: Booking): Record<string, unknown> {
    return {
      id: booking.id,
      title: booking.title,
      status: booking.status,
      boardroomId: booking.boardroomId,
      bookedByUserId: booking.bookedByUserId,
      startDateTime: booking.startDateTime,
      endDateTime: booking.endDateTime,
      attendeeCount: booking.attendeeCount,
    };
  }

  private async getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
    const setting = await this.settings.findOne({ where: { key } });
    if (!setting) return fallback;
    return ['true', 'yes', '1'].includes(setting.value?.toLowerCase() ?? '');
  }

  private booleanEnv(key: string, fallback: boolean): boolean {
    const value = process.env[key];
    if (!value) return fallback;
    return ['true', 'yes', '1'].includes(value.toLowerCase());
  }

  private async getNumberSetting(key: string, fallback: number): Promise<number> {
    const setting = await this.settings.findOne({ where: { key } });
    if (!setting) return fallback;
    const parsed = Number(setting.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
