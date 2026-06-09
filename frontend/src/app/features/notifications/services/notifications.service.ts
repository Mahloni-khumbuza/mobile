import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AppNotification,
  NotificationCreateRequest,
  UnreadCount
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/notifications`;

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.url);
  }

  unreadCount(): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.url}/unread-count`);
  }

  create(payload: NotificationCreateRequest): Observable<AppNotification> {
    return this.http.post<AppNotification>(this.url, payload);
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http.post<AppNotification>(`${this.url}/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.url}/read-all`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
