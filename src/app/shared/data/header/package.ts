export abstract class Package {
  type: number;
  flag: number;
  hopAddress: number;
  prevHopAddress: number;

  constructor() {
    this.type = 0;
    this.flag = 0;
    this.hopAddress = 0;
    this.prevHopAddress = 0;
  }

  setProperties(type: number, flags: number, array: number[], msg: string): void {
    if (msg != null) {
      const key = 'msg';
      this[key] = msg.trim();
    }
    const newArray = [0].concat(array);
    for (let i = 0; i < newArray.length; i++) {
      const key = Object.keys(this)[i];
      if (key !== 'type' && key !== 'flag' && key !== 'msg') {
        this[key] = newArray[i];
      }
    }
  }

  toNumberArray(): number[] {
    const numbers = [];
    const typeFlag = this.type.toString(2).padStart(4, '0') + this.flag.toString(2).padStart(4, '0');
    numbers.push(parseInt(typeFlag, 2));
    for (const [key, value] of Object.entries(this)) {
      if (key !== 'type' && key !== 'flag' && key !== 'msg') {
        numbers.push(Number(value));
      }
    }
    return numbers;
  }

  toBase64String(): string {
    let rawMsg = '';
    const msgKey = 'msg';
    for (const [key, value] of Object.entries(this)) {
      if (key === msgKey) {
        rawMsg = value.toString().trim();
      }
    }
    return new Buffer(this.toNumberArray()).toString('base64') + rawMsg;
  }


}
