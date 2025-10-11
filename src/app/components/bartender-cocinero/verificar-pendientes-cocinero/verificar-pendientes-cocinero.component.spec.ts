import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { VerificarPendientesCocineroComponent } from './verificar-pendientes-cocinero.component';

describe('VerificarPendientesCocineroComponent', () => {
  let component: VerificarPendientesCocineroComponent;
  let fixture: ComponentFixture<VerificarPendientesCocineroComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VerificarPendientesCocineroComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(VerificarPendientesCocineroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
