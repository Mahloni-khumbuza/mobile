import { ApiProperty } from '@nestjs/swagger';

export class BookingStatsByStatusDto {
  @ApiProperty()
  pending: number;

  @ApiProperty()
  confirmed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  completed: number;
}

export class UpcomingBookingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  boardroomName: string;

  @ApiProperty()
  status: string;
}

export class DashboardStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalBoardrooms: number;

  @ApiProperty()
  activeBoardrooms: number;

  @ApiProperty()
  totalBookings: number;

  @ApiProperty({ type: BookingStatsByStatusDto })
  bookingsByStatus: BookingStatsByStatusDto;

  @ApiProperty()
  bookingsToday: number;

  @ApiProperty()
  bookingsThisWeek: number;

  @ApiProperty({ type: [UpcomingBookingDto] })
  upcomingBookings: UpcomingBookingDto[];
}

export class EmployeeDashboardStatsDto {
  @ApiProperty()
  myUpcomingBookings: number;

  @ApiProperty()
  myPendingBookings: number;

  @ApiProperty()
  activeBoardrooms: number;

  @ApiProperty({ type: [UpcomingBookingDto] })
  upcomingBookings: UpcomingBookingDto[];

  @ApiProperty()
  unreadNotifications: number;
}
