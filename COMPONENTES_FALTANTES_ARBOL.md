# Componentes Faltantes en el Árbol de Flujos

## ✅ Componentes con Rutas que NO están en el árbol:

1. **`/ingreso-cliente` - IngresoClienteComponent** [toast]
   - Acceso: Escaneo QR tipo 'ingreso' desde home-cliente
   - Flujo: Permite inscribirse en lista de espera
   - Interacciones: Toast para mensajes, modal para formulario

2. **`/maitre/mesa/:id` - MesaInfoComponent**
   - Acceso: Desde maitre (probablemente desde lista-espera o scanner)
   - Flujo: Muestra información de una mesa específica
   - Interacciones: Solo lectura, sin toasts/alerts

3. **`/admin/mesas/editar/:id` - AltaMesaComponent (modo edición)**
   - Acceso: Desde admin/mesas al editar una mesa existente
   - Flujo: Mismo componente que alta-mesa pero en modo edición
   - Interacciones: Toast, modal dismiss

4. **`/resultados-encuestas` - PaginaResultadosEncuestasPage**
   - Acceso: Ruta alternativa a `/pagina-resultados-encuestas`
   - Flujo: Duplicado de la ruta principal
   - Nota: Es redundante con `/pagina-resultados-encuestas`

5. **`/home-mozo` - HomeMozoComponent** [toast][alert]
   - Acceso: Se muestra condicionalmente en `/home` cuando el usuario es mozo
   - Flujo: Home del mozo (no tiene ruta dedicada, se muestra en /home)
   - Interacciones: Toast, alert, navegación a chat y confirmar pago
   - Nota: Aunque no tiene ruta dedicada, es un componente importante del flujo

## 📦 Componentes MODALES (sin ruta, pero importantes):

6. **DireccionDeliveryComponent** [toast][modal]
   - Acceso: Modal desde ClienteRealizaPedidoComponent
   - Flujo: Selección de dirección de entrega con mapa interactivo
   - Interacciones: Toast para validación, ModalController para cerrar/confirmar

7. **SelectDeliveryComponent** [toast][modal]
   - Acceso: Modal desde DeliveryPedidosComponent (admin)
   - Flujo: Selección de usuario delivery para asignar pedido
   - Interacciones: Toast para validación, ModalController

8. **MapaRutaComponent** [toast][modal]
   - Acceso: Modal desde HomeDeliveryComponent
   - Flujo: Muestra mapa con ruta para pedido delivery
   - Interacciones: Toast, modal
   - Nota: El árbol menciona `/delivery/mapa-ruta` pero NO existe esa ruta en routes.ts

## ⚠️ Componentes Incompletos/No Utilizados:

9. **ClienteConsultaMozoComponent**
   - Estado: Componente vacío (solo constructor y ngOnInit vacío)
   - No tiene ruta
   - No se usa en ningún lugar
   - Acción: Podría eliminarse o implementarse

## 🔄 Rutas Duplicadas:

- `/resultados-encuestas` y `/pagina-resultados-encuestas` → Ambas apuntan a PaginaResultadosEncuestasPage

## 📝 Recomendaciones para Actualizar el Árbol:

1. Agregar `/ingreso-cliente` como hijo de home-cliente (acceso por QR scan)
2. Agregar `/maitre/mesa/:id` como hijo de home-maitre
3. Especificar que `/admin/alta-mesa` también maneja edición con `:id`
4. Agregar modales como notas en los componentes que los abren:
   - DireccionDeliveryComponent en ClienteRealizaPedidoComponent
   - SelectDeliveryComponent en DeliveryPedidosComponent
   - MapaRutaComponent en HomeDeliveryComponent
5. Eliminar referencia a `/delivery/mapa-ruta` como ruta (es solo modal)
6. Considerar eliminar `/resultados-encuestas` duplicado o documentar por qué existe
7. Documentar que HomeMozoComponent se muestra en `/home` condicionalmente

