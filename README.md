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
  //correccion: Alejandro constanzo.

  Github: completo
Punto 1: el primer dispositivo esta grabado muy lejos, se ve que ingresan datos pero la verdad nos imaginamos y no nos tendríamos que imaginar sino poder constatarlo. Los otros dispositivos tienen una visual correcta. Vuelvan a grabar el primer dispositivo (que justo es el que hace el ingreso de todos los datos). A nivel visual esta correcto y funcionalmente también correcto.
Puntos 2 y 3: En la sección donde tienen 2 botones grandes (visualizar pendiente y agregar nueva bebida) usan scroll y no deberían porque justamente tienen 2 botones grandes, eso aplíquenlo a cualquier parte donde ocurra algo similar, eviten el uso del scroll y limítenlo a lugares que sean sumamente necesarios.
Ya veo el menú en un dispositivo y ahí hago una aclaración: el menú si van a usar scroll (recomiendo que no pero lo pueden hacer) si van por ese camino que el scroll cuando pasan de una imagen a otra que la misma se frene y ocupen toda la pantalla, es decir que no quede ni la mitad ni una cuarta parte de un articulo anterior ni posterior. Ahora previendo la segunda parte del proyecto (punto 31) les recomiendo que usen un estilo de carrusel y ya preparan el menú para ese punto. A nivel visual esta correcto y funcionalmente también correcto.
Punto 4: otra vez el primer dispositivo se ve lejos, y no se (porque repito se ve lejos) pero pareciera que cuando eliminan mesa la confirmación aparecen palabras en ingles (OK-CANCEL), si no es así desestimar esto, pero vuelvan a grabar esta parte mas cerca porque no se distingue, funcionalmente bien.
Puntos 5-6-7-8: Los botones de aceptación y rechazo siguen igual, siguen 2 botones minúsculos, eso cámbienlo para poner dos botones un poco mas grande. El correo de aceptación que tenga colores tendiendo al verde (aceptar) y el de rechazo tendiendo al rojo (rechazar).
Puntos 9-10-11: palabra en ingles (OK). Hay un mensaje “No hay clientes en espera” se pierde o confunde con el fondo, además se ve arriba de todo en chiquito. Si ponen un mensaje que muestra un lista vacía, o ponen el mensaje bien grande que ocupe toda la pantalla o pongan una imagen alusiva que muestre dicha acción (esto aplicarlo a cualquier acción similar). El punto 11 no lo muestran bien como se debe, lo pasan muy por arriba, deben mostrar bien el menú de productos con sus 3 fotos, con sus tiempos de preparación con su valor bien en grande, con las categorías correspondientes (comidas, bebidas y postres) ,etc como se pide en el punto 11.
Puntos 12-13: ídem al punto 11 muestren el menú. Otra vez pantallas vacías donde no hay nada que mostrar (detallado puntos 9-10-11). Palabras en ingles (OK-CANCEL).
Puntos 14-16-17-18-19: ok
Punto 15: ok

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

## 📆 Semana 7: Sábado 25/10 al 01/11 
  //correccion: Maximiliano Neiner

Vista Reserva Admin:
Las letras rojo oscuro, sobre el fondo negro no hacen un buen contraste.
Igualar los componentes (inputs y buttons) para que entre sí, tengan el mismo tamaño.
Dejar espacios entre 'renglones' para abarcar mayor superficie (espacio hacia abajo tienen y mucho). Quitar palabra email.
Vista Reserva Cliente:
agrandaría un poco más el mensaje 'pendiente de confirmación'.
Home Cliente Reserva:
dejar más espacio entre el primer botón (Escanear QR) y el borde superior de la pantalla. Tratar de que los espacios entre los bordes sean lo más parejos posibles (sin solapar otros controles).

El video es muy extenso, separarlo por puntos individuales.
Agrandar más las fuentes, en particular la de los totales.

*Diseño*
- Arreglo home Maitre -> Sofia Dorbessan
- Arreglo correos Aceptacion/Rechazo -> Sofia Dorbessan
- Arreglo visual admin lista de espera -> Sofia Dorbessan
- Correos Aceptacion/Rechazo reservas -> Sofia Dorbessan
- Arreglo Menu → *Ivan Laurito*
- Arreglo componentes sin informacion en lista  → Esteban Camejo
- Arreglo home admin mesas  → Esteban Camejo
- Correo con PDF factura → Esteban Camejo

