# El tridente de la gloria🍴

<img width="179" height="219" alt="488039206-32abba29-e5fe-418d-bd17-2637ea8a77a2" src="https://github.com/user-attachments/assets/02a354da-5dfc-4909-a3b7-268c63f91d97" />



## 📖 Descripción
> Esta aplicación móvil facilita la gestión de información y operaciones en un restaurante, optimizando la experiencia de los usuarios y el personal.  
> Mediante el uso de la cámara y la lectura de códigos QR, se mejora la administración y la interacción con los clientes, empleados y supervisores.  
> La aplicación permite la gestión de altas de personal, clientes y productos, así como el uso de códigos QR para diversas funcionalidades como reservas, pedidos , juegos y encuestas de satisfacción.
---

## 👩‍💻 Integrantes 👩‍💻
- Camejo Esteban
- Dorbessan Sofia
- Ivan Laurito  
---

## 📲 Arquitectura del Proyecto 📲

| Nombre             | URL                                   | Descripción |
|--------------------|---------------------------------------|-------------|
| Node.js            | [nodejs.org](https://nodejs.org/en/) | v20.17 |
| Ionic Framework    | [ionicframework.com](https://ionicframework.com/) | v7.2 |
| Angular            | [angular.dev](https://angular.dev/) | v18 |
| Supabase Storage   | [supabase.com](https://supabase.com/) | Authentication , Database & Almacenamiento de imágenes |
| Capacitor          | [capacitorjs.com](https://capacitorjs.com/) | Acceso a cámara y lectura QR |

---

## 💻 Objetivos a desarrollar 💻

### 📆 Semana 1: *Sábado 06/09 al 13/09*
**Diseño**
- Icono → *Sofia Dorbessan*  
- Splash estático / animado → *Sofia Dorbessan* 
- Login → *Sofia Dorbessan*
- Formulario registro cliente → *Sofia Dorbessan*

**Gestión**
- Creación de proyecto + vinculacion con Supabase → *Esteban Camejo*
- Servicio admin + verificacion de correo → *Esteban Camejo*
- Servicio de sesión / login / validación formularios → *Sofia Dorbessan*  

✅ **Entrega:** Video con Splash + Diseño de login + Diseño de registro y formularios validados

### 📆 Semana 2: *Sábado 13/09 al 20/09*
**Diseño**
- Creacion y diseño pantallas home cliente → *Sofia Dorbessan*
- Correo revision usuario → *Sofia Dorbessan*
- Diseño home admin → *Sofia Dorbessan*
- Diseño home maitre → *Sofia Dorbessan*

**Gestión**
- Servicio QR → *Esteban Camejo*
- Servicio Mesas → *Esteban Camejo*
- Servicio Admin-Pendientes (Pendiente dar de alta usuario) → *Esteban Camejo*
- Servicio Admin-AltaMesa → *Esteban Camejo*
- Storage imagen clientes → *Sofia Dorbessan*
- SendGrid para enviar mail de aceptacion o rechazo al cliente (admin) → *Esteban Camejo*

**Altas**
- Alta cliente / cliente anónimo (funcionalidad completa de registro de clientes + validacion errores + dni scanner) → *Sofia Dorbessan*
- Alta Mesa → *Esteban Camejo*
- Confirmacion de usuarios por parte del Admin → *Esteban Camejo*


✅ **Entrega:**  Envio de captura de pantalla del diseño general de la app y los componentes

### 📆 Semana 3: *Sábado 20/09 al 27/09*
//Crrecciones:

- A alta de mesa y clientes pendientes le falta estilos, los formularios deben ser siempre iguales, es decir usen como ejemplo el de registro.
- Los botones de alta de usuarios y alta de mesa no contrastan bien con el fondo.
Los títulos blancos tampoco se distinguen.


**Diseño**
- Arreglo de las correcciones esteticas realizadas por el profesor → *Sofia Dorbessan*

**Gestión**
 - Servicio Sonidio iniciar sesion + cerrar sesion → *Sofia Dorbessan*
 - Servicio Vibracion ante errores → *Sofia Dorbessan*
 - Servicio Spinner → *Sofia Dorbessan*
 - Push notification alta cliente (Admin) → *Esteban Camejo*

**Altas**
- Alta Empleados (Admin) → *Esteban Camejo*

  ✅ **Entrega:**
  //correcciones realizadas de la visual + videos puntos 5,6,7,8 y 9
  ### 📆 Semana 4: *Sábado 27/09 al 04/10*
  //correcion: 
Github: correcto.
Pantalla de clientes pendientes: por lo que entiendo ponen un check verde o un acruz roja imagino que es para hacer una acción o sea eso sería un botón? si es así procuren hacerlo más grande porque un dedo normal tiene que procurar de no tocar la equivocada, o sea puede tocar cualquiera por error.
Pantalla Maitre: tienen 2 botones, que ocupen toda la pantalla, eso aplíquenlo a cualquier pantalla similar.

**Diseño**
  - Arreglo de las correcciones esteticas realizadas por el profesor → *Sofia Dorbessan*
  - Home juegos → *Sofia Dorbessan*
  - Juegos: Trivia , Memoria y Tap Rapido → *Sofia Dorbessan*
  - Vista Cliente pedido en curso → *Sofia Dorbessan*
  - Encuesta por parte de los clientes → *Esteban Camejo*
  - Resultado encuestas (Graficos) → *Esteban Camejo*
  - Alta Plato y bebida → *Ivan Laurito*
  - Home Bartender → *Ivan Laurito*
  - Home Cocinero → *Ivan Laurito*

**Gestión**
- Componente maitre cliente ingresa al local , gestion de asignar mesa al cliente (lado del maitre y lado del cliente)→ *Sofia Dorbessan*
- Push notificacion maitre nueva incorporacion a la lista de espera → *Sofia Dorbessan*
- Push notification cliente mesa asignada → *Sofia Dorbessan*
- Escanneo QR para ingreso local: Lista de espera → *Sofia Dorbessan*
- Componente Juegos → *Sofia Dorbessan*
- Pagina Formulario Encuesta → *Esteban Camejo*
- Pagina Resultados encuesta → *Esteban Camejo*
- Componenete Menu → *Ivan Laurito*
- Alta De Plato → *Ivan Laurito*
- Alta De Bebida → *Ivan Laurito*

  **Altas**
- Alta Plato y bebida → *Ivan Laurito*

  ✅ **Entrega:**
- Correccion realizada en la anterior entrega :vista admin y vista maitre
- Puntos 1, 2 ,3 y 4.
- Funcionalidad Juegos
-   
  ## 📆 Semana 5: *Sábado 04/10 al 11/10* PARCIAL
  //correccion:
  - El readme esta OK
- Icono OK
- Splash estático OK
- Splash dinámico OK
- Login con accesos rápidos OK
- Punto 1 En el alta de empleado el contraste de texto negro con el fondo rojo oscuro no se lee bien. Falta spinner en carga y debería navegar a la home del sueño o supervisor después del alta exitosa
- La home del cocinero y bartender debería ser igual (una tiene barra de navegación texto blanco y la otra negro y el de negro no se lee nada)
- La home de cocinero y bartender la veo OK, por ahi solo le agrandaría todavía un poco mas el texto de los botones y el icono
- La home de administrador se ve cortado el texto del navbar por la cámara (Usar atributo safe area para prevenir eso), más allá de eso la home se ve OK
- Punto 2 En el alta de comida los contrastes del texto con el fondo de los inputs no deja leer nada y el botón eliminar donde aparecen las fotos parece que estuviera cortado. Funcionalmente está OK y el menú se ve bien también
- Punto 3 En el alta de bebida los contrastes del texto con el fondo de los inputs no deja leer nada y el botón eliminar donde aparecen las fotos parece que estuviera cortado. Funcionalmente está OK y el menú se ve bien también
- Punto 4 En el alta de mesa el formulario es distinto a los anteriores se debería mantener consistencia, la foto debería ser bastante mas chica del estilo de las fotos en los productos, Estaria bueno que también mantengan consistencia en el uso de spinner con el icono de la app más allá de que el botón diga guardando. El QR no queda bien ahí, una vez crean mesa deben volver a la home y en la pantalla de listado de mesas ahí deben verificar que se vea la mesa creada con el QR asociado (Tiene que haber listado de mesas por si quieren modificar alguna ya creada)
- La parte de los juegos agrandar mas el icono y textos de los botones y los botones en si para que no quede tanto espacio libre. En los propios juegos tratar de ocupar mas pantalla, no hace falta toda pero si casi toda sin scroll (En trivia queda mucho libre y en memotest queda muy grande generando scroll)
- En panel de clientes pendientes el creado queda mal ahi como metido al costado del estado, podría ir debajo o encima pero no al costado porque además salta de línea, el resto esta OK
- En panel de maitre no está bien ya que no debería poder escanear una mesa, las acciones son lista de espera, listado de mesas para ver estado, número, etc y crear cliente registrado
- En el panel de pedido en curso, si ya está en curso no debería tener el botón de crear pedido de nuevo porque es uno por cliente, debería tener los datos del pedido que hizo del precio total y tiempo y no estar en cero (Esto debería desaparecer una vez el pedido es entregado). Podría tener ver pedido en tal caso para tener el detalle de lo que pidió, plato/bebida, cantidades, etc
- Panel lista de espera de maitre mejorar un poco el contraste porque el placeholder de sin imagen se mezcla con el fondo de la pantalla y gris con negro no se lee del todo bien, el resto se ve OK

**Diseño**
- Arreglo de correciones de diseño realizadas ->*Sofia Dorbessan*
- Componte Mozo ->*Sofia Dorbessan*
- Chat ->*Sofia Dorbessan*
- Componente cliente realiza pedido ->*Sofia Dorbessan*
- Listado de productos a recibir del sector cocina → *Ivan Laurito*
- Listado de productos a recibir del sector bar → *Ivan Laurito*


**Gestión**
- Arreglo funcioanlidades punto 1 y 4 (ABM MESAS)→ *Esteban Camejo*
- Servicio Chat ->*Sofia Dorbessan*
- Componente cliente realiza pedido ->*Sofia Dorbessan*
- Cambio de estado de los pedidos recibidos por la cocina y/o bar → *Ivan Laurito*

  ✅ **Entrega:**

- Correccion realizada en la anterior entrega.
- Videos realizados hasta el momento: Punto 1, 2 , 3 , 4 , 5 , 6 , 7 , 8 y 15.

  ## 📆 Semana 6: Sábado 11/10 al 18/10 ENTREGA EXTENDIDA
  //correccion: no hubo correcciones por el parcial

*Diseño*
- Panel pedido en curso -> Sofia Dorbessan
- Panel Mozo (pendientes + chat)-> Sofia Dorbessan
- Panel pendientes Cocinero y Bartender -> Sofia Dorbessan
- Diseño pago y propina  → Esteban Camejo


*Gestión*
- Flujo QR propinas → Esteban Camejo
- Flujo Cliente realiza el pago + propinas → Esteban Camejo
- Push notifications Mozo Estado Pedido  → Esteban Camejo
- Flujo estado pedido Mozo supabase + home mozo → Esteban Camejo
- Push notification Cliente Estado Pedido -> Sofia Dorbessan
- Flujo estado pedido cliente supabase + home cliente -> Sofia Dorbessan
  

  ✅ *Entrega:*
- Correcciones realizadas en todas las entregas.
- Puntos funcionando del 1 al 19 + Requerimientos excluyentes.

    ## 📆 Semana 7: Sábado 18/10 al 25/10 
  //correccion: no hubo correcciones 

*Diseño*
- Home cliente Reservas -> Sofia Dorbessan
- Home Mozo Reservas -> Sofia Dorbessan
- Correo Aceptacion/Rechazo reservas -> Sofia Dorbessan
- Factura pago Cliente  → Esteban Camejo

*Gestión*
- Flujo QR propinas → Esteban Camejo
- Flujo Cliente realiza el pago + descuento juegos → Esteban Camejo
- Push notifications Mozo/Cliente/Adimin flujo pedido  → Esteban Camejo
- Componente Reservas Cliente y Admin -> Sofia Dorbessan
- Push notifications Cliente/Admin Reservas -> Sofia Dorbessan  

  ✅ *Entrega:*
- Puntos funcionando del 1 al 19 + Requerimientos excluyentes.

  ## 📲 Imagenes de la aplicacion 📲

| Imagen             | Explicacion                                   
|--------------------|---------------------------------------|
| <img width="312" height="649" alt="image" src="https://github.com/user-attachments/assets/d15bbfbf-186c-4296-bfff-b0655d00f713" /> | Inicio de sesion con boton de usuarios (acceso rapido) desplegado |
| <img width="308" height="645" alt="image" src="https://github.com/user-attachments/assets/7c012853-7edc-4e55-b827-8e277b3a8c7f" /> | Pantalla registro nuevo cliente |
| <img width="307" height="658" alt="image" src="https://github.com/user-attachments/assets/88d4864e-ba6b-4f13-8455-721c60c256ce" /> | Pantalla vista dueño/supervisor |
| <img width="302" height="676" alt="image" src="https://github.com/user-attachments/assets/d532802c-1451-4c70-9b61-a48ba78e3700" />| Vista clientes en espera por perfil dueño/supervisor |
| <img width="315" height="659" alt="image" src="https://github.com/user-attachments/assets/2ee2fc7a-080a-4e06-b73e-0e7f52ea145e" /> | Panel Cliente |
|<img width="315" height="661" alt="image" src="https://github.com/user-attachments/assets/9e1cc081-6d37-4cb1-92fd-9de6c4194717" />| Splash |
|<img width="321" height="692" alt="image" src="https://github.com/user-attachments/assets/0f57a0ca-e222-4740-9e41-3fa7bda3d9b6" />| Panel Mozo|
|<img width="317" height="688" alt="image" src="https://github.com/user-attachments/assets/e0e91f5f-a610-42d2-b248-7fe6ea4642ca" />|Chat Mozo/Cliente|
|<img width="349" height="702" alt="image" src="https://github.com/user-attachments/assets/22a0f236-b5b0-4afa-ac15-4a80a2f40b8c" />|QR Mesa: Ver Menu , pedir, Juegos y chat|

| Imagen             | Valor                                   
|--------------------|---------------------------------------|
|<img width="267" height="270" alt="image" src="https://github.com/user-attachments/assets/8d4c7cd0-130f-468d-aff9-0ae2ecd473b0" />| QR Lista de espera|
|<img width="257" height="263" alt="image" src="https://github.com/user-attachments/assets/c3347795-49c3-434a-b4b0-a8fdf71fc1b2" />| QR Mesa (ej: mesa 5)|
|<img width="387" height="389" alt="image" src="https://github.com/user-attachments/assets/c46e44ab-7501-4e60-b50b-8c438b4c0a01" />
|QR Propina: 20%|
|<img width="391" height="390" alt="image" src="https://github.com/user-attachments/assets/b3434d0c-c9b4-4f31-ac42-6a2fa2b4301b" />
|<img width="391" height="390" alt="image" src="https://github.com/user-attachments/assets/8d886b93-662d-4ae1-befb-efdfb7d28519" />
|QR Propina: 15%|
|<img width="395" height="389" alt="image" src="https://github.com/user-attachments/assets/828916f7-92e2-4272-9d15-0d71e6e884bc" />
|QR Propina: 10%|
|<img width="389" height="381" alt="image" src="https://github.com/user-attachments/assets/b8a496ae-c4b3-458f-baa4-c6264cdaf031" />
|QR Propina: 5%|









---
