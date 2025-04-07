import { TestBed } from '@angular/core/testing';

import { ImagecompressService } from './imagecompress.service';

describe('ImagecompressService', () => {
  let service: ImagecompressService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImagecompressService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
