import type { PushSelfTest } from "@/api/notifications";

export type SelfTestVerdict = {
  tone: "success" | "warning" | "error";
  text: string;
};

/**
 * Превращает отчёт сервера в одну фразу для человека.
 *
 * Четыре состояния выглядят для пользователя одинаково — «ничего не пришло», —
 * но чинятся по-разному, поэтому называем каждое своим именем. Текст ошибки
 * от FCM показываем как есть: он технический, но это единственная зацепка,
 * а сочинённая замена вроде «что-то пошло не так» не помогает никому.
 */
export function describePushSelfTest(report: PushSelfTest): SelfTestVerdict {
  if (!report.firebase_configured) {
    return {
      tone: "error",
      text: "Уведомления не настроены на сервере — сообщите администратору",
    };
  }

  if (report.devices === 0) {
    return {
      tone: "warning",
      text: "Этот браузер не зарегистрирован. Выключите и включите уведомления заново",
    };
  }

  if (report.sent === 0) {
    const reason = report.errors[0];
    return {
      tone: "error",
      text: reason
        ? `Сервер не смог отправить: ${reason}`
        : "Сервер не смог отправить уведомление",
    };
  }

  const partial = report.sent < report.devices;
  return {
    tone: partial ? "warning" : "success",
    // Устройств может быть несколько: телефон, рабочий и домашний браузер.
    text: partial
      ? `Отправлено на ${report.sent} из ${report.devices} — часть устройств больше недоступна`
      : "Отправлено. Уведомление должно появиться в течение нескольких секунд",
  };
}
