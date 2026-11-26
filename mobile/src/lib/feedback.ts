import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Âm báo + rung khi quét mã */
let ok: ReturnType<typeof createAudioPlayer> | null = null;
let err: ReturnType<typeof createAudioPlayer> | null = null;
export function scanFeedback(kind: 'ok' | 'error') {
  try {
    ok ??= createAudioPlayer(require('../../assets/sounds/beep-ok.wav'));
    err ??= createAudioPlayer(require('../../assets/sounds/beep-error.wav'));
    const p = kind === 'ok' ? ok : err;
    p.seekTo(0);
    p.play();
  } catch {}
  if (Platform.OS !== 'web')
    (kind === 'ok' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)).catch(() => {});
}
