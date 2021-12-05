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
import {NetworkStatus} from '../../enums/network-status';
import {PackageService} from '../../../shared/services/package.service';
import {MSG} from '../../../shared/data/header/msg';
import {ACK} from '../../../shared/data/header/ack';
import {RERR} from '../../../shared/data/header/rerr';
import {RREQ} from '../../../shared/data/header/rreq';
import {RREP} from '../../../shared/data/header/rrep';
import {RoutingService} from '../../../shared/services/routing.service';

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
  networkStatus: NetworkStatus;
  destinationAddress = 255;
  packageToSend: Package;
  messageToSend: string;

  constructor(private electron: ElectronService, private changeDetection: ChangeDetectorRef, private routingService: RoutingService) {
    this.loraSetting = new LoraSetting(0, 'CFG=433000000,5,6,12,4,1,0,0,0,0,3000,8,8', 115200);
    this.connected = 'NOT_CONNECTED';
    this.chat = [];
    this.rawData = [];
    this.inputStringRaw = '';
    this.messageToSend = '';
    this.networkStatus = NetworkStatus.SEARCH_NETWORK;
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
    this.messageToSend = '';
    this.loraSetting.addressIsSet = false;
    this.loraSetting.configIsSet = false;
    this.loraSetting.broadcastIsSet = false;
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
    if (this.messageToSend && this.messageToSend.trim().length > 0) {
      const tmpString = 'AT+SEND=' + this.messageToSend.trim().length;
      this.atStatus = ATStatus.SENDING;
      this.serialWriteMessage(tmpString);
    }
  }

  sendRawMessage() {
    if (this.inputStringRaw && this.inputStringRaw.trim().length > 0) {
      this.serialWriteMessage(this.inputStringRaw);
      this.inputStringRaw = '';
    }
  }

  sendMessage() {
    this.messageToSend = this.inputString.trim();
    this.inputString = '';
    this.sendMessageToNode();
    this.chat.push(new ChatItem(this.messageToSend, this.loraSetting.address.toString(), true));
  }

  handleReceivedData(data: string) {
    if (data && data.length > 0) {
      if (data.toUpperCase().includes('AT,SENDING')) {
        this.atStatus = ATStatus.SENDED;
      } else if (data.toUpperCase().includes('AT,SENDED')) {
        // Set Ok on msg sent
        this.atStatus = ATStatus.OK;
      } else if (data.toUpperCase().includes('LR,')) {
        // Handle incoming packages
        this.handleIncomingMessage(data);
      } else if (data.toUpperCase().includes('CPU_BUSY') || data.toUpperCase().includes('RF_BUSY')) {
        // Handle System-Error
        this.atStatus = ATStatus.SYSTEM_ERROR;
        setTimeout(() => {
          this.checkAT();
        }, 2000);
      } else if (data.toUpperCase().includes('AT,OK')) {

        // Check on AT,OK
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
          const tmpString = this.messageToSend.trim();
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

  handleIncomingMessage(data: string) {
    const dataArray = data.split(',');
    if (dataArray && dataArray.length >= 3) {
      const messageString = dataArray[2].trim();
      const pkg = PackageService.getPackageFrom64(messageString);
      if (pkg != null && this.isRelevant(pkg.hopAddress)) {
        if (pkg instanceof MSG) {
          if (this.isLocalAddress(5)) {
            const chatData = new ChatItem(pkg.msg, pkg.prevHopAddress.toString(), false);
            this.chat.push(chatData);
          } else {
            this.sendMSGToDest(pkg);
          }
          this.sendACK(pkg.prevHopAddress);
        }
        if (pkg instanceof ACK) {
          this.handleACKisReceived(pkg);
        }
        if (pkg instanceof RERR) {
          this.handleRERRisReceived(pkg);
        }
        if (pkg instanceof RREQ) {
          this.handleRREQisReceived(pkg);
        }
        if (pkg instanceof RREP) {
          this.handleRREPisReceived(pkg);
        }
      }
    }
  }

  handleACKisReceived(pkg: ACK) {
    console.log(pkg);
  }

  handleRREPisReceived(pkg: ACK) {
    console.log(pkg);
  }

  handleRREQisReceived(pkg: ACK) {
    console.log(pkg);
  }

  handleRERRisReceived(pkg: ACK) {
    console.log(pkg);
  }

  sendACK(prevHopAddress: number) {
    const ack = new ACK();
    ack.hopAddress = prevHopAddress;
    ack.prevHopAddress = this.loraSetting.address;
    this.messageToSend = ack.toBase64String();
    this.sendMessageToNode();
  }

  sendMSGToDest(pkg: MSG) {
    const route = this.routingService.getRoute(pkg.destAddress);
    const msg = new MSG();
    msg.hopCount = msg.hopCount + 1;

    msg.prevHopAddress = this.loraSetting.address;
    msg.destAddress = pkg.destAddress;
    msg.sequence = 0; // TODO: Sequenznummer ?????

    if (route) {
      msg.hopAddress = route.nextHop;
      this.messageToSend = msg.toBase64String();
      this.sendMessageToNode();
    } else {
      this.packageToSend = msg;
      // sendRouteRequest()
    }
  }

  sendRouteRequest(pkg: Package) {

  }

  sendRouteReplay(pkg: Package) {

  }

  sendRouteError(pkg: Package) {

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

  sendPackage(pkg: Package) {
    this.serialWriteMessage(pkg.toBase64String());
  }

  isRelevant(dest: number) {
    return dest === this.loraSetting.address || dest === 255;
  }

  isLocalAddress(dest: number) {
    return dest === this.loraSetting.address;
  }
}
