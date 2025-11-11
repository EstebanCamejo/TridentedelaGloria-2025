import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PoliticaDePrivacidadComponent } from './politica-de-privacidad.component';

describe('PoliticaDePrivacidadComponent', () => {
  let component: PoliticaDePrivacidadComponent;
  let fixture: ComponentFixture<PoliticaDePrivacidadComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PoliticaDePrivacidadComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PoliticaDePrivacidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
