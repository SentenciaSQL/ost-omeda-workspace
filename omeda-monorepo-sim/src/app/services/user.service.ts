import { Injectable, signal } from '@angular/core';
import { UserInfo } from '../models/user-info.model';
import { OmedaPermission } from '../constants/permissions.constants';

@Injectable({ providedIn: 'root' })
export class UserService {
  /** Simulates the Navigation/User API response */
  private _userInfo = signal<UserInfo>({
    userId: 'user-sim-001',
    databaseId: 'env-sim-42',
    profileId: 'profile-sim-007',
    permissions: [
      OmedaPermission.VIEW_AUDIENCE,
      OmedaPermission.EDIT_AUDIENCE,
      OmedaPermission.AUDIENCE_BUILDER_AGENT, // Toggle this to test Task 2
    ],
    displayName: 'Andrés (Simulated)',
  });

  readonly userInfo = this._userInfo.asReadonly();

  hasPermission(permission: OmedaPermission): boolean {
    return this._userInfo().permissions.includes(permission);
  }

  /** Helper for simulation UI — toggle agent permission on/off */
  toggleAgentPermission(): void {
    const current = this._userInfo();
    const has = current.permissions.includes(OmedaPermission.AUDIENCE_BUILDER_AGENT);
    this._userInfo.set({
      ...current,
      permissions: has
        ? current.permissions.filter(p => p !== OmedaPermission.AUDIENCE_BUILDER_AGENT)
        : [...current.permissions, OmedaPermission.AUDIENCE_BUILDER_AGENT],
    });
  }
}
