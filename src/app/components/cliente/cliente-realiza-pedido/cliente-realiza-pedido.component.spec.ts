import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ClienteRealizaPedidoComponent } from './cliente-realiza-pedido.component';

describe('ClienteRealizaPedidoComponent', () => {
  let component: ClienteRealizaPedidoComponent;
  let fixture: ComponentFixture<ClienteRealizaPedidoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ClienteRealizaPedidoComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteRealizaPedidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
