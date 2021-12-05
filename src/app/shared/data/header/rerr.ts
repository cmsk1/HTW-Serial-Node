import {RerrPath} from './rerr-path';
import {Package} from './package';

export class RERR extends Package {
  pathCount: number;
  paths: RerrPath[];

  constructor() {
    super();
    this.type = 2;
    this.pathCount = 0;
    this.paths = [];
  }


  setProperties(type: number, flags: number, array: number[], msg: string) {
    const newArray = [0].concat(array);
    for (let i = 0; i < newArray.length; i++) {
      const key = Object.keys(this)[i];
      if (key !== 'type' && key !== 'flag' && key !== 'paths' && key !== undefined) {
        this[key] = newArray[i];
      }
    }
    let path = new RerrPath();
    path.destAddress = array[4];
    path.destSequence = array[5];
    this.paths.push(path);

    if (this.pathCount > 1) {
      let co3 = 6;
      for (let i = 0; i < this.pathCount - 1; i++) {
        path = new RerrPath();
        path.destAddress = array[co3];
        path.destSequence = array[co3 + 1];
        this.paths.push(path);
        co3 = co3 + 3;
      }
    }
  }

  toNumberArray(): number[] {
    const numbers = [];
    const typeFlag = this.type.toString(2).padStart(4, '0') + this.flag.toString(2).padStart(4, '0');
    numbers.push(parseInt(typeFlag, 2));
    for (const [key, value] of Object.entries(this)) {
      if (key !== 'type' && key !== 'flag' && key !== 'paths') {
        numbers.push(Number(value));
      }
    }
    numbers.push(Number(this.paths[0].destAddress));
    numbers.push(Number(this.paths[0].destSequence));
    if (this.paths.length > 1) {
      for (let i = 1; i < this.paths.length; i++) {
        numbers.push(Number(this.paths[i].destAddress));
        numbers.push(Number(this.paths[i].destSequence));
        numbers.push(0);
      }
    }
    return numbers;
  }
}
