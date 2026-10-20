import { newBlockId } from "./schema";
import type { HeroBlockData } from "./HeroBlock";

/**
 * Текущий баннер `/service` — единственное место, где эти строки записаны.
 * Используется, пока в CMS-странице `service` нет блока `hero` (витрина
 * показывает прежний вид без регрессии), и как стартовый текст для кнопки
 * «Подставить текущий баннер сайта» в редакторе (`CmsPageEditor.tsx`) — чтобы
 * заказчик правил готовый текст, а не писал баннер с нуля.
 */
export function serviceHeroDefault(): HeroBlockData {
  return {
    id: newBlockId(),
    type: "hero",
    badge: "Сервисный центр Medix",
    title: "Поддерживаем оборудование в рабочем состоянии",
    subtitle:
      "Техническое обслуживание, ремонт, выезд инженера и гарантийная поддержка медицинского оборудования.",
    backgroundImageKey: "",
    facts: [
      { text: "Ответ в рабочее время", icon: "clock" },
      { text: "+996 (312) 66-00-66", icon: "phone" },
    ],
  };
}
