import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminTriviaComponent } from './admin-trivia.component';

describe('AdminTriviaComponent', () => {
  let component: AdminTriviaComponent;
  let fixture: ComponentFixture<AdminTriviaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTriviaComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminTriviaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
