import { TestBed } from '@angular/core/testing';

import { RoommemberguardService } from './roommemberguard.service';

describe('RoommemberguardService', () => {
  let service: RoommemberguardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoommemberguardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
