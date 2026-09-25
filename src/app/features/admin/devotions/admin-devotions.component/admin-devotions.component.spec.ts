import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDevotionsComponent } from './admin-devotions.component';

describe('AdminDevotionsComponent', () => {
  let component: AdminDevotionsComponent;
  let fixture: ComponentFixture<AdminDevotionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDevotionsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminDevotionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
