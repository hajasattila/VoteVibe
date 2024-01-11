import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextPollComponent } from './text-poll.component';

describe('TextPollComponent', () => {
  let component: TextPollComponent;
  let fixture: ComponentFixture<TextPollComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextPollComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextPollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
