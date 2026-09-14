-- Pilot Finanzbildung knowledge layer.
-- Educational content only; no investment recommendations or product execution.
create table if not exists public.financial_education_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  locale text not null default 'bg' check (locale in ('bg','de')),
  level text not null default 'beginner' check (level in ('beginner','intermediate')),
  category text not null,
  title text not null,
  summary text not null,
  content text not null,
  context_key text,
  source_reference text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_education_lessons_locale_idx on public.financial_education_lessons(locale, status, sort_order);
create index if not exists financial_education_lessons_context_idx on public.financial_education_lessons(context_key, status);
alter table public.financial_education_lessons enable row level security;
create policy financial_education_lessons_read_published on public.financial_education_lessons
  for select to authenticated using (status = 'published');
grant select on public.financial_education_lessons to authenticated;

insert into public.financial_education_lessons
  (slug, locale, level, category, title, summary, content, context_key, source_reference, sort_order)
values
  ('money-and-interest-bg', 'bg', 'beginner', 'Основи', 'Как работят парите и лихвата?', 'Лихвата е цената на парите във времето.', 'Лихвата показва как една сума се променя във времето. При задължение тя увеличава разхода, а при спестяване може да увеличава стойността. Винаги проверявай дали говорим за номинална или ефективна лихва и за какъв период.', 'cashflow', 'Пилотен образователен текст; не е индивидуален финансов съвет.', 10),
  ('assets-and-liabilities-bg', 'bg', 'beginner', 'Основи', 'Активи и задължения', 'Net Worth започва с ясна картина на това, което притежаваш и дължиш.', 'Активите са стойности, които притежаваш. Задълженията са суми, които трябва да изплатиш. Нетната стойност се изчислява детерминистично: активи минус задължения. Платформата не попълва липсващи стойности вместо теб.', 'net_worth', 'Пилотен образователен текст; не е индивидуален финансов съвет.', 20),
  ('emergency-reserve-bg', 'bg', 'beginner', 'Сигурност', 'Защо резервът е първа стъпка?', 'Резервът помага да не вземаш скъпи решения под натиск.', 'Преди да сравняваш инвестиционни възможности, е полезно да видиш дали имаш достъпен резерв за непредвидени разходи. Нужният размер зависи от твоите разходи и ситуация; платформата показва липсващи данни, а не измисля целева сума.', 'reserve', 'Пилотен образователен текст; не е индивидуален финансов съвет.', 30),
  ('cashflow-bg', 'bg', 'beginner', 'Ежедневни финанси', 'Cashflow: какво остава всеки месец?', 'Месечният паричен поток е разликата между потвърдени приходи и разходи.', 'Cashflow не е само заплата. Събери потвърдените регулярни приходи и извади потвърдените регулярни разходи. Ако липсват категории, резултатът трябва да бъде отбелязан като непълен, а не да се допълва с предположения.', 'cashflow', 'Пилотен образователен текст; не е индивидуален финансов съвет.', 40),
  ('risk-and-diversification-bg', 'bg', 'beginner', 'Инвестиционна грамотност', 'Риск и диверсификация', 'По-висока възможна доходност обикновено е свързана с по-висока несигурност.', 'Диверсификацията разпределя риска между различни активи, но не го премахва. Този модул обяснява понятията само образователно. Не предоставя конкретен продукт, покупка или персонализирана препоръка.', 'portfolio', 'Пилотен образователен текст; не е индивидуален финансов съвет.', 50),
  ('money-and-interest-de', 'de', 'beginner', 'Grundlagen', 'Wie funktionieren Geld und Zinsen?', 'Zinsen zeigen, wie sich ein Betrag über die Zeit verändert.', 'Zinsen sind der Preis für Geld über einen bestimmten Zeitraum. Bei Schulden erhöhen sie die Kosten, bei Sparguthaben können sie den Wert erhöhen. Prüfe immer, ob der nominale oder effektive Zinssatz und welcher Zeitraum gemeint ist.', 'cashflow', 'Pilot-Lerntext; keine individuelle Finanzberatung.', 10),
  ('assets-and-liabilities-de', 'de', 'beginner', 'Grundlagen', 'Vermögen und Verbindlichkeiten', 'Net Worth beginnt mit einer klaren Übersicht über Besitz und Schulden.', 'Vermögen sind Werte, die du besitzt. Verbindlichkeiten sind Beträge, die du zurückzahlen musst. Das Nettovermögen wird deterministisch berechnet: Vermögen minus Verbindlichkeiten. Fehlende Werte werden nicht automatisch ergänzt.', 'net_worth', 'Pilot-Lerntext; keine individuelle Finanzberatung.', 20),
  ('cashflow-de', 'de', 'beginner', 'Alltag', 'Cashflow: Was bleibt monatlich übrig?', 'Der monatliche Cashflow ist die Differenz aus bestätigten Einnahmen und Ausgaben.', 'Cashflow ist nicht nur das Gehalt. Addiere bestätigte regelmäßige Einnahmen und ziehe bestätigte regelmäßige Ausgaben ab. Fehlen Kategorien, wird das Ergebnis als unvollständig markiert und nicht geschätzt.', 'cashflow', 'Pilot-Lerntext; keine individuelle Finanzberatung.', 40)
on conflict (slug) do nothing;
