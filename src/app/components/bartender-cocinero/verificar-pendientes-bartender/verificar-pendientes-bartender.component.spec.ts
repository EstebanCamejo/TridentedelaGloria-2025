import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { VerificarPendientesBartenderComponent } from './verificar-pendientes-bartender.component';

describe('VerificarPendientesBartenderComponent', () => {
  let component: VerificarPendientesBartenderComponent;
  let fixture: ComponentFixture<VerificarPendientesBartenderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VerificarPendientesBartenderComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(VerificarPendientesBartenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
