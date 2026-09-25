import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminTriviaAnalyticsComponent } from './admin-trivia-analytics.component';

describe('AdminTriviaAnalyticsComponent', () => {
  let component: AdminTriviaAnalyticsComponent;
  let fixture: ComponentFixture<AdminTriviaAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTriviaAnalyticsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminTriviaAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
