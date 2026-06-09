export interface RoomUtilisation {
  boardroomId: string;
  boardroomName: string;
  totalBookings: number;
  totalBookedMinutes: number;
  utilisationPct: number;
}

export interface BookingsByDepartment {
  department: string;
  bookingCount: number;
}

export interface PeakHour {
  hour: number;
  bookingCount: number;
}

export interface RoomUsageRank {
  boardroomId: string;
  boardroomName: string;
  bookingCount: number;
}

export interface CancellationReport {
  totalCancelled: number;
  totalBookings: number;
  cancellationRatePct: number;
  noShowEstimate: number;
}

export interface UpcomingBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  boardroomName: string;
  status: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalBoardrooms: number;
  activeBoardrooms: number;
  totalBookings: number;
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  bookingsToday: number;
  bookingsThisWeek: number;
  upcomingBookings: UpcomingBooking[];
}

export interface EmployeeDashboardStats {
  myUpcomingBookings: number;
  myPendingBookings: number;
  activeBoardrooms: number;
  upcomingBookings: UpcomingBooking[];
  unreadNotifications: number;
}
