import { TestBed } from '@angular/core/testing';

import { FireworkService } from './firework.service';

describe('FireworkService', () => {
  let service: FireworkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FireworkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
