# Terra — начално задание и инструменти

## Решение след анализ на плана

Master планът остава roadmap, не една огромна задача. Първо стабилизираме upload и проверките. После завършваме един договор от начало до край. Не изграждаме едновременно всички категории, OCR, платени услуги и маркетинг.

Запазваме намерението на потребителя: n8n координира автоматизациите и човешките задачи; AI превежда/обяснява и предлага факти за потвърждение, но не взема самостоятелни решения. Не пренасяме надеждността на продукта в неконтролирана верига от AI агенти. Подписването изисква отделен избор на доставчик и проверка на приложимата форма; бутон „Приемам“ не се представя автоматично като подпис.

## Инструменти и доказано състояние

- Local shell, Git, rg и apply_patch: налични.
- Node: 24.19.0; pnpm: 11.19.0 в текущата среда. CI използва Node 20/pnpm 10. Не променяй версиите без отделна оценка за съвместимост.
- Vitest, ESLint, TypeScript и Next: използвай локалните инсталирани зависимости с pnpm; preflight проверява наличие.
- GitHub connector: достъпът до `tarifberatung24-blip/finanzbg-original` е потвърден чрез get_repo. Това не е разрешение за push/merge.
- Supabase connector: get_project за `numyqalfphyrnedlfzfs` върна `ACTIVE_HEALTHY`. Това е проверка на проекта, НЕ на RLS, миграции, ключове или upload.
- Vercel connector: list_teams работи. Project-specific deployments/env/logs още трябва да се проверят.
- Browser: използвай наличното browser умение за UI проверки. Не инсталирай втори браузърен framework за P0.
- n8n/Eve/Slack: не са необходими за локалния P0. Не изпращай пробни заявки или кампании към живи workflows при подготовката.

При нова сесия инструментите може да се различават. Откривай наличните по име/описание; skill инструкции не са доказателство за автентикирана връзка. Ако липсва връзка, използвай стандартния host OAuth поток; не копирай tokens между среди и не ги искай в чата.

## Първа команда

От root на `finanzbg-original`:

```bash
node scripts/terra-preflight.mjs
git status --short
git diff --check
```

Preflight е локален, само за четене, не зарежда `.env` файлове, не прави мрежови заявки и не извежда secret стойности. Проверява executables, installed packages, env presence и статичното противоречие в upload guard. Ненулев exit code за липсващ основен инструмент е блокер; предупрежденията за cloud integrations не забраняват локални тестове.

## T0 — P0 upload guard (първа задача при старт на Terra)

Цел: един каноничен project identifier, използван и от Supabase config, и от upload validation.

1. Прочети правилата и текущите `lib/documents/validation.ts`, `lib/supabase/config.ts`, `supabase/project.json`, `app/api/documents/upload/route.ts` и свързаните тестове.
2. Свери latest main чрез GitHub read tool или позволен git fetch. Не презаписвай работното дърво. Ако fix вече е upstream, докладвай го вместо да дублираш.
3. Напиши regression test, който се проваля за каноничния URL при стария guard.
4. Направи минимален fix, използващ `supabase/project.json`, без да променяш проекта или environment.
5. Тестове: каноничен URL; trailing slash; стар/чужд URL; липсващ URL. Не отслабвай проверката до „всеки supabase.co“.
6. Провери upload route с mock dependencies, където е практично: грешен проект отказва преди upload, правилният достига upload, неавтентикиран потребител е отказан. Използвай само synthetic fixtures.
7. Изпълни TypeScript, lint, focused/full tests, build и diff review. Remote upload test остава отделно с разрешен тестов акаунт.

Позволени файлове за този пакет: validation helper, нови/съществуващи свързани тестове и минимален общ project helper само ако е нужен. Без промени в env, schema, auth, dependencies, UI, n8n, Eve или production.

Критерий: regression test RED преди fix / GREEN след fix; старият project guard отстранен; съществуващите тестове не регресират; production не се обявява за поправен без deploy и реален smoke.

## T1 — CI typecheck (отделен малък пакет)

В package.json няма `typecheck`, но `.github/workflows/ci.yml` изпълнява `pnpm run --if-present typecheck`. Това може тихо да пропусне TypeScript. При отделно възлагане добави реален script и задължителна CI проверка, без unrelated upgrades. Локално винаги изпълнявай `pnpm exec tsc --noEmit`.

## T2 — read-only проверка на средата

След T0: провери Supabase migrations/tables/advisors и Vercel deployments/logs само за правилните проекти. Не чети customer rows. Не изтегляй всички secret env values. Отчети отделно: connector достъп, приложени миграции, RLS metadata, private bucket, Auth настройки, runtime keys и реален smoke.

Не създавай baseline schema по предположение и не прилагай историческите миграции на сляпо. Първо сравни deployed schema и history; после предложи възстановима миграция и план за staging/backup.

## Последващи пакети

| Пакет | Резултат | Зависимост |
|---|---|---|
| T3 | Сигурен upload/preview/download, изолация между двама тестови клиенти | T0–T2 |
| T4 | Един тип договор, ръчно попълване и потвърждение | T3 |
| T5 | OCR/извличане, BG обяснение и източник по страница | T4; одобрен доставчик и бюджет |
| T6 | Radar, background известия и retries | Потвърдени договорни факти |
| T7 | n8n задачи и операторски панел с persisted request/status | T3–T6 |
| T8 | Eve brand context, read-only aggregated metrics, тестове за одобрения | Отделно Eve repo |
| T9 | Контролиран launch | Core e2e, правни текстове, capacity и attribution |

Eve подготовката на чернови може да върви преди launch; публикуване, email и разход на бюджет не са автоматично разрешени. B2B остава само чернова. OCR, e-sign и subscriptions са избори/предложения, не потвърдени работещи интеграции.

## Validation и handoff

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
git diff --check
```

Не стартирай няколко build/typecheck процеса едновременно, ако споделят `.next` артефакти. Не пренасяй старите 39 PASS теста като резултат от новия fix. Запиши кои проверки са изпълнени сега и кои са BLOCKED/NOT RUN.

Финален отчет по PROJECT_RULES: TASK, STATUS, FILES CHANGED, COMMIT, TYPECHECK, BUILD, TESTS, DEPLOYMENT, HTTP CHECK, BLOCKERS, NOT IMPLEMENTED, NEXT RECOMMENDED STEP. Commit/push/deploy само в рамките на изрично възложената задача.

## Стартово съобщение към Terra

„Прочети AGENTS.md и docs/TERRA_START.md. Изпълни само T0 — Supabase upload guard и regression tests. Запази всички чужди локални промени. Не променяй production, env, schema, dependencies или Eve. Завърши с validation и отчет; при липсващ cloud достъп продължи локалните тестове, но отбележи end-to-end като BLOCKED.“
