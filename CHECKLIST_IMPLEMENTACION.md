# ✅ CHECKLIST DE IMPLEMENTACIÓN - Flujo de Pedidos por Sectores

Este documento verifica que todos los cambios estén implementados correctamente.

## 📋 PASOS DE VERIFICACIÓN

### 1. ✅ Estructura de Base de Datos (Supabase)

#### Columnas en tabla `pedidos`:
- [ ] `estado_sector_cocina` existe (TEXT, nullable)
- [ ] `estado_sector_bar` existe (TEXT, nullable)
- [ ] `tipo_pedido` existe (TEXT, nullable)

**Verificación:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos'
  AND column_name IN ('estado_sector_cocina', 'estado_sector_bar', 'tipo_pedido');
```

#### Índices creados:
- [ ] `idx_pedidos_estado_sector_cocina` existe
- [ ] `idx_pedidos_estado_sector_bar` existe
- [ ] `idx_pedidos_estado_sectores` existe

**Verificación:**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'pedidos' 
  AND indexname LIKE '%estado_sector%';
```

### 2. ✅ Código Frontend (Angular/TypeScript)

#### Servicios actualizados:
- [x] `menu.service.ts` - `obtenerPedidosCocina()` filtra por `estado_sector_cocina`
- [x] `menu.service.ts` - `obtenerPedidosBar()` filtra por `estado_sector_bar`
- [x] `menu.service.ts` - Tipos de retorno incluyen `estado_sector_cocina` y `estado_sector_bar`
- [x] `admin-realtime.service.ts` - Verifica todos los sectores antes de notificar

#### Componentes actualizados:
- [x] `verificar-pendientes-cocinero.component.ts` - Separa pendientes/listos por `estado_sector_cocina`
- [x] `verificar-pendientes-bartender.component.ts` - Separa pendientes/listos por `estado_sector_bar`

### 3. ✅ Flujo de Funcionamiento

#### Para Cocinero:
- [x] Pedidos pendientes: `estado_sector_cocina IS NULL`
- [x] Pedidos listos: `estado_sector_cocina IN ('en preparación', 'listo para entregar')`
- [x] Al aceptar: `estado_sector_cocina = 'en preparación'`
- [x] Al marcar listo: `estado_sector_cocina = 'listo para entregar'`

#### Para Bartender:
- [x] Pedidos pendientes: `estado_sector_bar IS NULL`
- [x] Pedidos listos: `estado_sector_bar IN ('en preparación', 'listo para entregar')`
- [x] Al aceptar: `estado_sector_bar = 'en preparación'`
- [x] Al marcar listo: `estado_sector_bar = 'listo para entregar'`

#### Para Mozo (Mesa):
- [x] Recibe notificación solo cuando TODOS los sectores están listos
- [x] Verifica `estado_sector_cocina` y `estado_sector_bar` antes de notificar

#### Para Admin (Delivery):
- [x] Recibe notificación solo cuando TODOS los sectores están listos
- [x] Verifica `estado_sector_cocina` y `estado_sector_bar` antes de notificar

### 4. ⚠️ Pedidos Inconsistentes

#### Verificación:
- [ ] Ejecutar PASO 5 del script SQL para encontrar pedidos inconsistentes
- [ ] Corregir pedidos encontrados usando PASO 6

**Pedido encontrado:**
- [ ] Pedido ID 238 - Corregido (o decidido no corregir)

### 5. 🧪 Pruebas Recomendadas

#### Prueba 1: Pedido de un solo sector (solo cocina)
- [ ] Cliente hace pedido solo con platos
- [ ] Cocinero ve el pedido en "PENDIENTES"
- [ ] Cocinero acepta → pedido aparece en "LISTOS" con estado "en preparación"
- [ ] Cocinero marca listo → pedido sigue en "LISTOS" con estado "listo para entregar"
- [ ] Mozo recibe notificación

#### Prueba 2: Pedido de un solo sector (solo bar)
- [ ] Cliente hace pedido solo con bebidas
- [ ] Bartender ve el pedido en "PENDIENTES"
- [ ] Bartender acepta → pedido aparece en "LISTOS" con estado "en preparación"
- [ ] Bartender marca listo → pedido sigue en "LISTOS" con estado "listo para entregar"
- [ ] Mozo recibe notificación

#### Prueba 3: Pedido multi-sector (cocina + bar)
- [ ] Cliente hace pedido con platos y bebidas
- [ ] Cocinero acepta primero → `estado = 'en preparación parcial'`, `estado_sector_cocina = 'en preparación'`
- [ ] Bartender acepta después → `estado = 'en preparación parcial'`, `estado_sector_bar = 'en preparación'`
- [ ] Cocinero marca listo → `estado_sector_cocina = 'listo para entregar'`, `estado = 'en preparación parcial'` (bar aún no listo)
- [ ] Bartender marca listo → `estado_sector_bar = 'listo para entregar'`, `estado = 'listo para entregar'` (todos listos)
- [ ] Mozo recibe notificación SOLO cuando ambos sectores están listos

#### Prueba 4: Pedido delivery
- [ ] Cliente hace pedido delivery con platos y/o bebidas
- [ ] Admin confirma el pedido
- [ ] Cocinero/Bartender aceptan y preparan
- [ ] Cuando todos los sectores están listos, Admin recibe notificación
- [ ] Admin asigna repartidor

## 🎯 RESUMEN

### ✅ Completado:
1. Código frontend actualizado
2. Lógica de filtrado implementada
3. Notificaciones corregidas (mozo y admin)
4. Script SQL para verificar estructura

### ⚠️ Pendiente (si aplica):
1. Ejecutar PASOS 1-3 del script SQL (si las columnas no existen)
2. Corregir pedidos inconsistentes (PASO 6)
3. Ejecutar pruebas de funcionamiento

## 📝 NOTAS IMPORTANTES

1. **Pedidos nuevos:** Se crearán con `estado_sector_cocina = NULL` y `estado_sector_bar = NULL` por defecto
2. **Pedidos existentes:** Los que ya están en estados avanzados pueden necesitar corrección manual
3. **Índices:** Mejoran el rendimiento de las consultas, especialmente con muchos pedidos
4. **Notificaciones:** Solo se envían cuando TODOS los sectores involucrados están listos

## 🚀 SIGUIENTE PASO

Una vez completado este checklist, el sistema debería funcionar correctamente. Si encuentras algún problema, revisa:
1. Que las columnas existan en Supabase
2. Que los índices estén creados
3. Que no haya pedidos inconsistentes
4. Que el código esté compilado sin errores

