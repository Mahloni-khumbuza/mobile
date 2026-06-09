import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  SystemSetting,
  SystemSettingCreateRequest,
  SystemSettingUpdateRequest
} from '../models/system-setting.model';

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/system-settings`;

  list(): Observable<SystemSetting[]> {
    return this.http.get<SystemSetting[]>(this.url);
  }

  create(payload: SystemSettingCreateRequest): Observable<SystemSetting> {
    return this.http.post<SystemSetting>(this.url, payload);
  }

  update(id: string, payload: SystemSettingUpdateRequest): Observable<SystemSetting> {
    return this.http.patch<SystemSetting>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
