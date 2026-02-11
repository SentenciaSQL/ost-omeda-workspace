import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private jwt: string | null = null;

  getJwt(): string | null {
    return this.jwt;
  }

  /** Simulate setting a JWT (in real app this comes from backend) */
  setJwt(token: string): void {
    this.jwt = token;
  }
}
