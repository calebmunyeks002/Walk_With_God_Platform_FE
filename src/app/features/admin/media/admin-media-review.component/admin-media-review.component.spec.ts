import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminMediaReviewComponent } from './admin-media-review.component';

describe('AdminMediaReviewComponent', () => {
  let component: AdminMediaReviewComponent;
  let fixture: ComponentFixture<AdminMediaReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMediaReviewComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminMediaReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
