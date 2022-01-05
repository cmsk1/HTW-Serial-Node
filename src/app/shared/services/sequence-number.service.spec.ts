import { TestBed } from '@angular/core/testing';

import { SequenceNumberService } from './sequence-number.service';

describe('SequenceNumberService', () => {
  let service: SequenceNumberService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SequenceNumberService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
