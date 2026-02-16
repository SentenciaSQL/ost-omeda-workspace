import { Injectable, signal } from '@angular/core';
import { UIAction } from '../models/ui-actions.model';

export interface UIActionResult {
  actionId: string;
  action: UIAction;
  status: 'success' | 'error';
  error?: string;
}

@Injectable()
export class UIActionEmitterService {
  /** Queue of actions to emit to host */
  private readonly _pendingActions = signal<UIAction[]>([]);
  private readonly _results = signal<UIActionResult[]>([]);

  /** Callback set by the host component to handle UI actions */
  private hostHandler: ((action: UIAction) => Promise<UIActionResult>) | null = null;

  readonly pendingActions = this._pendingActions.asReadonly();
  readonly results = this._results.asReadonly();

  /** Host registers its handler */
  registerHandler(handler: (action: UIAction) => Promise<UIActionResult>): void {
    this.hostHandler = handler;
  }

  /**
   * Parse an agent response payload into UI actions
   * and execute them sequentially.
   */
  async executeActions(actions: UIAction[]): Promise<UIActionResult[]> {
    const results: UIActionResult[] = [];

    for (const action of actions) {
      this._pendingActions.update(q => [...q, action]);

      try {
        const result = await this.executeAction(action);
        results.push(result);
      } catch (err: any) {
        results.push({
          actionId: crypto.randomUUID(),
          action,
          status: 'error',
          error: err.message,
        });
      }

      this._pendingActions.update(q => q.filter(a => a !== action));
    }

    this._results.update(r => [...r, ...results]);
    return results;
  }

  private async executeAction(action: UIAction): Promise<UIActionResult> {
    if (!this.hostHandler) {
      throw new Error('No host handler registered. Cannot execute UI action.');
    }
    return this.hostHandler(action);
  }

  /**
   * Parse the agent's skittle plan payload into granular UI actions.
   * This breaks down a bulk "applySkittlePlan" into individual steps.
   */
  parseSkittlePlan(payload: any): UIAction[] {
    const actions: UIAction[] = [];

    if (!payload?.criteria) return actions;

    for (const criterion of payload.criteria) {
      // 1. Expand the folder
      actions.push({
        type: 'expandFolder',
        folderId: criterion.folderId,
      });

      // 2. Select values
      const selectedIds = (criterion.values || [])
        .filter((v: any) => v.selected)
        .map((v: any) => v.id);

      if (selectedIds.length > 0) {
        actions.push({
          type: 'selectValues',
          folderId: criterion.folderId,
          valueIds: selectedIds,
          selected: true,
        });
      }

      // 3. Handle date fields if present
      if (criterion.dateFrom && criterion.dateTo) {
        actions.push({
          type: 'setDate',
          folderId: criterion.folderId,
          fieldId: criterion.dateFieldId ?? 'default',
          from: criterion.dateFrom,
          to: criterion.dateTo,
        });
      }

      // 4. Handle search fields if present
      if (criterion.searchQuery) {
        actions.push({
          type: 'setSearch',
          folderId: criterion.folderId,
          fieldId: criterion.searchFieldId ?? 'default',
          query: criterion.searchQuery,
        });
      }

      // 5. Handle demographic selections if present
      if (criterion.demographicOptions?.length > 0) {
        actions.push({
          type: 'selectDemographic',
          folderId: criterion.folderId,
          fieldId: criterion.demographicFieldId ?? 'default',
          optionIds: criterion.demographicOptions,
        });
      }
    }

    return actions;
  }
}
