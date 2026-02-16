export type UIAction =
  | ExpandFolderAction
  | SelectValuesAction
  | SetDateAction
  | SetSearchAction
  | SelectDemographicAction
  | ClearAllAction;

export interface ExpandFolderAction {
  type: 'expandFolder';
  folderId: string;
  /** Optionally expand to a specific depth */
  depth?: number;
}

export interface SelectValuesAction {
  type: 'selectValues';
  folderId: string;
  valueIds: string[];
  /** true = select, false = deselect */
  selected: boolean;
}

export interface SetDateAction {
  type: 'setDate';
  folderId: string;
  fieldId: string;
  from: string;  // ISO date
  to: string;    // ISO date
}

export interface SetSearchAction {
  type: 'setSearch';
  folderId: string;
  fieldId: string;
  query: string;
}

export interface SelectDemographicAction {
  type: 'selectDemographic';
  folderId: string;
  fieldId: string;
  optionIds: string[];
}

export interface ClearAllAction {
  type: 'clearAll';
}
