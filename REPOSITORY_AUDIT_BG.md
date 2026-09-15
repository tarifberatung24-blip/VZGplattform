# Пълен анализ на VZGplattform

**Дата:** 14 септември 2026 г.  
**Обхват:** Next.js приложение, API маршрути, Supabase конфигурация/миграции, i18n, тестове, lint, TypeScript и production build.  
**Източник:** `tarifberatung24-blip/VZGplattform`, архивиран snapshot на `main`.

> **Статус:** Докладът първоначално описваше дефектите. В текущото работно копие са приложени поправки за Supabase public fallback, webhook secret, rate limiting, document idempotency/concurrency, AI input provenance, health disclosure и основните i18n места. Следващата validation проверка е част от имплементацията.

## Обобщение

Репозиторията е технически подреден Next.js 16 / React 19 / TypeScript проект с Supabase SSR, двуезичен интерфейс (български/немски), AI интеграция през Groq и 56 unit теста. Локалните статични проверки са добри: ESLint, TypeScript, всички тестове и production build преминават успешно.

Най-същественият риск не е syntax/build грешка, а production поведение около конфигурацията и защитата на API. Има **липсващ Supabase env fallback**, **незадължителна автентикация към n8n webhook**, липсващ **rate limiting** на публични/скъпи endpoint-и и възможни **конкурентни дублирания** при document processing. i18n проверката също отчита 21 потенциално hardcoded потребителски текста.

## Резултати от автоматичните проверки

