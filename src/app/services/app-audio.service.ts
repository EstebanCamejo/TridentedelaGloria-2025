// import { Injectable } from '@angular/core';
// import { Capacitor } from '@capacitor/core';
// import { NativeAudio } from '@capacitor-community/native-audio';

// const isAndroidNative = () =>
//   Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// @Injectable({ providedIn: 'root' })
// export class AppAudioService {
//   private preloaded = new Set<string>();

//   async preload(id: string, assetPath: string, volume = 1.0) {
//     if (this.preloaded.has(id) || !isAndroidNative()) return;
//     try {
//       console.log('[Audio] preload', id, assetPath);
//       await NativeAudio.preload({ assetId: id, assetPath, isUrl: false, audioChannelNum: 1, volume });
//     } catch (e) {
//       console.warn('[Audio] preload FALLBACK public/', e);
//       const alt = 'public/' + assetPath; // ← fallback
//       await NativeAudio.preload({ assetId: id, assetPath: alt, isUrl: false, audioChannelNum: 1, volume });
//     }
//     this.preloaded.add(id);
//   }

//   async play(id: string) {
//     if (!isAndroidNative()) return;
//     try {
//       console.log('[Audio] play', id);
//       await NativeAudio.play({ assetId: id });
//     } catch (e) {
//       console.warn('[Audio] play error', e);
//     }
//   }

//   async unload(id: string) {
//     if (!isAndroidNative() || !this.preloaded.has(id)) return;
//     await NativeAudio.unload({ assetId: id }).catch(() => {});
//     this.preloaded.delete(id);
//   }
// }
// services/app-audio.service.ts
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

@Injectable({ providedIn: 'root' })
export class AppAudioService {
  private preloaded = new Set<string>();
  private playedOnce = new Set<string>();   // 👈 nuevo

  async preload(id: string, assetPath: string, volume = 1.0) {
    if (this.preloaded.has(id) || !isAndroidNative()) return;
    try {
      await NativeAudio.preload({ assetId: id, assetPath, isUrl: false, audioChannelNum: 1, volume });
    } catch {
      const alt = 'public/' + assetPath;
      await NativeAudio.preload({ assetId: id, assetPath: alt, isUrl: false, audioChannelNum: 1, volume });
    }
    this.preloaded.add(id);
  }

  async play(id: string) {
    if (!isAndroidNative()) return;
    try { await NativeAudio.play({ assetId: id }); } catch {}
  }

  // 👇 nuevo: toca una sola vez por ciclo de vida de la app
  async playOnce(id: string) {
    if (this.playedOnce.has(id)) return;
    await this.play(id);
    this.playedOnce.add(id);
  }

  async unload(id: string) {
    if (!isAndroidNative() || !this.preloaded.has(id)) return;
    await NativeAudio.unload({ assetId: id }).catch(() => {});
    this.preloaded.delete(id);
    this.playedOnce.delete(id);  // opcional: por si descargás y querés permitir de nuevo
  }
}
