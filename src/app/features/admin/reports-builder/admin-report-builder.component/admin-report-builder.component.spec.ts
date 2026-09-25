import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReportBuilderComponent } from './admin-report-builder.component';

describe('AdminReportBuilderComponent', () => {
  let component: AdminReportBuilderComponent;
  let fixture: ComponentFixture<AdminReportBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReportBuilderComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminReportBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
