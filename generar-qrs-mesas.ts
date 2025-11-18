/**
 * Script para generar imágenes QR para mesas 28-38
 * 
 * Uso:
 * 1. Instala dependencias: npm install @supabase/supabase-js qrcode
 * 2. Configura las variables de entorno o edita las constantes
 * 3. Ejecuta: npx ts-node generar-qrs-mesas.ts
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// ============================================
// CONFIGURACIÓN
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ujpfjthcqpenkizxjimp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'TU_SERVICE_ROLE_KEY_AQUI';

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function generarQRs() {
  console.log('🚀 Iniciando generación de QRs para mesas 28-38...\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Obtener mesas 28-38
  console.log('📋 Obteniendo mesas 28-38...');
  const { data: mesas, error: fetchError } = await supabase
    .from('mesas')
    .select('id, numero, qr_text')
    .gte('numero', 28)
    .lte('numero', 38)
    .order('numero');

  if (fetchError) {
    console.error('❌ Error al obtener mesas:', fetchError);
    process.exit(1);
  }

  if (!mesas || mesas.length === 0) {
    console.log('⚠️ No se encontraron mesas entre 28 y 38');
    process.exit(0);
  }

  console.log(`✅ Encontradas ${mesas.length} mesas\n`);

  // 2. Generar QR para cada mesa
  let exitosas = 0;
  let fallidas = 0;

  for (const mesa of mesas) {
    try {
      // Asegurar que qr_text existe
      let qrText = mesa.qr_text;
      if (!qrText) {
        qrText = JSON.stringify({ t: 'mesa', id: mesa.id, n: mesa.numero });
        console.log(`⚠️ Mesa ${mesa.numero}: qr_text faltante, generado automáticamente`);
      }

      // Generar QR PNG
      console.log(`🔄 Generando QR para mesa ${mesa.numero}...`);
      const qrDataUrl = await QRCode.toDataURL(qrText, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 3,
        width: 320,
      });

      // Convertir a bytes
      const qrBytes = dataUrlToBytes(qrDataUrl);

      // Subir al storage
      const path = `qr/${mesa.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from('mesas')
        .upload(path, qrBytes, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) {
        console.error(`❌ Mesa ${mesa.numero}: Error al subir QR -`, uploadError.message);
        fallidas++;
        continue;
      }

      // Actualizar qr_text en la base de datos si no existe
      if (!mesa.qr_text) {
        const { error: updateError } = await supabase
          .from('mesas')
          .update({ qr_text: qrText })
          .eq('id', mesa.id);

        if (updateError) {
          console.error(`⚠️ Mesa ${mesa.numero}: Error al actualizar qr_text -`, updateError.message);
        }
      }

      console.log(`✅ Mesa ${mesa.numero}: QR generado y subido correctamente`);
      exitosas++;

    } catch (error: any) {
      console.error(`❌ Mesa ${mesa.numero}: Error -`, error.message);
      fallidas++;
    }
  }

  // 3. Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN:');
  console.log(`✅ Exitosas: ${exitosas}`);
  console.log(`❌ Fallidas: ${fallidas}`);
  console.log('='.repeat(50));

  if (fallidas > 0) {
    process.exit(1);
  }
}

// ============================================
// EJECUTAR
// ============================================

generarQRs().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

