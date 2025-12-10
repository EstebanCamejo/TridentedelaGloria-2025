# 🍴 El Tridente de la Gloria

<div align="center">

![Ionic](https://img.shields.io/badge/Ionic-8.0.0-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-19.0.0-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-7.2.0-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

**Aplicación móvil completa para gestión integral de restaurantes**

[Características](#-características) • [Tecnologías](#-tecnologías) • [Instalación](#-instalación) • [Capturas](#-capturas-de-pantalla)

</div>

---

## 📖 Descripción

**El Tridente de la Gloria** es una aplicación móvil multiplataforma desarrollada para optimizar la gestión operativa de restaurantes. La aplicación integra múltiples roles (clientes, administradores, mozos, cocineros, bartenders, maitres y delivery) en un ecosistema unificado que mejora significativamente la experiencia del usuario y la eficiencia operativa.

### 🎯 Características Principales

- **Gestión Multi-Rol**: Sistema completo para clientes, administradores, mozos, cocineros, bartenders, maitres y repartidores
- **Códigos QR**: Sistema de QR para mesas, reservas, propinas y lista de espera
- **Pedidos en Tiempo Real**: Chat integrado entre clientes y personal, notificaciones push
- **Sistema de Juegos**: Trivia, memoria y tap rápido con descuentos aplicables
- **Gestión de Reservas**: Sistema completo de reservas con confirmación por email
- **Delivery**: Integración con mapas y geolocalización para pedidos a domicilio
- **Encuestas de Satisfacción**: Sistema de encuestas con gráficos y estadísticas
- **Facturación Digital**: Generación automática de facturas en PDF con envío por email
- **Autenticación Social**: Login con Facebook integrado

---

## 🛠️ Tecnologías

### Frontend
- **Ionic Framework** 8.0.0 - Framework para aplicaciones móviles híbridas
- **Angular** 19.0.0 - Framework web moderno
- **TypeScript** 5.6.3 - Lenguaje de programación tipado
- **Capacitor** 7.2.0 - Runtime nativo multiplataforma

### Backend & Servicios
- **Supabase** - Base de datos, autenticación y almacenamiento
- **Node.js** 20.17 - Entorno de ejecución
- **Deno** - Runtime para funciones serverless

### Librerías Principales
- `@capacitor/camera` - Acceso a cámara nativa
- `@capacitor-mlkit/barcode-scanning` - Escaneo de códigos QR
- `@capacitor/geolocation` - Geolocalización para delivery
- `@capacitor/local-notifications` - Notificaciones push
- `leaflet` - Mapas interactivos
- `qrcode` - Generación de códigos QR
- `ngx-charts` - Gráficos y visualizaciones
- `ngx-toastr` - Notificaciones toast

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 20.17 o superior
- npm o yarn
- Ionic CLI
- Capacitor CLI

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/EstebanCamejo/TridentedelaGloria-2025.git
   cd TridentedelaGloria-2025
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   - Crear archivo `src/environments/environment.ts` con las credenciales de Supabase

4. **Ejecutar en desarrollo**
   ```bash
   ionic serve
   ```

5. **Compilar para Android**
   ```bash
   ionic capacitor add android
   ionic capacitor run android
   ```

---

## 📱 Capturas de Pantalla

<div align="center">

### Splash Screen
<img width="200" src="https://github.com/user-attachments/assets/a3deb634-2c0f-4ec8-802d-a878654c7121" alt="Splash Screen" />

### Login con Accesos Rápidos
<img width="200" src="https://github.com/user-attachments/assets/0b71089e-19ef-4776-9ced-5a12368bbb03" alt="Login" />

### Panel Administrador
<img width="200" src="https://github.com/user-attachments/assets/c2931b24-3625-44de-9676-64ba67d8d839" alt="Panel Admin" />

### Panel Cliente - Menú
<img width="200" src="https://github.com/user-attachments/assets/e813bceb-a951-4e7b-895f-f1948cf9a854" alt="Menú" />

### Vista Delivery con Mapa
<img width="200" src="https://github.com/user-attachments/assets/3672a57d-33db-45af-b6ae-c85ebc3a2415" alt="Delivery" />

### Panel Mozo - Pedidos
<img width="200" src="https://github.com/user-attachments/assets/a54caee0-4cf6-49df-8b97-f6bf7ef9a913" alt="Panel Mozo" />

</div>

---

## 🏗️ Arquitectura del Proyecto

```
TridentedelaGloria-2025/
├── src/
│   ├── app/
│   │   ├── components/          # Componentes por rol
│   │   │   ├── admin/           # Gestión administrativa
│   │   │   ├── cliente/         # Funcionalidades cliente
│   │   │   ├── mozo/            # Panel mozo
│   │   │   ├── bartender-cocinero/  # Paneles cocina/bar
│   │   │   ├── maitre/          # Panel maitre
│   │   │   └── delivery/        # Sistema delivery
│   │   ├── services/            # Servicios Angular
│   │   ├── models/              # Modelos de datos
│   │   └── enumerados/          # Enumeraciones
│   └── assets/                  # Recursos estáticos
├── supabase/
│   └── functions/               # Funciones serverless (Deno)
└── android/                     # Proyecto Android nativo
```

---

## ✨ Funcionalidades por Rol

### 👤 Cliente
- Registro y autenticación
- Visualización de menú con categorías
- Realización de pedidos
- Sistema de reservas
- Chat con mozo
- Juegos con descuentos
- Encuestas de satisfacción
- Pago y propinas mediante QR
- Pedidos delivery con seguimiento

### 👨‍💼 Administrador
- Gestión de empleados
- Gestión de mesas y códigos QR
- Aprobación de clientes pendientes
- Gestión de productos (platos y bebidas)
- Visualización de estadísticas y encuestas
- Gestión de reservas

### 🍽️ Mozo
- Visualización de pedidos en curso
- Chat con clientes
- Confirmación de pagos
- Gestión de propinas
- Notificaciones de nuevos pedidos

### 👨‍🍳 Cocinero / 🍸 Bartender
- Lista de pedidos pendientes
- Cambio de estado de preparación
- Notificaciones de nuevos pedidos
- Visualización de detalles por mesa

### 🎩 Maitre
- Gestión de lista de espera
- Asignación de mesas
- Escaneo QR para ingreso
- Creación de clientes registrados

### 🚴 Delivery
- Visualización de pedidos delivery
- Navegación con mapas
- Chat con clientes
- Confirmación de entregas

---

## 📊 Estadísticas del Proyecto

- **Líneas de código**: ~15,000+
- **Componentes**: 30+
- **Servicios**: 34
- **Funciones Serverless**: 8
- **Roles de usuario**: 7
- **Tiempo de desarrollo**: 10 semanas

---

## 👥 Equipo de Desarrollo

- **Esteban Camejo** - Backend, Integraciones, Funciones Serverless
- **Sofia Dorbessan** - Frontend, UI/UX, Diseño
- **Ivan Laurito** - Frontend, Componentes de Menú

---

## 📄 Licencia

Este proyecto es privado y fue desarrollado como parte de un proyecto académico.

---

## 🔗 Enlaces

- [Repositorio GitHub](https://github.com/EstebanCamejo/TridentedelaGloria-2025)
- [Documentación Ionic](https://ionicframework.com/docs)
- [Documentación Angular](https://angular.dev)
- [Documentación Supabase](https://supabase.com/docs)

---

<div align="center">

**Desarrollado con ❤️ usando Ionic, Angular y Supabase**

⭐ Si te gusta este proyecto, ¡dale una estrella!

</div>
