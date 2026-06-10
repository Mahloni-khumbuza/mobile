import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Permissions } from '../../../shared/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard';
import { Permission } from '../../../shared/constants/permissions';
import type { JwtPayload } from '../../auth/services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStatsDto, EmployeeDashboardStatsDto } from '../dto/dashboard-stats.dto';
import {
  BookingsByDepartmentDto,
  CancellationReportDto,
  PeakHourDto,
  ReportingQueryDto,
  RoomUsageRankDto,
  RoomUtilisationDto,
} from '../dto/reporting.dto';

const ADMIN_ROLES = new Set(['SuperAdmin', 'Admin', 'FacilitiesManager']);

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('admin')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Get admin dashboard stats', operationId: 'getAdminDashboard' })
  @ApiOkResponse({ type: DashboardStatsDto })
  getAdmin(@CurrentUser() user: JwtPayload): Promise<DashboardStatsDto> {
    this.requireAdmin(user);
    return this.service.getAdminStats();
  }

  @Get('me')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Get personal dashboard stats', operationId: 'getMyDashboard' })
  @ApiOkResponse({ type: EmployeeDashboardStatsDto })
  getMe(@CurrentUser() user: JwtPayload): Promise<EmployeeDashboardStatsDto> {
    return this.service.getEmployeeStats(user.sub);
  }

  @Get('reports/utilisation')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Room utilisation report', operationId: 'getUtilisationReport' })
  @ApiOkResponse({ type: [RoomUtilisationDto] })
  getUtilisation(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportingQueryDto,
  ): Promise<RoomUtilisationDto[]> {
    this.requireAdmin(user);
    return this.service.getRoomUtilisation(query);
  }

  @Get('reports/by-department')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Bookings grouped by department', operationId: 'getBookingsByDepartment' })
  @ApiOkResponse({ type: [BookingsByDepartmentDto] })
  getByDepartment(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportingQueryDto,
  ): Promise<BookingsByDepartmentDto[]> {
    this.requireAdmin(user);
    return this.service.getBookingsByDepartment(query);
  }

  @Get('reports/peak-hours')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Peak booking hours', operationId: 'getPeakHours' })
  @ApiOkResponse({ type: [PeakHourDto] })
  getPeakHours(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportingQueryDto,
  ): Promise<PeakHourDto[]> {
    this.requireAdmin(user);
    return this.service.getPeakHours(query);
  }

  @Get('reports/most-used')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Most-used boardrooms', operationId: 'getMostUsedRooms' })
  @ApiOkResponse({ type: [RoomUsageRankDto] })
  getMostUsed(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportingQueryDto,
  ): Promise<RoomUsageRankDto[]> {
    this.requireAdmin(user);
    return this.service.getMostUsedRooms(query);
  }

  @Get('reports/least-used')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Least-used boardrooms', operationId: 'getLeastUsedRooms' })
  @ApiOkResponse({ type: [RoomUsageRankDto] })
  getLeastUsed(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportingQueryDto,
  ): Promise<RoomUsageRankDto[]> {
    this.requireAdmin(user);
    return this.service.getLeastUsedRooms(query);
  }

  @Get('reports/cancellations')
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Cancellation and no-show report', operationId: 'getCancellationReport' })
  @ApiOkResponse({ type: CancellationReportDto })
  getCancellations(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportingQueryDto,
  ): Promise<CancellationReportDto> {
    this.requireAdmin(user);
    return this.service.getCancellationReport(query);
  }

  private requireAdmin(user: JwtPayload): void {
    if (!user.role || !ADMIN_ROLES.has(user.role)) {
      throw new ForbiddenException('Admin-tier role required');
    }
  }
}
