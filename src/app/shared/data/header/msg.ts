import {Package} from './package';
import {BinaryService} from '../../services/binary.service';

export class MSG extends Package{
  destAddress: string;
  hopCount: string;
  sequence: string;
  msg: string;

  fromBase64(base64: string): void {
    this.baseFromBase64(base64);
    const buff = new Buffer(base64, 'base64');
    const data = buff.toString('utf-8');
    this.destAddress = BinaryService.binToString(data.slice(25, 32));
    this.hopCount = BinaryService.binToString(data.slice(33, 40));
    this.sequence = BinaryService.binToString(data.slice(41, 47));
    this.msg = BinaryService.binToString(data.slice(48));
  }

  toBase64String(): string {
    const binType = BinaryService.stringToBin(this.type);
    const binFlag = BinaryService.stringToBin(this.flag);
    const binHopAddress = BinaryService.stringToBin(this.hopAddress);
    const binSourceAddress = BinaryService.stringToBin(this.sourceAddress);
    const binDestAddress = BinaryService.stringToBin(this.destAddress);
    const binHopCount = BinaryService.stringToBin(this.hopCount);
    const binSequence = BinaryService.stringToBin(this.sequence);
    const binMsg = BinaryService.stringToBin(this.msg);
    // eslint-disable-next-line max-len
    const base64 = Buffer.from(binType + binFlag + binHopAddress + binSourceAddress + binDestAddress + binHopCount + binSequence).toString('base64');

    return base64 + Buffer.from(binMsg).toString('ascii');
  }
}
