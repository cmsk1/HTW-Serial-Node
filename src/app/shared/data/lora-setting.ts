export class LoraSetting {
  address: string;
  configString: string;
  baudRate: number;
  addressIsSet: boolean;
  configIsSet: boolean;
  broadcastIsSet: boolean;

  constructor(address: string, configString: string, baudRate: number) {
    this.address = address;
    this.configString = configString;
    this.baudRate = baudRate;
    this.addressIsSet = false;
    this.configIsSet = false;
    this.broadcastIsSet = false;
  }
}
