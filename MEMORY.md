# MEMORY — трайни факти и уроци

> Допълва `SOUL.md`. Целта е нова сесия да започне с този контекст, вместо от нула.
> Не съдържа тайни, ключове или клиентски данни. Това репо е публично.

## Канонични факти

- Supabase **каноничен** проект за HORIZON: `mteguzgbiuexmdcrqajj` (`vzg-plattform-deutschland`, `eu-central-1`)
- Supabase **legacy / само за справка**: `numyqalfphyrnedlfzfs` (`ai-home-office-v1-eu`) — не се ползва за нова конфигурация
- Render е production authority, деплойва от GitHub `main`
- `public.cases` е каноничният owner-scoped модел. `platform_*` е legacy — не се трие, не се мигрира деструктивно
- Работен процес: само една активна фаза; DONE изисква пълното определение в `PROJECT_RULES.md`

## Репозитории и права

| Репо | Видимост | Права на OpenHands |
|---|---|---|
| `tarifberatung24-blip/VZGplattform` | public | ✅ **push** |
| `vilstar-jpg/novamind-mypos-checkout` | public | ❌ **само четене** |

**Критично:** публичността на репото **не** дава права за запис.
Достъпът идва от инсталацията на OpenHands app (`openhands-ai`), която е само на `VZGplattform`.

→ За да дадеш достъп: https://github.com/settings/installations → OpenHands → Configure → добави репото

## NovaMind myPOS Checkout

**Отделен продукт, различен от HORIZON.** Не се смесват.

- Backend: `server.cjs` (Node/Express), деплойнат на Render
- Production URL: `https://novamind-mypos-checkout-wvkt.onrender.com`
- Supabase (само този): `ilqzaemycuyrrmfguiso` (`novamind-mypos-checkout-mypos`)
- **Забранен** Supabase проект: `wtsgsohsblhdwugyylet` (`NovaMind Payments`) — Horizon-свързан, никога не се ползва
- Shopify магазин: `novamind-ai.store` → `m4uz7j-hh.myshopify.com`

### Архитектура на плащането

```
Shopify продуктова страница
  → бутон в body_html → onrender.com/pay/:product
  → създава payment_intent (PENDING)
  → POST към myPOS Checkout
  → myPOS → /mypos/notify (сървър-към-сървър)
  → проверка: подпис → SID → IPCmethod → OrderID → сума/валута → Status
  → PAID_VERIFIED → създава Shopify поръчка → отбелязва платена → SHOPIFY_CREATED
```

**Важно:** стандартният Shopify checkout остава непроменен. myPOS е **само допълнителен** метод през custom бутони. myPOS **няма** нативен Shopify gateway — плъгините им са само за WooCommerce, Magento, PrestaShop, OpenCart и др.

### Продукти

| Route | Продукт | Цена | Shopify variant |
|---|---|---|---|
| `/pay/chatgpt` | ChatGPT Настройки за 10 минути | 20.00 EUR | 58710575939968 |
| `/pay/calls` | AI Анализ на Обаждания | 149.00 EUR | 59985549459840 |
| `/pay/clients` | AI Клиентска Машина | 97.99 EUR | 58710126723456 |
| `/pay/offers` | Система за запитвания и оферти | 199.00 EUR | 58710232039808 |

### Състояние (проверено 2026-09-30)

- ✅ Плащанията работят след поправка на сравнението на сумата
- ✅ `payment_intents`: 16/16 колони, 3 CHECK ограничения, 3 уникални индекса
- ⚠️ Защита срещу двойно известие — **не е внедрена** в production (P1)
- ⏳ Реално тестово плащане — непотвърдено
- ⏳ 4 стари поръчки × 149 EUR — неясно дали са платени

## Уроци от реални грешки

1. **`create table if not exists` е no-op** върху съществуваща таблица.
   → Не поправя частична схема. Ползвай `alter table ... add column if not exists`.

2. **PostgREST връща `numeric` като JSON число, не низ.**
   → `20.00` става `20`. Сравнявай числово (`Number()`), не текстово (`String()`).
   → Този бъг отхвърляше 100% от валидните плащания с 409.

3. **Не пускай тестови заявки с промени срещу production без транзакция.**
   → Веднъж оставих `status='BOGUS'` в жива база. Поправих го, но не трябваше да се случва.
   → Оттук нататък: проверките срещу production са **само четящи**.

4. **Render задържа предишния работещ деплой при провал.**
   → Счупен commit не сваля сайта, но и не поправя нищо. Провери кой commit е жив.

5. **Публично репо ≠ права за запис.** Достъпът идва от app инсталацията.

6. **Не пипай само един ред от многоредово условие.**
   → При `a || b` изтриването на `b` оставя висящ `||` → SyntaxError. Показвай целия блок.

## Отворени задачи

- [ ] Защита срещу двойно myPOS известие (атомарен claim) — P1
- [ ] Реално тестово плащане 20 EUR и проверка на `SHOPIFY_CREATED`
- [ ] Проверка на 4 стари myPOS поръчки (149 EUR) — платени ли са
- [ ] Втори Shopify магазин (копие) с myPOS Checkout + собствен Supabase
- [ ] Ротация на изтекли/споделени токени
