export interface SelectionCriterion {
  folderId: string;
  folderName: string;
  values: FolderValue[];
  operator: 'AND' | 'OR' | 'NOT';
}

export interface FolderValue {
  id: string;
  label: string;
  selected: boolean;
}

export interface SelectionCriteria {
  criteria: SelectionCriterion[];
  totalCount: number;
  lastModified: number;
}
