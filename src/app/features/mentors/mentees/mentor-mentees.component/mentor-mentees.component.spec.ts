import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentorMenteesComponent } from './mentor-mentees.component';

describe('MentorMenteesComponent', () => {
  let component: MentorMenteesComponent;
  let fixture: ComponentFixture<MentorMenteesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorMenteesComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MentorMenteesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
