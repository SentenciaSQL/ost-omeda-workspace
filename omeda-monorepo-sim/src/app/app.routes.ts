import { Routes } from '@angular/router';
import {AudienceBuilderComponent} from './features/audience-builder/audience-builder.component';

export const routes: Routes = [
  { path: '', redirectTo: 'audience-builder', pathMatch: 'full' },
  { path: 'audience-builder', component: AudienceBuilderComponent },
];
