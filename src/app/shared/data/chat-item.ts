export class ChatItem {
  from: string;

  date: Date;
  isSend: boolean;
  text: string;

  constructor(text: string, from: string, isSend: boolean) {
    this.text = text;
    this.from = from;
    this.date = new Date();
    this.isSend = isSend;
  }

}
