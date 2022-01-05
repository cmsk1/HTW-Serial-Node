import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SequenceNumberService {

  static sequenceNr = 0;

  constructor() {
  }

  static twosComplementSubtract(a: number, b: number) {
    // eslint-disable-next-line no-bitwise
    return a + (~b + 1);
  }

  static withBitOverflow(nr: number) {
    return new Int8Array([nr])[0];
  }

  static isSeqNumNewer(incoming: number, current: number): boolean {
    return this.withBitOverflow(this.twosComplementSubtract(incoming, current)) > 0;
  }

  static getNewSequenceNr(): number {
    if (this.sequenceNr >= 255) {
      this.sequenceNr = 0;
    }
    this.sequenceNr = this.sequenceNr + 1;
    return this.sequenceNr;
  }
}
