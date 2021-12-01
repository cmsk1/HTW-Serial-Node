export interface RREP {
  code: number; //4bit type, 4bit flags (type = 0001)
  hopAddress: number;
  sourceAddress: number;
  destAddress: number;
  hopCount: number;
  sequence: number;
  destSequence: number;
  requestId: number;
  ttl: number;
}
