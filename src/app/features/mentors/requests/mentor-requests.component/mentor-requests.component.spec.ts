import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentorRequestsComponent } from './mentor-requests.component';

describe('MentorRequestsComponent', () => {
  let component: MentorRequestsComponent;
  let fixture: ComponentFixture<MentorRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorRequestsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MentorRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
