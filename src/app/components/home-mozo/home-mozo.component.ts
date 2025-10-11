import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonFab, IonFabButton, IonBadge
} from '@ionic/angular/standalone';
import { chevronForwardOutline, logOutOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { FormsModule } from '@angular/forms';
import type { SegmentChangeEventDetail } from '@ionic/angular'; // o '@ionic/core' según tu versión
import { SupabaseService } from 'src/app/services/supabase.service';
import { Observable } from 'rxjs';
import { ChatService, MozoChatRow } from 'src/app/services/chat.service';

type EstadoPedido = 'aceptado' | 'aConfirmar' | 'pagoConfirmado' | 'entregado' | 'cancelado';

@Component({
  selector: 'app-home-mozo',
  standalone: true,
  templateUrl: './home-mozo.component.html',
  styleUrls: ['./home-mozo.component.scss'],
  imports: [
    CommonModule, DatePipe, CurrencyPipe,
    IonHeader, IonToolbar, IonContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonFab, IonFabButton, IonBadge, FormsModule
  ]
})
export class HomeMozoComponent implements OnInit {
  email!: Observable<string | null>;
  // pestaña activa
  tab: 'pedidos' | 'consultas' = 'pedidos';

  // MOCK: reemplazá luego por datos de tu servicio
  pedidos = [
    { id: 101, mesa: 4, estado: 'aceptado' as EstadoPedido,   cliente:'mercury@yopmail.com', fecha:'2024-11-20T19:39:00', total:18000 },
    { id: 102, mesa: 5, estado: 'aConfirmar' as EstadoPedido, cliente:'mars@yopmail.com',    fecha:'2024-11-23T06:50:00', total:0     },
    { id: 103, mesa: 1, estado: 'pagoConfirmado' as EstadoPedido, cliente:'flor@yopmail.com', fecha:'2024-11-23T06:59:00', total:21450 },
    { id: 104, mesa: 3, estado: 'pagoConfirmado' as EstadoPedido, cliente:'luna@yopmail.com', fecha:'2024-11-24T12:10:00', total:9200  },
  ];

  chats: MozoChatRow[] = [];


  constructor(private router: Router , private supa: SupabaseService,private chatSvc: ChatService) {
    addIcons({ chevronForwardOutline, logOutOutline, chatbubbleEllipsesOutline });
    this.email = this.supa.authEmail$;
  }

  ngOnInit() {
     this.email = this.supa.authEmail$;
      this.chatSvc.mozoChats$().subscribe(rows => this.chats = rows);
  }

  // navegación a detalle de pedido (ajustá la ruta real)
  abrirPedido(pedidoId: number) {
    this.router.navigate(['/mozo/pedido', pedidoId]);
  }
  abrirChat(roomId: number, mesa: number) {
    this.router.navigate(['/mozo/chat', roomId], { queryParams: { mesa } });
  }

  estadoClass(e: EstadoPedido) {
    switch (e) {
      case 'aceptado':        return 'st-aceptado';
      case 'aConfirmar':      return 'st-confirmar';
      case 'pagoConfirmado':  return 'st-pago';
      case 'entregado':       return 'st-entregado';
      case 'cancelado':       return 'st-cancelado';
      default:                return '';
    }
  }

  estadoLabel(e: EstadoPedido) {
    switch (e) {
      case 'aceptado':        return 'Pedido aceptado';
      case 'aConfirmar':      return 'Pedido a confirmar';
      case 'pagoConfirmado':  return 'Pago confirmado';
      case 'entregado':       return 'Entregado';
      case 'cancelado':       return 'Cancelado';
    }
  }

onTabChange(ev: CustomEvent<SegmentChangeEventDetail>) {
  const v = ev.detail.value;           // string | null
  if (v === 'pedidos' || v === 'consultas') {
    this.tab = v;
  }
}
  logout() {
    // hook para tu servicio de auth
    this.router.navigate(['/login']);
  }
}
