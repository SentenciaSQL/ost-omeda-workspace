import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { SelectionCriteria } from '../models/selection-criteria.model';

@Injectable({ providedIn: 'root' })
export class FolderService {
  /**
   * Simulates submitting data (like opening a saved query).
   * In real repo this calls the actual Omeda API.
   */
  submitData(payload: any): Observable<SelectionCriteria> {
    console.log('[FolderService] submitData called with:', payload);
    // Simulate API response
    return of({
      criteria: payload.criteria || [],
      totalCount: Math.floor(Math.random() * 50000) + 1000,
      lastModified: Date.now(),
    } as SelectionCriteria).pipe(delay(800));
  }
}
