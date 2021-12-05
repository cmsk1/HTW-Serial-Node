import {Package} from './package';

export class MSG extends Package{
  destAddress: number;
  hopCount: number;
  sequence: number;
  msg: string;

  constructor() {
    super();
    this.type = 3;
    this.destAddress = 0;
    this.hopCount = 0;
    this.sequence = 0;
    this.msg = '';
  }

}
