import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {SerPort} from '../../../shared/data/ser-port';
import {ElectronService} from '../../../core/services';
import {LoraSetting} from '../../../shared/data/lora-setting';
import * as SerialPort from 'serialport';
import {ChatItem} from '../../../shared/data/chat-item';
import {ATStatus} from '../../enums/atstatus';
import {RawData} from '../../../shared/data/raw-data';
import * as lodash from 'lodash';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  ports: SerPort[];
  chat: ChatItem[];
  lodash = lodash;
  rawData: RawData[];
  nodes: string[];
  baudRates: number[];
  selectedNode: string;
  inputString: string;
  selectedPortId: string;
  content: string;
  connected: string;
  selectedPort: SerPort;
  loraSetting: LoraSetting;
  serialPort: SerialPort;
  parser: SerialPort.parsers.Delimiter;
  messageToSend: string;
  atStatus: ATStatus;
  showRaw: boolean;
  addressIsSet: boolean;
  configIsSet: boolean;

  constructor(private electron: ElectronService, private changeDetection: ChangeDetectorRef) {
    this.baudRates = [9600, 19200, 28800, 38400, 57600, 76800, 115200];
    this.loraSetting = new LoraSetting();
    this.loraSetting.address = '';
    this.loraSetting.configString = 'CFG=433000000,5,6,12,4,1,0,0,0,0,3000,8,8';
    this.loraSetting.baudRate = this.baudRates[6];
    this.nodes = [];
    this.nodes.push('FFFF');
    this.selectedNode = this.nodes[0];
    this.connected = 'NOT_CONNECTED';
    this.chat = [];
    this.rawData = [];
    this.messageToSend = '';
    this.showRaw = false;
    this.addressIsSet = false;
    this.configIsSet = false;
  }

  ngOnInit(): void {
    this.getAllPorts();
  }

  connectToPort() {
    this.connected = 'CONNECTING';
    this.serialPort = new this.electron.serialPort(this.selectedPort.path, {baudRate: Number(this.loraSetting.baudRate)});
    this.parser = this.serialPort.pipe(new this.electron.serialPort.parsers.Readline({delimiter: '\r\n'}));

    this.serialPort.on('open', () => {
      this.connected = 'CONNECTED';
      this.initAT();
    });
    this.serialPort.on('error', (err) => {
      this.rawData.push(new RawData(err.toString().trim(), false));
      this.connected = 'NOT_CONNECTED';
    });

    this.serialPort.on('data', data => {
      if (data && data.toString().trim() !== '') {
        this.rawData.push(new RawData(data.toString().trim(), false));
        this.changeDetection.detectChanges();
        this.handleReceivedData(data.toString().trim());
      }
    });
  }

  closePort() {
    this.serialPort.close();
    this.atStatus = null;
    this.connected = 'NOT_CONNECTED';
  }

  getAllPorts() {
    if (this.connected === 'CONNECTED') {
      this.closePort();
    }
    this.ports = null;
    this.selectedPort = null;
    this.selectedPortId = '';
    this.electron.serialPort.list().then((ports: SerPort[]) => {
      this.ports = ports;
    }).catch((err: any) => {
      console.log(err);
      this.connected = 'NOT_CONNECTED';
    });
  }

  selectPort(selectedPortID: string) {
    this.selectedPort = this.ports.find(p => p.path === selectedPortID);
  }

  sendMessageToNode() {
    if (this.inputString && this.inputString.trim().length > 0) {
      const tmpString = 'AT+DEST=' + this.selectedNode.trim();
      this.messageToSend = this.inputString;
      this.inputString = '';
      this.chat.push(new ChatItem(this.messageToSend, this.loraSetting.address, true));
      this.serialWriteMessage(tmpString);
    }
  }

  handleReceivedData(data: string) {
    if (data && data.length > 0) {
      // Wenn DEST gesetzt und OK,XXXX zurück kommt -> Länge senden
      if (data.toUpperCase().includes('AT,' + this.selectedNode.trim().toUpperCase() + ',OK')) {
        if (this.messageToSend !== '') {
          const tmpString = 'AT+SEND=' + this.messageToSend.trim().length;
          this.atStatus = ATStatus.SENDING;
          this.serialWriteMessage(tmpString);
        } else {
          this.atStatus = ATStatus.OK;
        }
      } else if (data.toUpperCase().includes('AT,OK') && this.atStatus === ATStatus.SENDING) {
        // Wenn länge gesetzt und OK zurück kommt -> Nachricht senden
        const tmpString = this.messageToSend.trim();
        this.serialWriteMessage(tmpString);
      } else if (data.toUpperCase().includes('AT,SENDING')) {
        // Wenn Nachricht gesendet und SENDET zurück kommt -> OK
        this.atStatus = ATStatus.SENDED;
        this.messageToSend = '';
      } else if (data.toUpperCase().includes('AT,SENDED')) {
        this.atStatus = ATStatus.OK;
      } else if (data.toUpperCase().includes('CPU_BUSY')) {
        this.atStatus = ATStatus.CPU_BUSY;
        this.chat.push(new ChatItem('CPU ist beschäftigt', 'SYSTEM', false));
      } else if (data.toUpperCase().includes('RF_BUSY')) {
        this.atStatus = ATStatus.RF_BUSY;
        this.chat.push(new ChatItem('RF ist beschäftigt', 'SYSTEM', false));
      } else if (data.toUpperCase().includes('SYMBLE')) {
        this.atStatus = ATStatus.SYMBLE;
        this.chat.push(new ChatItem('Die Daten sind ungültig', 'SYSTEM', false));
      } else if (data.toUpperCase().includes('PARA')) {
        this.atStatus = ATStatus.PARA;
        this.chat.push(new ChatItem('Die Parameter sind ungültig', 'SYSTEM', false));
      } else if (data.toUpperCase().includes('CMD')) {
        this.atStatus = ATStatus.CMD;
        this.chat.push(new ChatItem('Befehlsfehler', 'SYSTEM', false));
      } else if (data.toUpperCase().includes('AT,-') && data.toUpperCase().includes(',OK')) {
        this.atStatus = ATStatus.OK;
        this.chat.push(new ChatItem(this.parseData(data), 'INFO', false));
      } else if (data.toUpperCase().includes('AT,V') && data.toUpperCase().includes(',OK')) {
        this.atStatus = ATStatus.OK;
        this.chat.push(new ChatItem(this.parseData(data), 'INFO', false));
      } else if (data.toUpperCase().includes('AT,OK') && this.messageToSend === '') {

        if (!this.addressIsSet) {
          this.serialWriteMessage('AT+ADDR=' + this.loraSetting.address);
          this.addressIsSet = true;
        } else if (!this.configIsSet) {
          this.serialWriteMessage('AT+' + this.loraSetting.configString);
          this.configIsSet = true;
        } else {
          this.atStatus = ATStatus.OK;
        }
      }
    }
    this.changeDetection.detectChanges();
  }

  serialWriteMessage(text: string) {
    text = text.trim() + '\r\n';
    const self = this;
    this.rawData.push(new RawData(text, true));
    this.changeDetection.detectChanges();
    this.serialPort.write(text, function(err) {
      if (err) {
        self.atStatus = ATStatus.OK;
        self.chat.push(new ChatItem(err.message, 'SYSTEM', false));
        self.rawData.push(new RawData(err.message, true));
        self.changeDetection.detectChanges();
      }
    });
  }

  initAT() {
    this.serialWriteMessage('AT');
    this.changeDetection.detectChanges();
  }

  checkRSSI() {
    this.serialWriteMessage('AT+RSSI?');
    this.changeDetection.detectChanges();
  }

  checkAT() {
    this.serialWriteMessage('AT');
    this.changeDetection.detectChanges();
  }

  checkVrr() {
    this.serialWriteMessage('AT+VER?');
    this.changeDetection.detectChanges();
  }


  parseData(str: string) {
    return str.replace('AT,','').replace(',OK','');
  }


}
