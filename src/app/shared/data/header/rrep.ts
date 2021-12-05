import {Package} from './package';

export class RREP extends Package{
  requestId: number;
  destAddress: number;
  destSequence: number;
  hopCount: number;
  originAddress: number;
  ttl: number;

  constructor() {
    super();
    this.type = 1;
    this.requestId = 0;
    this.destAddress = 0;
    this.destSequence = 0;
    this.hopCount = 0;
    this.originAddress = 0;
    this.ttl = 0;
  }
}
