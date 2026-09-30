# Клонинг на Shopify магазина — план за изпълнение

> Цел: втори Shopify магазин с myPOS Checkout, напълно изолиран от първия.
> Статус: планиране. Нищо не е изпълнено още.

## Решения (потвърдени от собственика)

- Нов Shopify акаунт с нов имейл
- Нов домейн
- Нови продукти — **същите имена и цени**, нови variant ID-та
- Нов Supabase проект
- myPOS остава **допълнителен** метод през бутон в `body_html` (няма нативен Shopify gateway)

## Целева архитектура

```
Магазин A (novamind-ai.store)  → backend A → myPOS store 1 → Supabase A → Shopify A
Магазин B (клона, нов домейн)  → backend B → myPOS store 2 → Supabase B → Shopify B
```

Двата потока не споделят нищо. Провал в единия не засяга другия.

## Продукти (същите имена и цени)

| Продукт | Цена | Нов variant (да се попълни) |
|---|---|---|
| ChatGPT Настройки за 10 минути | 20.00 EUR | — |
| AI Анализ на Обаждания | 149.00 EUR | — |
| AI Клиентска Машина | 97.99 EUR | — |
| Система за запитвания и оферти | 199.00 EUR | — |

## Фази

### Фаза 1 — Shopify магазин (собственик)

1. Нов Shopify акаунт с нов имейл
2. Нов домейн, свързан към магазина
3. Създаване на 4-те продукта
4. Записване на новите variant ID-та → попълват се в таблицата горе
5. Custom app с Admin API достъп (`write_orders`) за създаване на поръчки
6. Записване на `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` / `SHOPIFY_SHOP_DOMAIN`

### Фаза 2 — myPOS (собственик)

1. Нов myPOS store **или** втори website domain към съществуващия
2. Регистриране на новия домейн като merchant website
3. Нов Configuration Pack → `sid`, `cn`, `idx`, `pk`, `pc`

⚠️ **Блокер за проверка:** myPOS Checkout изисква одобрен merchant domain.
Ако новият домейн не бъде одобрен, клонът не може да приема myPOS плащания.

### Фаза 3 — Supabase (нужен нов access token)

1. Нов проект
2. Прилагане на `20260929190000_create_payment_intents.sql` (пълната версия, 16 колони)
3. Записване на project ref + service-role ключ

### Фаза 4 — Backend (агент)

1. Ново репо + нов Render service (пълна изолация)
2. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MYPOS_CONFIG_PACK`,
   `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP_DOMAIN`,
   `MYPOS_NOTIFY_URL`
3. Supabase project guard с новия ref
4. Идемпотентност (атомарен claim) — да се включи от началото
5. Проверка на 4-те `/pay` route-а

## Тестове

⚠️ **Без пробни плащания** — изрично указано от собственика.

Проверката се прави само с:
- `GET /pay/:product` → 200, правилна цена, валидна форма, `payment_intent` = `PENDING`
- Платежна карта **не** се подава

## Отворени въпроси

- [ ] Одобрява ли myPOS новия домейн?
- [ ] Ново репо или store-aware `/pay/:store/:product` в съществуващото?
- [ ] Нов Supabase access token (старият е 401)

## Настоящи блокери

- GitHub токен на агента: 401 (инсталацията на app-а още не е активна за сесията)
- Supabase access token: 401
- Supabase service key (novamind): жив, само за четене на съществуващата база
