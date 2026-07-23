# UX audit — Medix (UAT post-pass)

Краткий список проблем по поверхностям. Не полный редизайн.

## Публичная витрина

| Экран | Проблема | Волна |
|-------|----------|-------|
| Home | Карточки товаров без фото (закрыто в A); секции плотные, слабый ритм | D2 |
| Home / Banner | Fallback без атмосферы фона | D2 |
| Catalog | Text-only cards; иерархия SKU vs название | D2 |
| PDP | Длинная форма, мало визуальной опоры на media | D2 |
| Nav | Mobile tabs ok; desktop catalog mega-menu плотный | D1 |

## Client app

| Экран | Проблема | Волна |
|-------|----------|-------|
| RFQ detail | Много шагов до заказа (закрыто в B) | — |
| Invoice | Неясный статус PDF (закрыто в A) | — |
| Profile | Logout есть; trust/verification copy слабый | parking |

## Admin / manager

| Экран | Проблема | Волна |
|-------|----------|-------|
| AdminShell | «Дашбордный» вид, нет logout (logout в A) | D3 |
| Banners | Stub (закрыто в C) | — |
| Commerce RFQ | Fallback «В заказ» после auto-convert | B |

## Принципы refresh (MASTER.md)

- Healthcare B2B: спокойный cyan + emerald CTA, без purple-AI
- Figtree + Noto Sans, 16px+ body, 44px touch
- Один job на секцию; карточки только для кликабельных сущностей
