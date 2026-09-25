import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentorDashboardComponent } from './mentor-dashboard.component';

describe('MentorDashboardComponent', () => {
  let component: MentorDashboardComponent;
  let fixture: ComponentFixture<MentorDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorDashboardComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MentorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