| Проверка | Резултат |
|---|---|
| `pnpm lint` | PASS |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm test` | PASS — 12 test files, 56 tests |
| `pnpm build` | PASS — 55 статични страници, всички route handlers компилират |
| `pnpm i18n:check` | PASS — 160 ключа, 0 празни стойности |
| `pnpm i18n:unused` | PASS с review report за 3 динамични namespace-а и индиректни ключове |
| `pnpm i18n:hardcoded` | PASS като report-only, но отчита 21 потенциални текста |
| `pnpm supabase:check` | FAIL без env: `NEXT_PUBLIC_SUPABASE_URL is missing` |
| Runtime без env | `/api/health` връща HTTP 503 вместо диагностичен JSON; `/` пренасочва към `/bg` |

## Критични и високоприоритетни проблеми

### 1. Публичният сайт и health endpoint зависят от Supabase конфигурация — High — **ПРИЛОЖЕНО в текущия `main`**

**Доказателства:** `lib/supabase/proxy.ts:12-17` връща HTTP 503 при липсващи env променливи. `proxy.ts:27-29` пропуска `/api` през `updateSession`, а `app/api/health/route.ts` е зад същия proxy. Реалната проверка с production server без env върна:

```text
HTTP/1.1 503 Service Unavailable
Supabase Preview configuration is missing.
```

Това противоречи на README, който описва Supabase като необходима настройка само ако се използват auth/database функции. Така дори публичната landing страница и health диагностика не работят в standalone/preview режим.

**Поправка:** разделете публичните маршрути от auth-зависимите маршрути. При липсващ Supabase config пропускайте публичните страници и `/api/health`, а защитените API endpoints да връщат структуриран `503` с код. Алтернативно актуализирайте README и deployment pipeline така, че Supabase env винаги да е задължителен, и добавете smoke test за това поведение.

### 2. n8n webhook secret е опционален при изпращане на лични данни — High/Security — **ПРИЛОЖЕНО в текущия `main`**

**Доказателства:** `app/api/service-requests/route.ts:84-89` добавя `X-FinanzBG-Webhook-Secret` само ако `N8N_WEBHOOK_SECRET` е зададен. При конфигуриран webhook без secret се изпращат име, email, телефон, отговори, referer и user-agent без автентикация.

**Поправка:** в production изисквайте и валидирайте secret заедно с webhook URL; при липса връщайте `503 N8N_WEBHOOK_NOT_CONFIGURED`. Още по-добре използвайте HMAC подпис с timestamp/request ID и защита от replay. Secret-ът не трябва да се приема от клиентската заявка.

### 3. Липсва rate limiting на публичния service-request endpoint — High — **ПРИЛОЖЕНО в текущия `main`**

`POST /api/service-requests` приема заявки без IP/user/email лимит, CAPTCHA/Turnstile или idempotency key. Това позволява спам към n8n workflow, разход на външни ресурси и повторно изпращане на лични данни.

**Поправка:** добавете rate limit по IP и по email, минимален cooldown, idempotency key и server-side лимит на payload-а. За production използвайте edge/Redis-backed limiter, а не in-memory map в serverless среда. Логвайте correlation ID без да записвате излишни PII.

### 4. Chat endpoint-ът няма quota/rate limit за AI разход — High/Cost — **ПРИЛОЖЕНО в текущия `main`**

`app/api/chat/route.ts:17-44` изисква login, но няма ограничение по user/household, дневна квота или concurrency limit. Всеки authenticated user може да стартира много Groq заявки с до 12 съобщения и 500 output tokens.

**Поправка:** въведете quota таблица/брояч в Supabase, rate limit, максимум заявки за период, cancellation timeout и отчетност по household/user. При надвишаване връщайте `429` с `Retry-After`.

### 5. Клиентът може да подава произволен текст за AI анализ вместо извлечения текст — Medium/High — **ПРИЛОЖЕНО в текущия `main`**

`app/api/documents/analyze/route.ts:23-25` предпочита `body.text`, ако е подаден, вместо `document.extracted_text`. Това позволява на клиента да подмени съдържанието, да изпрати голям/вреден prompt и да предизвика непредвиден AI разход. Auth и household ownership са проверени, но provenance на текста не е.

**Поправка:** използвайте само `document.extracted_text`, или разрешавайте client text само в demo режим с твърд лимит, отделна схема и ясно маркиране. Добавете максимален размер, content normalization и audit metadata за source.

### 6. Race condition при claim на document analysis — Medium/High — **ПРИЛОЖЕНО в текущия `main`**

В `app/api/documents/analyze/route.ts:18-21` конкурентният update позволява всички статуси `uploaded`, `awaiting_analysis`, `failed`, `analysis_not_configured`. Две едновременни заявки могат и двете да видят документа и да го обновят до `awaiting_analysis`, след което да стартират два AI анализа.

**Поправка:** направете атомарен state transition само от текущия статус към `awaiting_analysis`, например `UPDATE ... WHERE id = ? AND processing_status IN ('uploaded','failed','analysis_not_configured')`, и приемайте успех само при точно един засегнат ред. Най-надеждният вариант е SQL RPC с row lock/idempotency key.

### 7. Document extraction няма idempotency/claim защита — Medium — **ПРИЛОЖЕНО в текущия `main`**

`app/api/documents/extract/route.ts:23-30` сваля и обработва файла без проверка на `extraction_status` или атомарно claiming състояние. Повторни/паралелни заявки могат да извършат OCR/extraction многократно и да презапишат резултата.

**Поправка:** добавете transition `not_started -> extracting`, връщайте `409` при вече обработван документ, пазете `extraction_started_at`/`extraction_error` и използвайте idempotency key.

## Средни проблеми и качество

### 8. i18n hardcoded текстове — Medium/UX

`pnpm i18n:hardcoded` отчита 21 потенциално user-facing литерала в:

- `app/api/kindergeld/draft/route.ts:28`
- `app/auth/forgot-password/page.tsx:52`
- `app/documents/page.tsx:20`
- `app/steuer/providers/page.tsx:30`
- `app/uslugi/page.tsx:4`
- `app/za-nas/page.tsx:4`
- `components/dashboard/smart-dashboard-preview.tsx:486-488`
- `components/finance/document-intake.tsx:63`
- `components/finance/guided-wizard.tsx:31`
- `components/finance/workspace-shell.tsx:71`
- `components/language-switcher.tsx:23`
- `components/marketing/hero.tsx:52-55`
- `components/marketing/opportunity-demo.tsx:92`
- `components/marketing/product-opportunity-board.tsx:129`
- `components/pwa-install-prompt.tsx:12`
- `components/ui/badge.tsx:35`

Скриптът е report-only, затова това не чупи build-а, но част от текста ще остане на един език при смяна на locale.

**Поправка:** преместете потребителските текстове в `messages/bg.json` и `messages/de.json`; оставете само технически labels/типове извън речника; добавете CI режим, който fail-ва при нов hardcoded UI текст.

### 9. PDF endpoint-ът е недовършен feature — Medium/Product

`app/api/steuer/pdf/route.ts:12` винаги връща `501 PDF_GENERATION_NOT_CONFIGURED`, дори когато readiness е успешен. Ако UI показва активна възможност за PDF, потребителят получава гарантиран failure.

**Поправка:** или имплементирайте реална генерация и download response, или скрийте/маркирайте функцията като unavailable в UI. Добавете API тестове за `409`, `501` и успешен binary response.

### 10. Няма интеграционна проверка на миграциите срещу реален Supabase — Medium/Operations

Unit тестовете проверяват домейн логика и mock-нати API сценарии, но няма автоматично `supabase db reset`/migration smoke test с реална база. Част от грешките в schema/table/policy имената ще се открият едва при deployment.

**Поправка:** добавете CI job с Supabase CLI/local Postgres, който изпълнява всички миграции, RLS тестовете и поне smoke операции за upload, contract, document analysis и audit event.

### 11. Конфигурационна и брандова непоследователност — Low/Medium

`package.json:2` използва име `my-project`, README говори за `FinanzBG`, а част от кода/SQL съобщенията използват `VZGplattform` и `VZGplattform`. Това не чупи runtime, но обърква deployment, logs, telemetry и поддръжка.

**Поправка:** изберете един canonical product/project name и го уеднаквете в `package.json`, README, error messages, metadata, Supabase project checks и UI copy.

### 12. Health endpoint разкрива конфигурационен fingerprint — Low — **ПРИЛОЖЕНО в текущия `main`**

`app/api/health/route.ts:8-11` публично връща дали Supabase и Groq са конфигурирани. Това е полезно за диагностика, но в production разкрива deployment информация.

**Поправка:** публичният health endpoint да връща само `status`/version; подробният readiness endpoint да е защитен или достъпен само вътрешно. Ако endpoint-ът е предназначен за monitoring, използвайте отделен authenticated/readiness route.

## Добри страни

Проектът има strict TypeScript, Zod в ключовите API входове, Supabase ownership/RLS политики, проверка на файлови signatures и размер до 10 MB, audit събития, отделени i18n речници, тестове за auth/RLS/domain state и успешен production build. Не бяха открити директно hardcoded service-role ключове или `dangerouslySetInnerHTML` в сканираните source файлове.

## Препоръчан ред за поправяне

1. **Преди production:** задължителен webhook secret, rate limiting на service request и chat, Supabase/public route поведение.
2. **Следващо:** атомарно claiming/idempotency за extraction и analysis; client-supplied text policy.
3. **CI:** реален migration/RLS smoke test и regression tests за всички горни сценарии.
4. **UX:** преместване на 21 hardcoded текста в i18n.
5. **Поддръжка:** уеднаквяване на project/brand naming и завършване или скриване на PDF функцията.

## Заключение

Кодът в текущия snapshot компилира и минава локалните проверки, но не трябва да се приема като production-ready без горните security и concurrency поправки. Най-рисковата комбинация е липсващото rate limiting + опционалният webhook secret + неконтролираните AI операции, защото може да доведе до спам, изтичане/неправилно предаване на PII и непредвидими външни разходи.

Поправките са приложени локално в работното копие. GitHub remote репозиторията не е променян автоматично.


## Validation update — 15 септември 2026 г.

Точки 1–7 и 12 от този одит са реално приложени и push-нати в текущия main чрез commit fa68775 (за точки 1–7) и commit 73c1e41/последващото health hardening (за точка 12). Те вече не се третират като отворени дефекти. Точки 8–11 остават реално отворени. PDF export-ът е отделно документиран като извън v1 scope в docs/PDF_EXPORT_SCOPE.md.
