// =============================================================
// FILE: src/app/store/audience.reducer.ts
// =============================================================
import { createReducer, on } from '@ngrx/store';
import { SelectionCriteria } from '../models/selection-criteria.model';
import * as AudienceActions from './audience.actions';

export interface AudienceState {
  selectionCriteria: SelectionCriteria;
}

const initialState: AudienceState = {
  selectionCriteria: {
    criteria: [
      {
        folderId: 'folder-demo-1',
        folderName: 'Deployment Type',
        operator: 'OR',
        values: [
          { id: 'val-1', label: 'Digital', selected: true },
          { id: 'val-2', label: 'Print', selected: false },
          { id: 'val-3', label: 'Events', selected: true },
        ],
      },
      {
        folderId: 'folder-demo-2',
        folderName: 'Geography',
        operator: 'AND',
        values: [
          { id: 'val-4', label: 'North America', selected: true },
          { id: 'val-5', label: 'Europe', selected: false },
          { id: 'val-6', label: 'Asia Pacific', selected: false },
        ],
      },
      {
        folderId: 'folder-demo-3',
        folderName: 'Job Function',
        operator: 'OR',
        values: [
          { id: 'val-7', label: 'Engineering', selected: false },
          { id: 'val-8', label: 'Marketing', selected: true },
          { id: 'val-9', label: 'Executive', selected: false },
        ],
      },
    ],
    totalCount: 24580,
    lastModified: Date.now(),
  },
};

export const audienceReducer = createReducer(
  initialState,
  on(AudienceActions.setSelectionCriteria, (state, { data }) => ({
    ...state,
    selectionCriteria: data,
  })),
  on(AudienceActions.updateCriterionValue, (state, { folderId, valueId, selected }) => ({
    ...state,
    selectionCriteria: {
      ...state.selectionCriteria,
      lastModified: Date.now(),
      criteria: state.selectionCriteria.criteria.map(c =>
        c.folderId === folderId
          ? {
            ...c,
            values: c.values.map(v =>
              v.id === valueId ? { ...v, selected } : v
            ),
          }
          : c
      ),
    },
  })),
  on(AudienceActions.loadMockCriteria, () => initialState)
);

