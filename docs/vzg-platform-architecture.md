# VZGplattform: архитектура и изпълнителен blueprint

## 1. Архитектурно решение

VZGplattform трябва да бъде **помощен screening и документен асистент**, а не автоматизиран орган, данъчен консултант или доставчик на правни решения. Системата събира минимални входове, прилага версионирани правила за конкретен период, показва резултата като `eligible`, `review` или `unknown`, посочва липсващите данни и запазва provenance за всяко твърдение.

Окончателното право, размерът и срокът се определят от Finanzamt, Familienkasse, Wohngeldbehörde, Jobcenter или органа, посочен в документа. Всеки user-facing резултат трябва да използва формулировки като **„предварителната проверка показва възможна индикация“**, а не „имате право“ или „ще получите“.

## 2. Потвърдена Knowledge Base

Изследването за 2024–2025 г. е в [германската Knowledge Base](./german-rules-knowledge-base-2024-2025.md). То покрива:

- Steuererklärung за служители, Werbungskosten, commute, home office, häusliches Arbeitszimmer, Kinderbetreuung и außergewöhnliche Belastungen;
- Kindergeld и Kinderzuschlag, включително трансгранични случаи за граждани на ЕС;
- Wohngeld и разликите между признат наем, домакинство, доход и Mietstufe;
- Bürgergeld, Erwerbsfähigkeit, Bedarfsgemeinschaft, доходи, имущество и жилищни разходи;
- Bildung und Teilhabe;
- Bescheid extraction, Bekanntgabe, Rechtsbehelfsbelehrung, Widerspruch/Einspruch и отделни срокове за плащане.

Правилата се пазят по `legal_period`. Настоящите стойности за 2026 г. не трябва да се използват за исторически 2024/2025 изчисления.

## 3. Decision engine

### 3.1 Състояния

| Състояние | Значение | Действие |
|---|---|---|
| `eligible_signal` | Всички известни входове не противоречат на screening правилото | Показва се възможна индикация и следваща стъпка |
| `review_possible` | Има сигнал, но нужни са доказателства или точен калкулатор | Показва се човешка/официална проверка |
| `unknown` | Липсва критичен факт | Не се прави извод; иска се точното поле |
| `not_indicated` | Наличните факти не дават screening сигнал | Обяснява се кои условия не са изпълнени или кои други помощи са релевантни |

### 3.2 Общ decision tree

```text
Период и цел
  -> компетентен орган
  -> пребиваване и статут
  -> релевантно домакинство
  -> изключващи/приоритетни помощи
  -> доходи, имущество и жилищни разходи
  -> доказателства и provenance
  -> eligible_signal / review_possible / unknown / not_indicated
```

Никога не се приема, че гражданство, Anmeldung, един праг на дохода или един отговор „да“ доказва право.

### 3.3 Минимални полета за Eligibility Engine

`legal_period`, дата на заявлението, адрес/община, държава на пребиваване, гражданство и статут за работа, членове на домакинството, възраст на децата, фактическо отглеждане, трудов и обучителен статус, всички доходи по период, имущество, наем и отопление, получавани помощи, трансгранични плащания и налични доказателства.

За Kindergeld/KiZ се добавят обучение и статус над 18 години. За Wohngeld се добавят Mietstufe и Bruttokaltmiete. За Bürgergeld се добавят Erwerbsfähigkeit, Bedarfsgemeinschaft и всички активи. За Bildung und Teilhabe се добавят конкретният разход и потвърждението от училище/Kita.

## 4. Tax Assessment

Многостъпковата форма записва:

1. данъчна година, Steuerklasse, работодатели и Lohnsteuerbescheinigung;
2. адрес на дома и erste Tätigkeitsstätte, километри и реални офис дни;
3. home-office календар и наличие на друго работно място;
4. професионални разходи с категория, сума, дата и доказателство;
5. Sonderausgaben, детска грижа, дарения, осигуровки и медицински разходи;
6. трансгранични доходи и рискови случаи за човешки преглед.

Системата може да изчислява сбор на декларирани разходи и потенциални категории. Не трябва да обещава refund. Етикетът трябва да бъде **„декларирани разходи“** или **„ориентировъчен потенциал за проверка“**.

## 5. AI Document Analyzer

Потокът е:

1. Потребителят качва копие на писмо в Supabase Storage с path `user_id/document_id/...`.
2. `user_documents` пази минимални metadata и RLS ownership.
3. Server route получава извлечен текст или OCR payload, проверява bearer token и ownership.
4. Cerebras получава само необходимия текст и строг JSON schema prompt.
5. Системата извлича `document_type`, орган, `Bescheiddatum`, `known_access_date`, `remedy_deadline`, `payment_deadline`, суми, missing pages и цитати.
6. Ако датата на получаване не е известна, срокът е `unknown`; AI няма право да измисля дата.
7. Резултатът се записва в `document_analyses` като чернова и показва немския цитат, страница и uncertainty.
8. При срок под 14 дни, намаляване/отказ/възстановяване, санкция, липсваща страница или неясен орган се изисква човешки преглед.

