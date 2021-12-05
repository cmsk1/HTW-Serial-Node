import {Package} from './package';

export class RREQ extends Package {
  requestId: number;
  destAddress: number;
  destSequence: number;
  hopCount: number;
  originAddress: number;
  originSequence: number;

  constructor() {
    super();
    this.type = 0;
    this.requestId = 0;
    this.destAddress = 0;
    this.destSequence = 0;
    this.hopCount = 0;
    this.originAddress = 0;
    this.originSequence = 0;
  }
}
