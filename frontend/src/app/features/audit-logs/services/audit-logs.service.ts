import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuditLogQuery, PaginatedAuditLogs } from '../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/audit-logs`;

  list(query: AuditLogQuery = {}): Observable<PaginatedAuditLogs> {
    let params = new HttpParams();
    (Object.keys(query) as (keyof AuditLogQuery)[]).forEach((k) => {
      const v = query[k];
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PaginatedAuditLogs>(this.url, { params });
  }
}
