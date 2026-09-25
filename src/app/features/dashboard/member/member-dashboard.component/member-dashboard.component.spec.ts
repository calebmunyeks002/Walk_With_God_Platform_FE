import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberDashboardComponent } from './member-dashboard.component';

describe('MemberDashboardComponent', () => {
  let component: MemberDashboardComponent;
  let fixture: ComponentFixture<MemberDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberDashboardComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MemberDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
