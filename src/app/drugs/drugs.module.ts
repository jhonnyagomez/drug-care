import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { AddComponent } from './add/add.component';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../../environments/environmnets';



@NgModule({
  declarations: [
    DashboardComponent,
    AddComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    FormsModule,

  ],
  providers: [
    provideHttpClient(),
  ],
})
export class DrugsModule { }
