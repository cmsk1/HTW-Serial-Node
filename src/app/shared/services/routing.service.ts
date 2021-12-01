import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {

  knownNodes: number[];

  constructor() {
    this.knownNodes = [0];
  }
}