*Gestión*
- PDF factura → Esteban Camejo
- Correo con PDF factura a cliente registrado → Esteban Camejo
- Push con factura al cliente no registrado → Esteban Camejo
- Flujo correos Aceptacion/Rechazo reservas -> Sofia Dorbessan
- Componente Reservas Cliente y Admin -> Sofia Dorbessan


  ✅ *Entrega:*
- Puntos funcionando del 1 al 21 + Requerimientos excluyentes.
- Se entregan los puntos del 1 al 13 actualizados con las ultimas correcciones realizadas.

## 📆 Semana 7: Sábado 25/10 al 01/11 
  //correccion: Maximiliano Neiner

En el splah-screen, Iván no tiene tilde... igualar los contenedores de los apellidos y nombres (¿botones?).
1) Quitar todo tipo de abreviaciones (min, hrs, etc.)
Utilizar botones de acceso rápido.Punto 1:
Los 'botones' de la página principal del administrador, hacerlos más grande, que se ajusten para ocupar toda la pantalla.
La foto del empleado, más grande, está en un circulito arriba y no se ve. Otra opción, al hacer click, que se levante una ventana con la foto ocupando toda esa ventana. Fuentes de los botones muuuucho más grandes.
Punto 2 y 3:
parte 1: 
1)
parte 2:
El elemento para agregar los detalles debe ser más grande (más alto, para que se puedan agregar varios renglones)
Las imágenes se deben mostrar en contenedores con el mismo alto y ancho.
parte 3: 
ídem anterior.
parte 4:
1)
Punto 4:
1)
Agrandar más los ítems del listado para que se pueda ver mejor las fotos y también los datos, ya que algunos valores se ven en renglones distintos (porque tienen más caracteres) y de paso, los botones de acción dejarlos en otro renglón (bien separados)
En la pantalla de alta, agrandar los controles, fuentes, etc.
Punto 5, 6, 7 y 8:
parte 1:
ídem foto en circulito del punto 1.
parte 2:
Listado de clientes pendientes de aprobación. Ídem listados anteriores, más grandes para visualizar fotos y datos (los correos salen cortados). 
Quitar EMAIL, ¡¡¡todo en español!!!
parte 3:
Ídem anterior.
Punto 9 y 10:
parte 1:
Ídem listados anteriores. Recordar que para el listado de clientes pendientes, lo importante (para el maitre), es la foto y el nombre (que ambos tipos de clientes poseen) y NO el correo, este último es un dato que no aporta nada.
Recordar que en ningún caso, los listados (en este caso, las encuestas) NO tienen que salir cortados.
parte 2:
1)
Punto 11:
parte 1: 
1)
parte 2:
1)
Listado de pedidos (mozo). Nuevamente, datos que no tienen relevancia. Correo electrónico (?) total, no, el tiempo (?). El mozo tiene que ver, por mesa, el listado y cantidad de productos, ¿cómo confirma? Lo más importante son los nombres y cantidades de productos que se quieren confirmar o no...
En el chat, el que escribe no tiene que tener ni nombres (ni mucho menos correo), solo la fecha con hora y minuto. Del lado del mozo, tiene que llegar la mesa y se responde con el nombre del mozo.
Punto 12 y 13:
parte 1:
1)
parte 3:
Ídem anterior.
Punto 15:
Agrandar elementos y fuentes.
Punto 14, 16, 17, 18 y 19:
ídem  punto 11, parte 2... el bar-man y el cocinero tienen que saber qué y cuánto tienen que preparar (agrupado por mesa), no le importan, correos, totales. etc..

*Diseño*
- Vista panel Delivery  → Esteban Camejo
- Vista Delivery Cliente  → Esteban Camejo
  
*Gestión*
- PDF factura Delivery → Esteban Camejo
- Delivery/ Cliente Chat → Esteban Camejo
- Flujo pedido Delivery → Esteban Camejo
- Flujo Reservas -> Sofia Dorbessan
- Menú con acelerómetro y giroscopio  -> Ivan Laurito
- Ingreso con Facebook  -> Ivan Laurito

  ✅ *Entrega:*
- Puntos funcionando del 1 al 22 bis + puntos 24 al 31 + Requerimientos excluyentes.

  ## 📆 Semana 8: Sábado 01/11 al 14/11

