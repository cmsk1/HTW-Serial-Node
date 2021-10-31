export class RawData {
  data: string;
  date: Date;
  isSend: boolean;

  constructor(data: string, isSend: boolean) {
    this.data = data;
    this.isSend = isSend;
    this.date = new Date();
  }

}
