import {BinaryService} from '../../services/binary.service';

export abstract class Package {
  type: string;
  flag: string;
  hopAddress: string;
  sourceAddress: string;

  baseFromBase64(base64: string): void {
    const buff = new Buffer(base64, 'base64');
    const data = buff.toString('utf-8');
    this.type = BinaryService.binToString(data.slice(0, 3));
    this.flag = BinaryService.binToString(data.slice(4, 7));
    this.hopAddress = BinaryService.binToString(data.slice(8, 15));
    this.sourceAddress = BinaryService.binToString(data.slice(16, 24));
  }

  abstract fromBase64(base64: string): void;

  abstract toBase64String(): string;
}