*Diseño*
- Arreglo flujo vista admin  → Esteban Camejo
- Arreglo flujo vista delivery  → Esteban Camejo
- Arrgelo flujo vista cliente -> Sofia Dorbessan
- Arreglo flujo vista maitre -> Sofia Dorbessan
- Arreglo flujo vista cocinero/bartender -> Sofia Dorbessan
- Arreglo vista Menu  -> Sofia Dorbessan/Esteban Camejo  

  ✅ *Entrega:*
- Puntos funcionando del 1 al 31 + Punto 22 bis + Requerimientos excluyentes.

  ## 📲 Imagenes de la aplicacion 📲

| Imagen             | Explicacion                                   
|--------------------|---------------------------------------|
|<img width="383" height="828" alt="image" src="https://github.com/user-attachments/assets/a3deb634-2c0f-4ec8-802d-a878654c7121" /> | Splash |
|<img width="379" height="828" alt="image" src="https://github.com/user-attachments/assets/0b71089e-19ef-4776-9ced-5a12368bbb03" />| Inicio de sesion con accesos rapidos desplegados |
| <img width="380" height="825" alt="image" src="https://github.com/user-attachments/assets/e5b90f61-48f1-4dce-8648-1856393eecf4" /> | Pantalla registro nuevo cliente |
| <img width="389" height="825" alt="image" src="https://github.com/user-attachments/assets/c2931b24-3625-44de-9676-64ba67d8d839" />| Panel dueño/supervisor |
| <img width="381" height="828" alt="image" src="https://github.com/user-attachments/assets/d79399d3-8396-4899-a12f-afc665eb4ac1" /> | Panel Cliente |
|<img width="382" height="830" alt="image" src="https://github.com/user-attachments/assets/e813bceb-a951-4e7b-895f-f1948cf9d854" />|Vista Cliente: Menú|
|<img width="376" height="821" alt="image" src="https://github.com/user-attachments/assets/3672a57d-33db-45af-b6ae-c85ebc3a2415" />|Vista Cliente: Mapa para realizar Delivery|
|<img width="382" height="832" alt="image" src="https://github.com/user-attachments/assets/1eb05093-fd4c-495a-be63-f748b455847e" />|Vista Cliente: Reservas|
|<img width="381" height="827" alt="image" src="https://github.com/user-attachments/assets/73078708-0588-4dd4-8ed3-29e43b46fb55" />|Vista Cliente: Encuestas anteriores|
|<img width="196" height="438" alt="image" src="https://github.com/user-attachments/assets/739d2083-7dcc-4352-9e95-a5ca6d05cf6e" />|Cliente Anonimo escanea QR Mesa: Ver Menu , chat no puede acceder a los juegos|
|<img width="379" height="821" alt="image" src="https://github.com/user-attachments/assets/abb7afb0-26ad-4059-b13f-e408e451f5fe" />| Panel Repartidor|
|<img width="381" height="827" alt="image" src="https://github.com/user-attachments/assets/a54caee0-4cf6-49df-8b97-f6bf7ef9e913" />| Panel Mozo: Pedidos en curso|
|<img width="203" height="445" alt="image" src="https://github.com/user-attachments/assets/c85c669d-bd6d-4bf3-a018-3e400144756b" />|Chat Mozo/Cliente|


| Imagen             | Valor                                   
|--------------------|---------------------------------------|
|<img width="267" height="270" alt="image" src="https://github.com/user-attachments/assets/8d4c7cd0-130f-468d-aff9-0ae2ecd473b0" />| QR Lista de espera|
|<img width="257" height="263" alt="image" src="https://github.com/user-attachments/assets/c3347795-49c3-434a-b4b0-a8fdf71fc1b2" />| QR Mesa (ej: mesa 5)|
|<img width="387" height="389" alt="image" src="https://github.com/user-attachments/assets/c46e44ab-7501-4e60-b50b-8c438b4c0a01" />|QR Propina: 20%|
|<img width="391" height="390" alt="image" src="https://github.com/user-attachments/assets/8d886b93-662d-4ae1-befb-efdfb7d28519" />|QR Propina: 15%|
|<img width="395" height="389" alt="image" src="https://github.com/user-attachments/assets/828916f7-92e2-4272-9d15-0d71e6e884bc" />|QR Propina: 10%|
|<img width="389" height="381" alt="image" src="https://github.com/user-attachments/assets/b8a496ae-c4b3-458f-baa4-c6264cdaf031" />|QR Propina: 5%|









---
