# Tarifberater24 → HORIZON Alpha Team

Източникът на услугите е публичното приложение `https://tarifberater24.base44.app`. В HORIZON тези услуги са безплатни за потребители с достъп до платформата. Цените от публичния Base44 сайт не се пренасят.

## Интегрирани услуги

Осемте услуги са достъпни през HORIZON Service Center и `/zayavka?service=...`:

- Wohnsitzanmeldung;
- Abmeldung / Ummeldung;
- Steuererklärung;
- Krankenkassenwechsel;
- Gewerbeanmeldung;
- Führerschein-Umschreibung;
- Aufenthaltstitel — Beantragung & Verlängerung;
- Beglaubigungen & Übersetzungen.

Всеки service request се записва преди handoff-а. Payload-ът се изпраща към `horizon_alpha_service_v1` и съдържа service kind, lead Alpha agent, objective, required evidence и execution mode.

## Alpha Team поведение

Alpha Team автоматично:

1. класифицира услугата;
2. определя водещия specialist;
3. проверява кои данни и документи липсват;
4. подготвя draft, checklist или следваща стъпка;
5. връща резултата в HORIZON workflow-а за преглед.

Външни действия остават блокирани до човешко одобрение. Това включва подаване към Behörden, подписване, плащане, поръчка на превод/заверка, Kündigung, регистрация, изпращане на имейл и всяко действие, което създава правен или финансов ангажимент.

## Mapping

- административни документи: `document-intake`;
- данъчна декларация: `finance-tax`;
- Krankenkassenwechsel: `quality-safety` с човешка проверка на условията;
- Aufenthaltstitel: `quality-safety` заради критични срокове и институционално решение;
- преводи и заверки: `document-intake`, следван от partner handoff без автоматична поръчка.

## Какво не се обещава

HORIZON не обещава одобрение, възстановяване, икономия, издаване на Aufenthaltstitel, приемане от институция или определен административен срок. Публичната заявка не приема чувствителни документи; документите се добавят по защитения case flow, след като заявката бъде приета.

## Deployment requirement

За реален unattended handoff трябва да е конфигуриран подписан `AUTOMATION_WEBHOOK_URL` и `AUTOMATION_WEBHOOK_SECRET`. При липсващ webhook заявката се запазва, но се връща контролируем `AUTOMATION_WEBHOOK_NOT_CONFIGURED`, за да не бъде загубена.
