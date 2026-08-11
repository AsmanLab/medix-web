/**
 * Короткий сигнал при уведомлении на открытой странице.
 *
 * Звук синтезируется через Web Audio, а не берётся файлом: файл — это ещё
 * один запрос, попадание в CSP и лишние килобайты в сборке ради двух нот.
 *
 * Системные уведомления (когда вкладка не на переднем плане) звучат сами —
 * этим распоряжается операционная система, и трогать её нельзя.
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

/**
 * Играет две ноты — «динь-дон».
 *
 * Молча ничего не делает, если браузер запретил звук: без взаимодействия
 * с вкладкой AudioContext остаётся приостановленным, и это нормальное
 * состояние, а не ошибка, о которой стоит сообщать.
 */
export function playNotificationSound(): void {
  try {
    const ctx = getContext();
    if (!ctx || ctx.state === "suspended") {
      void ctx?.resume().catch(() => {});
      if (!ctx || ctx.state === "suspended") return;
    }

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    // Тихо: сигнал должен привлекать внимание, а не пугать в тихом кабинете.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    for (const [frequency, at] of [
      [880, 0],
      [1174.7, 0.12],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now + at);
      osc.connect(gain);
      osc.start(now + at);
      osc.stop(now + at + 0.2);
    }
  } catch {
    // Звук — приятная мелочь, а не функциональность: молчим.
  }
}
