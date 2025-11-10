# Árbol de Flujos Completo - Tridente de la Gloria

## Leyenda
- `[toast]` - Notificación visual (ToastrService o ToastController)
- `[alert]` - Diálogo modal (AlertController)
- `[modal]` - Modal Ionic (ModalController)
- `[notif]` - Notificación local/dispositivo
- `[action-sheet]` - Action Sheet Ionic

---

```
/login – loginComponent [toast]
├─ Botón "Registrarme" → /register – RegisterComponent
│   ├─ RegistroClienteComponent [toast][alert cámara] → éxito vuelve a /login
│   └─ RegistroClienteAnonimoComponent [toast] → éxito redirige /home-cliente
└─ Login ok → /home – HomeComponent [toast logout][notif sesión]
    │
    ├─ Perfil admin → /home-admin – HomeAdminComponent [toast][notif]
    │   ├─ /admin/pendientes – PendientesComponent [toast][alert]
    │   ├─ /admin/alta-usuario – AltaUsuarioComponent [toast]
    │   ├─ /admin/mesas – MesasComponent [modal alta mesa]
    │   │   ├─ /admin/alta-mesa – AltaMesaComponent [toast][modal dismiss]
    │   │   └─ /admin/mesas/editar/:id – AltaMesaComponent (modo edición) [toast][modal dismiss]
    │   ├─ /admin/reservas – ReservasAdminComponent [alert asignaciones]
    │   ├─ /admin/notas → /pagina-resultados-encuestas – ResultadosEncuestasComponent
    │   ├─ /admin/delivery-pedidos – DeliveryPedidosComponent [toast][alert][modal]
    │   │   └─ [MODAL] SelectDeliveryComponent [toast][modal] – Selección de delivery para asignar
    │   └─ /admin/delivery-confirmar-pago – DeliveryConfirmarPagoComponent [toast]
    │
    ├─ Perfil maitre → /home-maitre – HomeMaitreComponent [notif]
    │   ├─ /scan/mesa – ScannerMesaComponent [alert QR inválido]
    │   ├─ /maitre/lista-espera – ListaEsperaComponent [toast][action-sheet]
    │   └─ /maitre/mesa/:id – MesaInfoComponent – Info de mesa específica
    │
    ├─ Perfil mozo → /home (condicional) – HomeMozoComponent [toast][alert]
    │   ├─ /mozo/chat/:roomId – ChatComponent
    │   └─ /mozo/confirmar-pago – ConfirmarPagoComponent [toast][alert efectivo]
    │
    ├─ Perfil bartender/cocinero → /home-bartender-cocinero – HomeBartenderCocineroComponent
    │   ├─ /bartender-cocinero/nuevo-plato – NuevoPlatoComponent [toast]
    │   ├─ /bartender-cocinero/nueva-bebida – NuevaBebidaComponent [toast]
    │   ├─ /bartender-cocinero/verificar-pendientes-cocinero – VerificarPendientesCocineroComponent [toast]
    │   └─ /bartender-cocinero/verificar-pendientes-bartender – VerificarPendientesBartenderComponent [toast]
    │
    ├─ Perfil delivery → /home-delivery – HomeDeliveryComponent [toast][alert][modal][notif]
    │   ├─ [MODAL] MapaRutaComponent [toast] – Mapa con ruta para pedido
    │   ├─ /delivery/chat/:roomId – ChatComponent
    │   └─ (Nota: /delivery/mapa-ruta NO existe como ruta, solo como modal)
    │
    └─ Perfil cliente → /home-cliente – HomeClienteComponent [toast][alert][notif]
        ├─ Escanear QR tipo 'ingreso' → /ingreso-cliente – IngresoClienteComponent [toast]
        │   └─ Permite inscribirse en lista de espera
        ├─ Escanear QR tipo 'mesa' → /cliente-pedido-en-curso [toast][alert]
        ├─ Botón "Hacer reserva" → /cliente/hacer-reserva – HacerReservaComponent [toast][alert]
        ├─ "Pedidos delivery" → /cliente/cliente-realiza-pedido – ClienteRealizaPedidoComponent [toast][alert]
        │   ├─ [MODAL] DireccionDeliveryComponent [toast][modal] – Selección dirección con mapa
        │   └─ (Nota: ClienteConsultaMozoComponent existe pero está vacío/no usado)
        ├─ "Ver cuenta" → /cliente-detalle-cuenta – ClienteDetalleCuentaComponent [toast][alert]
        ├─ "Ver juegos" → /cliente/cliente-juegos – ClienteJuegosComponent
        │   ├─ /juegos/tap – TapComponent [toast][router redirect]
        │   ├─ /juegos/memoria – MemoriaComponent [toast]
        │   └─ /juegos/trivia – TriviaComponent [toast]
        ├─ "Ver encuestas" → /pagina-resultados-encuestas – PaginaResultadosEncuestasPage
        │   └─ (También accesible desde /resultados-encuestas - ruta duplicada)
        └─ "Pagar / Encuesta" → /form-encuesta – PaginaFormularioEncuestaPage [toast]
            └─ Retorna a /cliente-pedido-en-curso o /home-cliente

Rutas adicionales:
- /cliente/chat/:pedidoId – ChatComponent (acceso directo para cliente)
- /cliente-pedido-en-curso – ClientePedidoEnCursoComponent (también accesible desde juegos)
```

