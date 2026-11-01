# HORIZON Alpha Team — Control Plane Blueprint

## Цел

Horizon Alpha Team е агентският control plane върху вече съществуващата VZGplattform. Той не е втори продукт и не заменя текущите case/document workflows. Той добавя организационен слой, който избира правилния specialist agent, описва SOP/skill файла, връща проверим план и насочва резултата към съществуващия review/approval поток.

Тази архитектура следва модела от предоставеното видео: `Operator → Conductor → Specialist agents → Knowledge base → SOP/skills → Quality gate`. В HORIZON той се реализира като: `User/Operator → Horizon Conductor → domain agents → cases/documents → provenance + quality gate → user approval`.

## Какво вече съществува в платформата

Публичният repository описва VZGplattform като Next.js 16/React 19 приложение със Supabase Auth, PostgreSQL, Storage, RLS, OCR/PDF processing, български и немски интерфейс и workflows за документи, Kindergeld, Finanzamt, Jobcenter и contract radar. Това е достатъчна основа за Alpha Team, защото case context, document intake, OCR, AI assistant и approval boundaries вече са отделени в съществуващи модули.

Alpha Team използва тези повърхности, вместо да създава нова база от потребители, документи или случаи:

- `cases` — каноничен owner-scoped case context;
- `source_documents` / `document_pages` — вход и извлечен текст;
- `document_analysis_results` / `extracted_facts` — предложения и потвърдени факти;
- case assistant — обяснение, превод, интервю и draft generation;
- existing audit/tasks/deadlines — последваща интеграция за traceability.

## Alpha Team registry

| Екип | Агент | Основна отговорност | Автономност |
| --- | --- | --- | --- |
| Conductor | Horizon Conductor | Класифицира заявката и избира минималния екип | Human-assisted |
| Documents | Document Intake Agent | OCR/извличане и откриване на липсващи доказателства | Human-assisted |
| Finance | Finance & Tax Agent | Обяснение на данъчни документи и draft от потвърдени факти | Human-assisted |
| Social | Social Benefits Agent | Kindergeld/Jobcenter/Arbeitsagentur case guidance | Human-assisted |
| Communications | Correspondence Agent | Двуезични обяснения и чернови на немски | Human-assisted |
| Operations | Deadline Monitor | Детерминирани срокове и напомняния | Fully-autonomous за вътрешно напомняне |
| Quality | Quality & Safety Agent | Provenance, missing facts, risk and approval gate | Human-assisted |

Всеки агент има `sopId`, `skillFile`, списък с разрешени операции и ниво на автономност. Това е машинно четимият еквивалент на видимите в клипа SOP/skill файлове.

## Първи реализиран control plane

Добавени са:

- `lib/horizon/agent/team.ts` — registry, autonomy ladder, deterministic routing и task plan;
- `lib/horizon/agent/skills.ts` — статичен registry на versioned SOP/skill contracts;
- `lib/horizon/agent/team.test.ts` — тестове за routing и safety invariants;
- `lib/horizon/agent/skills.test.ts` — проверка, че всеки registry skill има реален markdown contract;
- `app/api/horizon/alpha-team/route.ts` — защитен `GET` manifest и `POST` plan endpoint;
- `skills/*/*.md` — седем реални SOP/skill файла с input, procedure, refusal conditions и output;
- `docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md` — тази архитектурна спецификация.

API:

```text
GET  /api/horizon/alpha-team
POST /api/horizon/alpha-team
```

`POST` приема:

```json
{
  "objective": "Обясни писмото от Finanzamt",
  "caseId": "existing-case-id",
  "documentIds": ["existing-document-id"],
  "locale": "bg"
}
```

Резултатът е plan, не външно действие. Той съдържа уникален run ID, trace ID, lead agent, supporting agents, SOP/skill metadata, steps, blockers и флагове за approval/external action. Заявка без case context може да изпълнява само context-free операции; case-dependent задача получава blocker, докато route-ът не валидира owner-scoped case и documents.

Всеки план има explicit execution handoff към `/api/horizon/cases/{id}/assistant`. Това е metadata contract към вече съществуващия P7 Case Assistant, а не втори AI pipeline. Alpha Team класифицира и валидира; Case Assistant обяснява/подготвя; approval/release/safety механизмите остават канонични.

## Реален execution loop

Следващият execution слой трябва да следва този цикъл:

```text
Observe → Classify → Load case/document context → Plan → Run specialist →
Quality/provenance check → Draft → User review → User approval → Existing action engine
```

Conductor не трябва да изпраща документи, да подписва, да приема договори или да влиза в authenticated third-party accounts. Тези операции вече са отделени в safety policy и approval/send engines и трябва да останат там.

## Връзка с текущия P7 assistant

Alpha Team не заменя `/api/horizon/cases/{id}/assistant`. P7 остава execution surface за case-scoped explanation/drafting. Следващият адаптер трябва да подаде към P7:

1. Alpha plan и trace ID;
2. case context;
3. confirmed facts и missing required keys;
4. specialist prompt version;
5. provenance metadata.

Така Conductor избира екипа, а съществуващият case assistant изпълнява разрешената AI работа. Външното изпращане остава отделен одобрен workflow.

## Следващи инкременти

### A. Case-aware execution

Добавяне на `caseId` ownership check към plan endpoint и извличане само на owned case context чрез съществуващия case engine.

### B. Agent skill contracts

Всеки `skillFile` да бъде реален versioned markdown contract със schema за input/output, required evidence, allowed tools, refusal conditions и provenance fields.

### C. Persistent runs

Добавяне на additive persistence за `agent_runs`/`agent_steps` само след одобрение на schema/RLS промяната. Run record трябва да съдържа status, idempotency key, prompt/model version, input references, output references и audit event.

### D. Event-driven loop

Връзка към съществуващите document/case/deadline events. Постоянно работещият агент трябва да обработва опашка от bounded events, а не да извършва неконтролирано безкрайно самообучение. Тази автоматизация още не е включена в production и трябва да мине през отделен review на event idempotency и notifications.

### E. Operator console

UI визуализация с отдели, агенти, skill/SOP metadata, run status, blockers и approval queue. Това е визуалният „Optimal Engine“ слой от видеото, но данните трябва да идват от реалния registry и audit trail.

## Регулаторна позиция

Избягвайте да представяте Alpha Team като автономен орган, кредитен решаващ механизъм или система, която „залавя“ престъпници. Европейската комисия описва като high-risk определени системи за достъп до essential private/public services, кредитно scoring, employment, migration и law enforcement. За high-risk системите са посочени risk management, quality data, logging, documentation, human oversight, robustness, cybersecurity и accuracy изисквания. Затова първата реална версия трябва да бъде explanation/drafting/coordination layer с човек в approval boundary.

Това не намалява визията. Напротив — дава възможност да се построи пълният Conductor/Specialist/Knowledge/SOP модел веднага, като опасните външни действия се включват по-късно през конкретни разрешени adapters.

## Източници

- Repository и текуща продуктова архитектура: [VZGplattform GitHub](https://github.com/tarifberatung24-blip/VZGplattform)
- Регулаторен контекст: [European Commission — AI Act regulatory framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
