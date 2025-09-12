import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RegistroClienteAnonimoComponent } from './registro-cliente-anonimo.component';

describe('RegistroClienteAnonimoComponent', () => {
  let component: RegistroClienteAnonimoComponent;
  let fixture: ComponentFixture<RegistroClienteAnonimoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RegistroClienteAnonimoComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroClienteAnonimoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
