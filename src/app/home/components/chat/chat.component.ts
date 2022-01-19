/* eslint-disable space-before-function-paren */
import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {SerPort} from '../../../shared/data/ser-port';
import {ElectronService} from '../../../core/services';
import {LoraSetting} from '../../../shared/data/lora-setting';
import * as SerialPort from 'serialport';
import {ChatItem} from '../../../shared/data/chat-item';
import {ATStatus} from '../../enums/atstatus';
import {RawData} from '../../../shared/data/raw-data';
import * as lodash from 'lodash';
import {PackageService} from '../../../shared/services/package.service';
import {MSG} from '../../../shared/data/header/msg';
import {ACK} from '../../../shared/data/header/ack';
import {RERR} from '../../../shared/data/header/rerr';
import {RREQ} from '../../../shared/data/header/rreq';
import {RREP} from '../../../shared/data/header/rrep';
import {RoutingService} from '../../../shared/services/routing.service';
import {SequenceNumberService} from '../../../shared/services/sequence-number.service';
import {WaitForRoute} from '../../../shared/data/wait-for-route';
import {RerrPath} from '../../../shared/data/header/rerr-path';
import {
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
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
  routingService = RoutingService;
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
  destinationAddress = 255;
  packageToSend: MSG;
  ackAttempts = 0;
  routeAttempts = 0;
  waitForRoute: WaitForRoute[];
  routeToFind: RREQ;
  sentMSGGs: string[];
  messageToSend: string;
  tab: string;
  ackTimer: any;
  routeTimer: any;
  faTrashAlt = faTrashAlt;

  constructor(private electron: ElectronService, private changeDetection: ChangeDetectorRef) {
    this.loraSetting = new LoraSetting(93, 'CFG=434920000,5,6,12,4,1,0,0,0,0,3000,8,8', 115200);
    this.connected = 'NOT_CONNECTED';
    this.tab = 'CHAT';
    this.chat = [];
    this.rawData = [];
    this.waitForRoute = [];
    this.sentMSGGs = [];
    this.inputStringRaw = '';
    this.messageToSend = '';
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
    console.log(selectedPortID);
    this.selectedPort = this.ports.find(p => p.path === selectedPortID);
  }

  sendMessageToNode(str: string) {
    this.messageToSend = str;
    if (this.messageToSend && this.messageToSend.trim().length > 0) {
      const tmpString = 'AT+SEND=' + this.messageToSend.trim().length;
      this.atStatus = ATStatus.SENDING;
      this.serialWriteMessage(tmpString);
      console.log(PackageService.getPackageFrom64(this.messageToSend.trim()));
    }
  }

  sendRawMessage() {
    if (this.inputStringRaw && this.inputStringRaw.trim().length > 0) {
      this.serialWriteMessage(this.inputStringRaw);
      this.inputStringRaw = '';
    }
  }

  sendMessage() {
    const tmpMSG = new MSG();
    tmpMSG.destAddress = this.destinationAddress;
    tmpMSG.hopCount = 0;
    tmpMSG.sequence = SequenceNumberService.getNewSequenceNr();
    tmpMSG.msg = this.inputString.trim();
    this.inputString = '';
    this.sendMSGToDest(tmpMSG);
    this.chat.push(new ChatItem(tmpMSG.msg, this.loraSetting.address.toString(), true));

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
          RoutingService.addRoutingTableItem(this.loraSetting.address, 0, 0, this.loraSetting.address, []);
          setTimeout(() => {
            this.sendMessageToNode('' + this.loraSetting.address);
          }, 1000);
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
    // eslint-disable-next-line space-before-function-paren
    this.serialPort.write(text, function (err) {
      if (err) {
        self.atStatus = ATStatus.OK;
        self.chat.push(new ChatItem(err.message, 'SYSTEM', false));
        self.rawData.push(new RawData(err.message, true));
        self.changeDetection.detectChanges();
      }
    });
  }

  handleIncomingMessage(data: string) {
    console.log('incoming data:' + data);
    const dataArray = data.split(',');
    if (dataArray && dataArray.length >= 3) {
      const messageString = dataArray[3].trim();
      const pkg = PackageService.getPackageFrom64(messageString);
      console.log(pkg);
      if (pkg != null && this.isRelevant(pkg.hopAddress)) {
        if (pkg instanceof MSG) {
          if (this.isLocalAddress(pkg.destAddress)) {
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
        this.changeDetection.detectChanges();
      }
    }
  }

  handleMSGisReceived(pkg: MSG) {
    if (this.isLocalAddress(pkg.destAddress)) {
      const chatData = new ChatItem(pkg.msg, pkg.prevHopAddress.toString(), false);
      this.chat.push(chatData);
    } else {
      this.sendMSGToDest(pkg);
    }
    this.sendACK(pkg.prevHopAddress);
  }

  handleACKisReceived(pkg: ACK) {
    clearTimeout(this.ackTimer);
    this.packageToSend = null;
    this.ackAttempts = 0;
  }

  handleRREPisReceived(pkg: RREP) {
    if (this.isLocalAddress(pkg.destAddress)) {
      for (const item of this.waitForRoute) {
        if (item.routeRequest.requestId === pkg.requestId) {
          RoutingService.addRoutingTableItem(item.routeRequest.destAddress, pkg.hopCount, pkg.destSequence, pkg.prevHopAddress, []);
          this.waitForRoute = this.waitForRoute.filter(r => r.routeRequest.requestId !== pkg.requestId);
          clearTimeout(this.routeTimer);
          this.sendMSGToDest(item.msg);
          return;
        }
      }
    } else {
      // TODO: check if ho or node is for me
      this.redirectRouteReplay(pkg);
    }
  }

  handleRREQisReceived(pkg: RREQ) {
    // ECHO verwerfen
    for (const item of this.waitForRoute) {
      if (item.routeRequest.requestId === pkg.requestId && pkg.originAddress === this.loraSetting.address) {
        return;
      }
    }
    if (this.isLocalAddress(pkg.destAddress)) {
      this.sendRouteReplay(pkg);
    } else {
      this.redirectRouteRequest(pkg);
    }
  }

  handleRERRisReceived(pkg: RERR) {
    this.sendRouteError(pkg.paths[0].destAddress);
  }

  sendACK(prevHopAddress: number) {
    const ack = new ACK();
    ack.hopAddress = prevHopAddress;
    ack.prevHopAddress = this.loraSetting.address;
    this.sendMessageToNode(ack.toBase64String());
  }

  sendMSGToDest(pkg: MSG) {
    if (!this.sentMSGGs.includes(pkg.toBase64String())) {
      const route = RoutingService.getRoute(pkg.destAddress);
      const msg = new MSG();
      msg.hopCount = msg.hopCount + 1;

      msg.prevHopAddress = this.loraSetting.address;
      msg.destAddress = pkg.destAddress;
      msg.sequence = pkg.sequence;
      msg.msg = pkg.msg;

      if (route) {
        msg.hopAddress = route.nextHop;
        this.sendMessageToNode(msg.toBase64String());
        this.packageToSend = msg;
        console.log('Info: send message to dest ' + msg.destAddress + '.');
        const self = this;
        this.ackTimer = setTimeout(function () {
          if (self.ackAttempts > 3) {
            self.sendRouteError(self.packageToSend.hopAddress);
            self.ackAttempts = 0;
            self.packageToSend = null;
            clearTimeout(self.ackTimer);
          } else {
            self.ackAttempts = self.ackAttempts + 1;
            self.sendMSGToDest(self.packageToSend);
          }
        }, 50000);
      } else {
        this.sendNewRouteRequest(msg);
        console.log('Info: no route found, request new route');
      }
    } else {
      this.ackAttempts = 0;
      this.packageToSend = null;
      clearTimeout(this.ackTimer);
    }

  }

  sendNewRouteRequest(msg: MSG) {
    const req = new RREQ();
    req.hopCount = 0;
    req.hopAddress = 255;
    req.prevHopAddress = this.loraSetting.address;
    req.requestId = SequenceNumberService.getNewSequenceNr();
    req.destSequence = 0;
    req.destAddress = msg.destAddress;
    req.originAddress = this.loraSetting.address;
    req.originSequence = SequenceNumberService.getNewSequenceNr();
    this.waitForRoute.push(new WaitForRoute(msg, req));
    this.routeToFind = req;
    this.sendMessageToNode(req.toBase64String());
    const self = this;
    this.routeTimer = setTimeout(function () {
      self.routeToFind.requestId = SequenceNumberService.getNewSequenceNr();
      self.redirectRouteRequest(self.routeToFind);
      self.routeAttempts = 0;
      self.routeToFind = null;
      clearTimeout(self.routeTimer);
    }, 120000);
  }

  redirectRouteRequest(req: RREQ) {
    const self = this;
    setTimeout(function () {
      req.prevHopAddress = self.loraSetting.address;
      req.hopCount = req.hopCount + 1;
      RoutingService.addReverseRoutingTableItem(req);
      self.sendMessageToNode(req.toBase64String());
      console.log('Info: redirect route request for destination ' + req.destAddress + '.');
    }, 2345);
  }

  sendRouteReplay(req: RREQ) {
    const rep = new RREP();
    rep.hopCount = 0;
    rep.destAddress = req.originAddress;
    rep.destSequence = req.originSequence;
    rep.requestId = req.requestId;
    rep.originAddress = this.loraSetting.address;
    rep.ttl = 0;
    rep.prevHopAddress = this.loraSetting.address;
    rep.hopAddress = req.prevHopAddress;
    this.sendMessageToNode(rep.toBase64String());
    console.log('Info: sent route reply back to ' + rep.destAddress + '.');
  }

  redirectRouteReplay(rep: RREP) {
    const self = this;
    setTimeout(function () {
      const origin = RoutingService.getReverseRoute(rep.originAddress);
      if (origin) {
        rep.prevHopAddress = self.loraSetting.address;
        rep.hopAddress = origin.previousHop;
        rep.hopCount = rep.hopCount + 1;
        RoutingService.addRoutingTableItem(origin.destination, origin.metric, rep.destSequence, rep.hopAddress, [rep.prevHopAddress]);
        self.sendMessageToNode(rep.toBase64String());
        console.log('Info: redirected route reply.');
      } else {
        console.log('Error: could not redirect route replay, because no matching reverse route was found.');
      }
    }, 1345);

  }

  sendRouteError(invalidDestination: number) {
    const routes = RoutingService.getAllByNextHop(invalidDestination);

    let numbersToSend = [];
    const errs: RERR[] = [];

    for (const route of routes) {
      numbersToSend.push(route.precursors);
    }
    numbersToSend = Array.from(new Set(numbersToSend));
    for (const numbersToSendElement of numbersToSend) {
      const tmp = new RERR();
      tmp.prevHopAddress = this.loraSetting.address;
      tmp.hopAddress = numbersToSendElement;
      if (routes && routes.length > 0) {
        for (const route of routes) {
          const tmpPath = new RerrPath();
          tmpPath.destSequence = route.seqNum;
          tmpPath.destAddress = route.destination;
          RoutingService.invalidateRoute(route.destination);
          tmp.paths.push(tmpPath);
        }
        tmp.pathCount = tmp.paths.length;
        if (tmp.hopAddress !== this.loraSetting.address && tmp.hopAddress !== 0) {
          errs.push(tmp);
        }
      }
    }

    for (let i = 0; i < errs.length; i++) {
      setTimeout(() => {
          this.sendMessageToNode(errs[i].toBase64String());
          console.log('Info: send error notification to ' + errs[i].hopAddress + '.');
        },
        (i + 1) * 1500); // sende alle 1.5 sekunden
    }

  }

  initAT() {
    setTimeout(() => {
        this.checkAT();
        this.sendRawMessage();
        this.printTestData();
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

  isRelevant(dest: number) {
    return dest === this.loraSetting.address || dest === 255;
  }

  isLocalAddress(dest: number) {
    return dest === this.loraSetting.address;
  }

  removeReverseRoutingItem(item: ReverseRoutingTableItem) {
    RoutingService.removeReverseRoutingTableItem(item.requestId, item.destination);
    this.changeDetection.detectChanges();
  }

  removeRoutingItem(item: RoutingTableItem) {
    RoutingService.removeRoutingTableItem(item.destination);
    this.changeDetection.detectChanges();
  }

  removeWaitForRouteItem(item: WaitForRoute) {
    this.waitForRoute = this.waitForRoute.filter(i => i.routeRequest.requestId !== item.routeRequest.requestId);
    this.changeDetection.detectChanges();
  }

  printTestData() {
    /* const rep = new RREP();
     rep.hopCount = 0;
     rep.destAddress = this.loraSetting.address;
     rep.destSequence = 3;
     rep.requestId = 2;
     rep.originAddress = 2;
     rep.ttl = 0;
     rep.prevHopAddress = 2;
     rep.hopAddress = this.loraSetting.address;
     console.log(rep.toBase64String());
 */
  }
}