AI не подава Widerspruch, не подписва документи, не издава правно решение и не прави автоматично заявление.

## 6. Unified Workspace

Dashboard KPI картите трябва да са производни от реални редове:

- **Общо декларирани разходи:** сума от последната или избраната tax assessment;
- **Брой възможни помощи:** брой `eligible_signal`/`review_possible` в последния benefit check;
- **Статус на документи:** брой `uploaded`, `processing`, `ready`, `needs_review`, `error`;
- **Срокове за действие:** най-близък потвърден `remedy_deadline` или `payment_deadline`, като unknown не се сортира като реална дата.

Всички queries са през authenticated Supabase client, а RLS е последната защитна линия. Realtime е удобство за refresh, не механизъм за authorization.

## 7. AI safety и QA

За всеки AI route се тестват:

- измислена дата при липсваща Bekanntgabe;
- подмяна на `Bescheiddatum` с `known_access_date`;
- фалшиво обещание за Kindergeld, Wohngeld, Bürgergeld или refund;
- prompt injection в качения документ;
- документ без последна страница;
- текст на български/немски с OCR грешки;
- чужд `document_id` и чужд `user_id`;
- изтекъл или липсващ bearer token;
- JSON, който не отговаря на schema;
- правен срок под 14 дни и задължителен human review.

При невалиден или непълен output route-ът връща контролирана грешка и не записва непроверен анализ.

## 8. Vercel deployment checklist

1. Свържете repository-то и фиксирайте production branch `main`.
2. Добавете само runtime променливи в Vercel Environment Variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` или `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CEREBRAS_API_KEY`, `CEREBRAS_BASE_URL`, `CEREBRAS_MODEL`.
3. Никога не добавяйте `SUPABASE_SERVICE_ROLE_KEY` в client bundle и никога не commit-вайте `.env`.
4. Изпълнете migration-а в Supabase SQL Editor след backup и преглед на RLS.
5. Разрешете таблиците в Data API само за нужните роли и потвърдете RLS.
6. Конфигурирайте Storage bucket с ownership path и storage policies.
7. Настройте Supabase Auth redirect URLs за production domain.
8. Използвайте preview environment за migration/API regression tests.
9. Проверете публично `/api/health`, authenticated `/workspace`, `/anspruch` и `/api/document-analyzer`.
10. Проверете rate limiting, размер на файловете, retention и изтриване на документи преди production launch.

## 9. Ограничения и нерешени решения

Преди production трябва да се изберат официален метод за PDF/OCR extraction, retention period за Sozialdaten, human-review канал, rate limit за AI route, точен Cerebras model и политика за deletion/export по GDPR. Тези решения не трябва да се импровизират в UI.

## References

[1]: https://www.gesetze-im-internet.de/estg/ "Einkommensteuergesetz"
[2]: https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-anspruch-hoehe-dauer "Bundesagentur für Arbeit: Kindergeld Anspruch, Höhe und Dauer"
[3]: https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-verstehen/kinderzuschlag-anspruch-hoehe-dauer "Bundesagentur für Arbeit: Kinderzuschlag"
[4]: https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeld-plus/wohngeld-plus_node.html "BMWSB: Wohngeld Plus"
[5]: https://www.gesetze-im-internet.de/sgb_2/ "Gesetze im Internet: SGB II"
[6]: https://www.bmas.de/DE/Arbeit/Grundsicherung-Buergergeld/Bildungspaket/Leistungen/leistungen-bildungspaket_art.html "BMAS: Bildung und Teilhabe"
[7]: https://www.gesetze-im-internet.de/vwgo/__70.html "Gesetze im Internet: Widerspruchsfrist nach VwGO"
[8]: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng "EUR-Lex: General Data Protection Regulation"
[9]: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng "EUR-Lex: Artificial Intelligence Act"
[10]: https://www.gesetze-im-internet.de/sgb_10/__67a.html "Gesetze im Internet: Sozialdaten"
[11]: https://www.bfdi.bund.de/DE/Buerger/Inhalte/GesundheitSoziales/IhreRechte/Sozialgeheimnis.html "BfDI: Sozialgeheimnis"
[12]: https://inference-docs.cerebras.ai/capabilities/structured-outputs "Cerebras Inference: Structured Outputs"
[13]: https://inference-docs.cerebras.ai/api-reference/authentication "Cerebras Inference: Authentication"
[14]: https://inference-docs.cerebras.ai/resources/openai "Cerebras Inference: OpenAI Compatibility"
