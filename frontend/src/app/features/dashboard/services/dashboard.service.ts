import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AdminDashboardStats, EmployeeDashboardStats } from '../models/dashboard.model';

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
}
