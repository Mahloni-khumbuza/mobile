import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminDashboardStats,
  BookingsByDepartment,
  CancellationReport,
  EmployeeDashboardStats,
  PeakHour,
  RoomUsageRank,
  RoomUtilisation,
} from '../models/dashboard.model';

export interface ReportingQuery {
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/dashboard`;

  admin(): Observable<AdminDashboardStats> {
    return this.http.get<AdminDashboardStats>(`${this.url}/admin`);
  }

  me(): Observable<EmployeeDashboardStats> {
    return this.http.get<EmployeeDashboardStats>(`${this.url}/me`);
  }

  utilisation(q: ReportingQuery = {}): Observable<RoomUtilisation[]> {
    return this.http.get<RoomUtilisation[]>(`${this.url}/reports/utilisation`, { params: q as Record<string, string> });
  }

  byDepartment(q: ReportingQuery = {}): Observable<BookingsByDepartment[]> {
    return this.http.get<BookingsByDepartment[]>(`${this.url}/reports/by-department`, { params: q as Record<string, string> });
  }

  peakHours(q: ReportingQuery = {}): Observable<PeakHour[]> {
    return this.http.get<PeakHour[]>(`${this.url}/reports/peak-hours`, { params: q as Record<string, string> });
  }

  mostUsed(q: ReportingQuery = {}): Observable<RoomUsageRank[]> {
    return this.http.get<RoomUsageRank[]>(`${this.url}/reports/most-used`, { params: q as Record<string, string> });
  }

  leastUsed(q: ReportingQuery = {}): Observable<RoomUsageRank[]> {
    return this.http.get<RoomUsageRank[]>(`${this.url}/reports/least-used`, { params: q as Record<string, string> });
  }

  cancellations(q: ReportingQuery = {}): Observable<CancellationReport> {
    return this.http.get<CancellationReport>(`${this.url}/reports/cancellations`, { params: q as Record<string, string> });
  }
}
