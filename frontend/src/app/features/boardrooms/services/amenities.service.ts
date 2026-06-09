import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Amenity,
  AmenityCreateRequest,
  AmenityUpdateRequest
} from '../models/boardroom.model';

@Injectable({ providedIn: 'root' })
export class AmenitiesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/amenities`;

  list(): Observable<Amenity[]> {
    return this.http.get<Amenity[]>(this.url);
  }

  get(id: string): Observable<Amenity> {
    return this.http.get<Amenity>(`${this.url}/${id}`);
  }

  create(payload: AmenityCreateRequest): Observable<Amenity> {
    return this.http.post<Amenity>(this.url, payload);
  }

  update(id: string, payload: AmenityUpdateRequest): Observable<Amenity> {
    return this.http.patch<Amenity>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
