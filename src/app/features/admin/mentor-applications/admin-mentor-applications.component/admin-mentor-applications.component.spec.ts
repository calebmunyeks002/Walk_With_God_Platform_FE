import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminMentorApplicationsComponent } from './admin-mentor-applications.component';

describe('AdminMentorApplicationsComponent', () => {
  let component: AdminMentorApplicationsComponent;
  let fixture: ComponentFixture<AdminMentorApplicationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMentorApplicationsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminMentorApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
