// =============================================================
// FILE: src/app/store/audience.actions.ts
// SIMULATED NgRx actions
// =============================================================
import { createAction, props } from '@ngrx/store';
import { SelectionCriteria } from '../models/selection-criteria.model';

export const setSelectionCriteria = createAction(
  '[Audience] Set Selection Criteria',
  props<{ data: SelectionCriteria }>()
);

export const updateCriterionValue = createAction(
  '[Audience] Update Criterion Value',
  props<{ folderId: string; valueId: string; selected: boolean }>()
);

export const loadMockCriteria = createAction(
  '[Audience] Load Mock Criteria'
);
