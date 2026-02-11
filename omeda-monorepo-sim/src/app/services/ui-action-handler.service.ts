import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
// These imports reference the monorepo sim's own files:
// import * as AudienceActions from '../store/audience.actions';

/**
 * All UIAction types the chatbot can emit.
 * Must match omeda-agent-frontend/src/app/models/ui-actions.model.ts
 */
interface UIAction {
  type: 'expandFolder' | 'selectValues' | 'setDate' | 'setSearch' | 'selectDemographic' | 'clearAll';
  [key: string]: any;
}

interface UIActionResult {
  actionId: string;
  action: UIAction;
  status: 'success' | 'error';
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class UIActionHandlerService {
  private readonly store = inject(Store);

  // Track expanded folders for the UI
  private expandedFolders = new Set<string>();

  /**
   * Handle a single UIAction from the chatbot.
   * Each action type maps to an existing Omeda operation.
   */
  async handle(action: UIAction): Promise<UIActionResult> {
    const actionId = crypto.randomUUID();

    try {
      switch (action.type) {
        case 'expandFolder':
          return this.handleExpandFolder(actionId, action);

        case 'selectValues':
          return this.handleSelectValues(actionId, action);

        case 'setDate':
          return this.handleSetDate(actionId, action);

        case 'setSearch':
          return this.handleSetSearch(actionId, action);

        case 'selectDemographic':
          return this.handleSelectDemographic(actionId, action);

        case 'clearAll':
          return this.handleClearAll(actionId, action);

        default:
          return { actionId, action, status: 'error', error: `Unknown action type: ${action.type}` };
      }
    } catch (err: any) {
      console.error(`[UIActionHandler] Error handling ${action.type}:`, err);
      return { actionId, action, status: 'error', error: err.message };
    }
  }

  /**
   * Handle a batch of UIActions sequentially.
   * Adds a small delay between actions for visual feedback.
   */
  async handleBatch(actions: UIAction[]): Promise<UIActionResult[]> {
    const results: UIActionResult[] = [];

    for (const action of actions) {
      const result = await this.handle(action);
      results.push(result);

      // Small delay between actions for visual effect
      if (actions.indexOf(action) < actions.length - 1) {
        await new Promise(r => setTimeout(r, 150));
      }
    }

    return results;
  }

  // -------------------------------------------------------
  // Individual action handlers
  // -------------------------------------------------------

  private async handleExpandFolder(
    actionId: string, action: UIAction
  ): Promise<UIActionResult> {
    const { folderId, depth } = action;
    console.log(`[UIAction] Expanding folder: ${folderId} (depth: ${depth ?? 'all'})`);

    // In real repo: call the tree component's expand API
    // e.g. this.treeService.expandNode(folderId, depth);
    this.expandedFolders.add(folderId);

    // Simulate the expansion
    await this.simulateDelay(100);

    return { actionId, action, status: 'success' };
  }

  private async handleSelectValues(
    actionId: string, action: UIAction
  ): Promise<UIActionResult> {
    const { folderId, valueIds, selected } = action;
    console.log(
      `[UIAction] ${selected ? 'Selecting' : 'Deselecting'} values in ${folderId}:`,
      valueIds
    );

    // Dispatch NgRx action for each value
    // In the real repo, this maps to the existing checkbox dispatch
    for (const valueId of valueIds) {
      this.store.dispatch({
        type: '[Audience] Update Criterion Value',
        folderId,
        valueId,
        selected,
      } as any);

      // Small stagger for visual effect
      await this.simulateDelay(50);
    }

    return { actionId, action, status: 'success' };
  }

  private async handleSetDate(
    actionId: string, action: UIAction
  ): Promise<UIActionResult> {
    const { folderId, fieldId, from, to } = action;
    console.log(`[UIAction] Setting date in ${folderId}/${fieldId}: ${from} → ${to}`);

    // In real repo: find the date picker component and set values
    // e.g. this.datePickerService.setValue(folderId, fieldId, { from, to });

    // For simulation, dispatch a generic update
    this.store.dispatch({
      type: '[Audience] Set Date Range',
      folderId,
      fieldId,
      from,
      to,
    } as any);

    await this.simulateDelay(100);

    return { actionId, action, status: 'success' };
  }

  private async handleSetSearch(
    actionId: string, action: UIAction
  ): Promise<UIActionResult> {
    const { folderId, fieldId, query } = action;
    console.log(`[UIAction] Setting search in ${folderId}/${fieldId}: "${query}"`);

    // In real repo: find the search input and set value
    // e.g. this.searchService.setValue(folderId, fieldId, query);

    // For simulation, dispatch a generic update
    this.store.dispatch({
      type: '[Audience] Set Search Query',
      folderId,
      fieldId,
      query,
    } as any);

    await this.simulateDelay(100);

    return { actionId, action, status: 'success' };
  }

  private async handleSelectDemographic(
    actionId: string, action: UIAction
  ): Promise<UIActionResult> {
    const { folderId, fieldId, optionIds } = action;
    console.log(`[UIAction] Selecting demographics in ${folderId}/${fieldId}:`, optionIds);

    // In real repo: find the dropdown and set selections
    // e.g. this.dropdownService.setSelections(folderId, fieldId, optionIds);

    this.store.dispatch({
      type: '[Audience] Select Demographics',
      folderId,
      fieldId,
      optionIds,
    } as any);

    await this.simulateDelay(100);

    return { actionId, action, status: 'success' };
  }

  private async handleClearAll(
    actionId: string, action: UIAction
  ): Promise<UIActionResult> {
    console.log('[UIAction] Clearing all selections');

    this.expandedFolders.clear();

    // In real repo: dispatch the existing "reset" action
    this.store.dispatch({ type: '[Audience] Load Mock Criteria' } as any);

    await this.simulateDelay(200);

    return { actionId, action, status: 'success' };
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------

  isExpanded(folderId: string): boolean {
    return this.expandedFolders.has(folderId);
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
