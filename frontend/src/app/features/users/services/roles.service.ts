import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RoleSummary } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/roles`;

  list(): Observable<RoleSummary[]> {
    return this.http.get<RoleSummary[]>(this.url);
  }
}