## Componentes Modales (sin ruta propia)

### 1. DireccionDeliveryComponent
- **Abre desde**: ClienteRealizaPedidoComponent
- **Propósito**: Seleccionar dirección de entrega con mapa interactivo
- **Interacciones**: [toast][modal]
- **Retorna**: DireccionDelivery { direccion, latitud, longitud }

### 2. SelectDeliveryComponent
- **Abre desde**: DeliveryPedidosComponent (admin)
- **Propósito**: Seleccionar usuario delivery para asignar pedido
- **Interacciones**: [toast][modal]
- **Retorna**: { idDelivery, usuario }

### 3. MapaRutaComponent
- **Abre desde**: HomeDeliveryComponent
- **Propósito**: Mostrar mapa con ruta para pedido delivery
- **Interacciones**: [toast][modal]
- **Nota**: NO tiene ruta `/delivery/mapa-ruta`, solo existe como modal

## Componentes No Utilizados

### ClienteConsultaMozoComponent
- **Estado**: Vacío/incompleto
- **Ruta**: No tiene
- **Uso**: No se usa en ningún lugar
- **Acción recomendada**: Eliminar o implementar

## Rutas Duplicadas

- `/resultados-encuestas` y `/pagina-resultados-encuestas` → Ambas apuntan a PaginaResultadosEncuestasPage
- **Recomendación**: Eliminar una o documentar por qué existen ambas

## Notas Importantes

1. **HomeMozoComponent**: No tiene ruta dedicada, se muestra condicionalmente en `/home` cuando el usuario es mozo
2. **AltaMesaComponent**: Maneja tanto creación (`/admin/alta-mesa`) como edición (`/admin/mesas/editar/:id`)
3. **ChatComponent**: Tiene 3 rutas diferentes según el rol:
   - `/cliente/chat/:pedidoId` - Cliente
   - `/mozo/chat/:roomId` - Mozo
   - `/delivery/chat/:roomId` - Delivery
4. **IngresoClienteComponent**: Se accede principalmente desde escaneo QR tipo 'ingreso' desde home-cliente
5. **MesaInfoComponent**: Se accede desde maitre para ver información de una mesa específica

## Total de Componentes

- **Componentes con ruta**: 40+
- **Componentes modales**: 3
- **Componentes no utilizados**: 1 (ClienteConsultaMozoComponent)
- **Rutas duplicadas**: 2 (resultados-encuestas)

