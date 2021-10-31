import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';
import { ChatComponent } from './components/chat/chat.component';

@NgModule({
  declarations: [HomeComponent, ChatComponent],
  imports: [CommonModule, SharedModule, HomeRoutingModule]
})
export class HomeModule {}
