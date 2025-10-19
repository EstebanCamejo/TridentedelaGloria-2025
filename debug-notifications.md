# 🔍 DEBUG: Notificaciones Push del Maitre

## 📋 **PROBLEMAS IDENTIFICADOS**

### **1️⃣ Error 409 Conflict en `lista_espera`**
- **Síntoma**: POST request a `lista_espera` falla con `409 Conflict`
- **Causa**: El cliente ya tiene una entrada activa en la lista de espera
- **Impacto**: No se actualiza la tabla → No se disparan eventos realtime → No notificaciones

### **2️⃣ Roles del Usuario Maitre Incorrectos**
- **Síntoma**: `maitre: false` en la consola
- **Causa**: `usuarioBD` es `null` o el campo `perfil` no se mapea correctamente
- **Impacto**: El servicio del Maitre no se inicializa correctamente

## 🔧 **CORRECCIONES APLICADAS**

### **✅ Logging Mejorado en `joinWaitlist`**
- Agregado logging detallado para debuggear el UPDATE de `noAtendido` → `esperando`
- Información de error más detallada (code, message, details, hint)

### **✅ Logging Mejorado en `SesionService`**
- Corregido mapeo de campos: `tipo:perfil` → `perfil`
- Agregado logging para verificar el tipo de usuario cargado
- Corregidos todos los métodos de roles para usar `perfil` en lugar de `tipo`

### **✅ Logging Mejorado en `MaitreRealtimeService`**
- Logging detallado de inicialización del servicio
- Logging de permisos de notificaciones
- Logging de eventos realtime (INSERT/UPDATE)
- Logging de envío de notificaciones

## 🧪 **PASOS PARA TESTING**

### **Paso 1: Verificar Roles del Maitre**
1. Hacer login como `maitre@tridente.com`
2. Verificar en consola que aparezca:
   ```
   [SesionService] ✅ Perfil cargado: {perfil: 'maitre', ...}
   [SesionService] 🔍 esMaitre(): true
   [Home] roles: {maitre: true, ...}
   ```

### **Paso 2: Verificar Inicialización del Servicio**
1. Navegar a home del Maitre
2. Verificar en consola que aparezca:
   ```
   [MaitreRealtimeService] 🚀 Inicializando servicio...
   [MaitreRealtimeService] 🔐 Verificando permisos de notificaciones...
   [MaitreRealtimeService] ✅ Servicio inicializado correctamente
   ```

### **Paso 3: Testear Inscripción de Cliente**
1. Hacer login como cliente
2. Intentar inscribirse en lista de espera
3. Verificar en consola que aparezca:
   ```
   [MaitreRealtimeService] 🔄 UPDATE detectado: {...}
   [MaitreRealtimeService] 📊 Estados: {old: 'noAtendido', new: 'esperando'}
   [MaitreRealtimeService] 📱 Enviando notificación UPDATE...
   [MaitreRealtimeService] ✅ Notificación UPDATE enviada
   ```

## 🚨 **POSIBLES CAUSAS DEL 409 CONFLICT**

1. **Constraint único**: Puede haber un constraint que impide múltiples entradas activas por usuario
2. **RLS (Row Level Security)**: Políticas de seguridad que bloquean el UPDATE
3. **Trigger de base de datos**: Un trigger que está causando el conflicto
4. **Concurrencia**: Múltiples requests simultáneos

## 📱 **VERIFICAR NOTIFICACIONES**

1. **Permisos**: Verificar que las notificaciones estén habilitadas en el dispositivo
2. **Canal**: Verificar que el canal 'maitre' se cree correctamente
3. **Payload**: Verificar que el payload de la notificación sea correcto

## 🔄 **PRÓXIMOS PASOS**

1. **Ejecutar las pruebas** con el logging mejorado
2. **Identificar exactamente dónde falla** el UPDATE
3. **Revisar constraints de base de datos** si es necesario
4. **Verificar RLS policies** si es necesario
