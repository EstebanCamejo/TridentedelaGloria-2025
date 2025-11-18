# Script para Generar QRs de Mesas 28-38

## Problema
Las mesas 28-38 tienen el `qr_text` correcto en la base de datos, pero falta la imagen PNG del QR en el storage.

## Soluciones

### Opción 1: Usar la Interfaz Admin (Más Fácil)
1. Ve a la sección Admin > Mesas
2. Para cada mesa del 28 al 38:
   - Haz clic en "Editar"
   - No cambies nada, solo haz clic en "Guardar"
   - Esto regenerará el QR automáticamente

### Opción 2: Usar la Función Edge (Requiere Foto)
Puedes llamar a la función edge `alta-mesa` para cada mesa, pero requiere una foto:

```bash
# Ejemplo para mesa 28
curl -X POST https://TU_PROJECT.supabase.co/functions/v1/alta-mesa \
  -H "Authorization: Bearer TU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "numero": 28,
    "capacidad": 4,
    "tipo": "estandar",
    "photoBase64": "data:image/jpeg;base64,..."
  }'
```

### Opción 3: Script TypeScript/Node.js
Crea un script que:
1. Obtenga las mesas 28-38
2. Para cada mesa, genere el QR usando la librería `qrcode`
3. Suba la imagen PNG al storage en `mesas/qr/{id}.png`

Ejemplo:

```typescript
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Obtener mesas 28-38
const { data: mesas } = await supabase
  .from('mesas')
  .select('id, numero, qr_text')
  .gte('numero', 28)
  .lte('numero', 38);

for (const mesa of mesas) {
  // Generar QR PNG
  const qrDataUrl = await QRCode.toDataURL(mesa.qr_text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 3,
    width: 320,
  });

  // Convertir dataURL a Blob
  const base64 = qrDataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // Subir al storage
  const path = `qr/${mesa.id}.png`;
  await supabase.storage
    .from('mesas')
    .upload(path, bytes, {
      upsert: true,
      contentType: 'image/png',
    });

  console.log(`✅ QR generado para mesa ${mesa.numero}`);
}
```

## Verificación
Después de generar los QRs, verifica que existan en:
- Storage: `mesas/qr/{id}.png`
- Base de datos: `mesas.qr_text` debe tener el formato `{"t":"mesa","id":"...","n":28}`

