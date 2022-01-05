import {MSG} from './header/msg';
import {RREQ} from './header/rreq';

export class WaitForRoute {
  msg: MSG;
  routeRequest: RREQ;
  attempts: number;

  constructor(msg: MSG, routeRequest: RREQ) {
    this.msg = msg;
    this.routeRequest = routeRequest;
    this.attempts = 0;
  }
}
