import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  Haptics,
  ImpactStyle,
  NotificationType
} from '@capacitor/haptics';

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  /** Vibración corta “error” (usa notificación + refuerzo) */
  async error() {
    if (!isAndroidNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
      // refuerzo breve (opcional)
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {}
  }

  /** Otros por si los querés luego */
  async success() {
    if (!isAndroidNative()) return;
    try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
  }
  async warn() {
    if (!isAndroidNative()) return;
    try { await Haptics.notification({ type: NotificationType.Warning }); } catch {}
  }
  async vibrate(ms = 60) {
    if (!isAndroidNative()) return;
    try { await Haptics.vibrate({ duration: ms }); } catch {}
  }
}
