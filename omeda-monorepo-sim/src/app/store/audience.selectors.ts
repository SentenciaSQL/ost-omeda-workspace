// =============================================================
// FILE: src/app/store/audience.selectors.ts
// =============================================================
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AudienceState } from './audience.reducer';

export const selectAudienceState = createFeatureSelector<AudienceState>('audience');

export const selectSelectionCriteria = createSelector(
  selectAudienceState,
  (state) => state.selectionCriteria
);

export const selectTotalCount = createSelector(
  selectSelectionCriteria,
  (criteria) => criteria.totalCount
);
