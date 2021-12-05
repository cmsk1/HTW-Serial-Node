import {Injectable} from '@angular/core';
import {RoutingTableItem} from '../data/routing-table-item';
import {ReverseRoutingTableItem} from '../data/reverse-routing-table-item';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {

  routingTable: RoutingTableItem[];
  reverseRoutingTable: ReverseRoutingTableItem[];

  constructor() {
    this.routingTable = [];
    this.reverseRoutingTable = [];
  }

  addRoutingTableItem() {

  }

  removeRoutingTableItem() {

  }

  addReverseRoutingTableItem() {

  }

  removeReverseRoutingTableItem() {

  }

  getRoute(dest: number): RoutingTableItem {
    return null;
  }

  getReverseRoute(dest: number) {

  }
}
