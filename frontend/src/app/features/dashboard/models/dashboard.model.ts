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
