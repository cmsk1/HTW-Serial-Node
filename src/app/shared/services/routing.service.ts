import {Injectable} from '@angular/core';
import {RoutingTableItem} from '../data/routing-table-item';
import {ReverseRoutingTableItem} from '../data/reverse-routing-table-item';
import {RREQ} from '../data/header/rreq';
import {SequenceNumberService} from './sequence-number.service';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {

  static routingTable: RoutingTableItem[] = [];
  static reverseRoutingTable: ReverseRoutingTableItem[] = [];

  constructor() {
    RoutingService.routingTable = [];
    RoutingService.reverseRoutingTable = [];
  }

  static addRoutingTableItem(dest: number, metric: number, seq: number, nextHop: number, precursors: number[]) {

    const found = this.routingTable.find(item => item.destination === dest);

    if (found != null && found.destination === dest) {
      if (SequenceNumberService.isSeqNumNewer(seq, found.seqNum) || metric < found.metric) {
        RoutingService.removeRoutingTableItem(found.destination);
        const tmp = new RoutingTableItem();
        tmp.metric = metric;
        tmp.destination = dest;
        tmp.seqNum = seq;
        tmp.nextHop = nextHop;
        tmp.precursors = precursors;
        tmp.isValid = true;
        RoutingService.routingTable.push(tmp);
        console.log('Info: routing table (des: ' + dest + ') was updated.');
      }
    } else {
      const tmp = new RoutingTableItem();
      tmp.metric = metric;
      tmp.destination = dest;
      tmp.seqNum = seq;
      tmp.nextHop = nextHop;
      tmp.precursors = precursors;
      tmp.isValid = true;
      RoutingService.routingTable.push(tmp);
      console.log('Info: routing table (des: ' + dest + ') was created.');
    }
  }

  static addPrecursors(dest: number, precursors: number[]) {
    const found = this.routingTable.find(item => item.destination === dest);
    if (found != null && found.destination === dest) {
      for (const foundElement of precursors) {
        found.precursors.push(foundElement);
      }
    }
    console.log('Info: precursors was added to destination ' + dest + '.');
  }

  static removeRoutingTableItem(dest: number) {
    RoutingService.routingTable = RoutingService.routingTable.filter(item => item.destination !== dest);
  }

  static addReverseRoutingTableItem(req: RREQ) {
    const tmp = new ReverseRoutingTableItem();
    tmp.metric = req.hopCount;
    tmp.destination = req.destAddress;
    tmp.source = req.originAddress;
    tmp.requestId = req.requestId;
    tmp.previousHop = req.hopAddress;
    this.reverseRoutingTable.push(tmp);
    console.log('Info: reverse routing table item (ID: ' + req.requestId + ') was created.');
  }

  static removeReverseRoutingTableItem(requestId: number, destination: number) {
    // eslint-disable-next-line max-len
    RoutingService.reverseRoutingTable = RoutingService.reverseRoutingTable.filter(item => item.requestId !== requestId && item.destination !== destination);
  }

  static getRoute(dest: number): RoutingTableItem {
    return RoutingService.routingTable.find(item => item.destination === dest && item.isValid);
  }

  static getAllByNextHop(nextHop: number): RoutingTableItem[] {
    return RoutingService.routingTable.filter(item => item.nextHop === nextHop);
  }

  static getReverseRoute(ori: number) {
    return RoutingService.reverseRoutingTable.find(item => item.source === ori);
  }
  static invalidateRoute(ori: number) {
    if (RoutingService.routingTable.find(item => item.destination === ori)) {
      RoutingService.routingTable.find(item => item.destination === ori).isValid = false;
    }
  }
}
