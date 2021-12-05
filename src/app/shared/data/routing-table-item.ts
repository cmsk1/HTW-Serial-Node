export class RoutingTableItem {
  destination: number;
  nextHop: number;
  precursors: number;
  metric: number;
  seqNum: number;
  isValid: boolean;
}
