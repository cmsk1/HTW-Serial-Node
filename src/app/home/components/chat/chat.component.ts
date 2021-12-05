import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {SerPort} from '../../../shared/data/ser-port';
import {ElectronService} from '../../../core/services';
import {LoraSetting} from '../../../shared/data/lora-setting';
import * as SerialPort from 'serialport';
import {ChatItem} from '../../../shared/data/chat-item';
import {ATStatus} from '../../enums/atstatus';
import {RawData} from '../../../shared/data/raw-data';
import * as lodash from 'lodash';
import {Package} from '../../../shared/data/header/package';
import {RoutingTableItem} from '../../../shared/data/routing-table-item';
import {ReverseRoutingTableItem} from '../../../shared/data/reverse-routing-table-item';

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
  selectedNode: string;
  inputString: string;
  inputStringRaw: string;
  selectedPortId: string;
  content: string;
  connected: string;
  selectedPort: SerPort;
  loraSetting: LoraSetting;
  serialPort: SerialPort;
  parser: SerialPort.parsers.Delimiter;
  atStatus: ATStatus;

  nodes: string[];

  routingTable: RoutingTableItem[];
  reverseRoutingTable: ReverseRoutingTableItem[];

  constructor(private electron: ElectronService, private changeDetection: ChangeDetectorRef) {
    this.loraSetting = new LoraSetting('', 'CFG=433000000,5,6,12,4,1,0,0,0,0,3000,8,8', 115200);
    this.nodes = [];
    this.addNote('FFFF');
    this.selectedNode = this.nodes[0];
    this.connected = 'NOT_CONNECTED';
    this.chat = [];
    this.rawData = [];
    this.routingTable = [];
    this.reverseRoutingTable = [];
    this.inputStringRaw = '';
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

    this.parser.on('data', data => {
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
    this.chat = [];
    this.rawData = [];
    this.inputStringRaw = '';
    this.loraSetting.addressIsSet = false;
    this.loraSetting.configIsSet = false;
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
      const tmpString = 'AT+SEND=' + this.inputString.trim().length;
      this.atStatus = ATStatus.SENDING;
      this.chat.push(new ChatItem(this.inputString, this.loraSetting.address, true));
      this.serialWriteMessage(tmpString);
    }
  }

  sendRawMessage() {
    if (this.inputStringRaw && this.inputStringRaw.trim().length > 0) {
      this.serialWriteMessage(this.inputStringRaw);
      this.inputStringRaw = '';
    }
  }

  handleReceivedData(data: string) {
    if (data && data.length > 0) {
      if (data.toUpperCase().includes('AT,SENDING')) {
        this.atStatus = ATStatus.SENDED;
        this.inputString = '';
      } else if (data.toUpperCase().includes('AT,SENDED')) {
        // Set Ok on msg sent
        this.atStatus = ATStatus.OK;
      } else if (data.toUpperCase().includes('LR,')) {
        // Handle incoming packages
        this.handleIncommingMessage(data);
      } else if (data.toUpperCase().includes('CPU_BUSY') || data.toUpperCase().includes('RF_BUSY')) {
        // Handle System-Error
        this.atStatus = ATStatus.SYSTEM_ERROR;
        setTimeout(() => {
          this.checkAT();
        }, 2000);
      } else if (data.toUpperCase().includes('AT,OK')) {

        // Check initial settings on AT,OK
        if (!this.loraSetting.addressIsSet) {
          this.serialWriteMessage('AT+ADDR=' + this.loraSetting.address);
          this.loraSetting.addressIsSet = true;
        } else if (!this.loraSetting.configIsSet) {
          this.serialWriteMessage('AT+' + this.loraSetting.configString);
          this.loraSetting.configIsSet = true;
        } else if (!this.loraSetting.broadcastIsSet) {
          this.serialWriteMessage('AT+DEST=FFFF');
          this.loraSetting.broadcastIsSet = true;
        } else if (this.atStatus === ATStatus.SENDING) {
          // Wenn länge gesetzt und OK zurück kommt -> Nachricht senden
          const tmpString = this.inputString.trim();
          this.serialWriteMessage(tmpString);
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

  handleIncommingMessage(data: string) {
    const dataArray = data.split(',');
    if (dataArray && dataArray.length > 3) {
      // TODO Handle Protocol Data correctly

      const [, sender, length, ...message] = data.split(',');
      const messageString = message.join(',');

      const chatData = new ChatItem(messageString, dataArray[1], false);
      this.chat.push(chatData);
    }
  }

  initAT() {
    setTimeout(() => {
        this.serialWriteMessage('AT');
        this.changeDetection.detectChanges();
      },
      1000);
  }

  checkAT() {
    this.serialWriteMessage('AT');
    this.changeDetection.detectChanges();
  }

  parseData(str: string) {
    return str.replace('AT,', '').replace(',OK', '');
  }

  addNote(addr: string) {
    if (addr && addr.trim().length > 0) {
      addr = addr.trim();
      if (!this.nodes.includes(addr)) {
        this.nodes.push(addr);
      }
    }
  }

  removeNote(addr: string) {
    if (addr && addr.trim().length > 0) {
      addr = addr.trim();
      if (this.nodes.includes(addr)) {
        this.nodes = this.nodes.filter(e => e !== addr);
      }
    }
  }

  sendPackage(pkg: Package) {
    this.serialWriteMessage(pkg.toBase64String());
  }
}
