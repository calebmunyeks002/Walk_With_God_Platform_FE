import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrayerComponent } from './prayer.component';

describe('PrayerComponent', () => {
  let component: PrayerComponent;
  let fixture: ComponentFixture<PrayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrayerComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PrayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
