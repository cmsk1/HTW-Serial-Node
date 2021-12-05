import {Injectable} from '@angular/core';
import {Package} from '../data/header/package';
import {ACK} from '../data/header/ack';
import {MSG} from '../data/header/msg';
import {RERR} from '../data/header/rerr';
import {RREP} from '../data/header/rrep';
import {RREQ} from '../data/header/rreq';

@Injectable({
  providedIn: 'root'
})
export class PackageService {

  constructor() {
  }

  static getPackageFrom64(base64: string): Package {
    let value: Package = null;
    const buf = Buffer.from(base64.substring(0, 8), 'base64');
    const bufAll = Buffer.from(base64, 'base64');
    const arr = Array.prototype.slice.call(buf, 0);
    const arrAll = Array.prototype.slice.call(bufAll, 0);
    const tmpType = parseInt(arr[0].toString(2).padStart(8, '0').substring(0, 4), 2);
    const tmpFlag = parseInt(arr[0].toString(2).padStart(8, '0').substring(-4), 2);
    switch (tmpType) {
      case 0: {
        value = new RREQ();
        value.setProperties(tmpType, tmpFlag, arrAll, null);
        break;
      }
      case 1: {
        value = new RREP();
        value.setProperties(tmpType, tmpFlag, arrAll, null);
        break;
      }
      case 2: {
        value = new RERR();
        value.setProperties(tmpType, tmpFlag, arrAll, null);
        break;
      }
      case 3: {
        value = new MSG();
        value.setProperties(tmpType, tmpFlag, arr, base64.substring(8));
        break;
      }
      case 4: {
        value = new ACK();
        value.setProperties(tmpType, tmpFlag, arrAll, null);
        break;
      }
    }
    return value;
  }
}
