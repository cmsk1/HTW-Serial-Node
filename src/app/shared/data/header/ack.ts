import {Package} from './package';
import {BinaryService} from '../../services/binary.service';

export class ACK extends Package{
  fromBase64(base64: string): void {
    this.baseFromBase64(base64);
  }

  toBase64String(): string {
    const binType = BinaryService.stringToBin(this.type);
    const binFlag = BinaryService.stringToBin(this.flag);
    const binHopAddress = BinaryService.stringToBin(this.hopAddress);
    const binSourceAddress = BinaryService.stringToBin(this.sourceAddress);
    return Buffer.from(binType + binFlag + binHopAddress + binSourceAddress).toString('base64');
  }
}
