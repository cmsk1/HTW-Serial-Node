import {RERRPATH} from './rerr-path';

export interface RERR {
  code: number; //4bit type, 4bit flags (type = 0010)
  hopAddress: number;
  sourceAddress: number;
  pathCount: number;
  paths: RERRPATH[];
}
