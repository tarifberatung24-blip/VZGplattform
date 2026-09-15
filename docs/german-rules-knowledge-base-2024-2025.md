# VZGplattform: база знания за германски данъци и социални помощи (2024–2025)

## 1. Обхват и задължителен disclaimer

Този документ е **източникоподкрепена справочна база знания на български език** за предварителен скрининг на лица и семейства, които живеят, работят или получават доходи в Германия. Покрити са данъчни облекчения за служители, Kindergeld, Kinderzuschlag, Wohngeld, Bürgergeld, Bildung und Teilhabe и обработване на официални Bescheid-и и срокове за реакция. Правилата са версионирани към данъчни/помощни периоди **2024–2025 г.**

Материалът **не е индивидуален данъчен, правен или социален съвет** и не издава решение за право, размер или срок. Обвързващо решение взема компетентният орган: Finanzamt, Familienkasse, Wohngeldbehörde, Jobcenter, Sozialamt/AsylbLG-служба или друг посочен в Bescheid-а орган. При трансгранични доходи, гражданство/пребиваване, студентски статут, инвалидност, медицински разходи, голямо имущество, самостоятелна дейност, разделено родителство или спорен срок е задължителен човешки преглед.

**Времева граница.** Текущи официални страници могат да са обновени за 2026 г. и по-късни реформи. Не се пренасят назад например терминът Grundsicherungsgeld или нови правила по SGB II. Винаги се пазят `benefit`, `legal_period`, `application_date`, `decision_date` и използваната правна редакция.

## 2. Легенда за безопасно използване в decision tree

| Етикет | Значение и допустим изход |
|---|---|
| **Твърдо правило** | Следва от посочен закон или официална страница и може да се показва като условие, ако всички негови факти са потвърдени. |
| **Скринингова евристика** | Само сигнал за допълнителна проверка. Не е правен праг, не гарантира право и не предвижда плащане. |
| **Липсващи данни** | Асистентът не трябва да попълва стойност по предположение. Връща конкретно поле, което трябва да бъде предоставено. |
| **Човешка проверка** | Случаят се насочва към орган или квалифициран специалист; AI може да извлича и обяснява, но не да решава. |

**Най-безопасният статус** е `ориентировъчно може да има индикация за право`, а не `имате право` или `ще получите`. Максимална сума, резултат от калкулатор и нисък доход са само предварителни сигнали.

## 3. Общ минимален набор от потребителски данни

Преди скрининг се събират само данните, необходими за конкретната помощ, и се пази източникът им — документ, страница, дата или декларация на потребителя.

1. **Идентичност и период:** дата на заявлението или данъчната година; име/дата на раждане на релевантните лица; държава и дата на пребиваване; гражданство; точен адрес, община, пощенски код и провинция; Hauptwohnsitz и център на жизнените връзки.
2. **Пребиваване и право на работа:** Aufenthaltstitel, Freizügigkeitsrecht или друго основание, начало/край на статута, разрешение за работа, Meldebescheinigung, статут по AsylbLG и документи на Ausländerbehörde.
3. **Домакинство:** всички обитатели, възраст, роднинска/партньорска връзка, брак или фактическа раздяла, Einstehensgemeinschaft, деца, режим на грижа, общи финанси и отделеност на домакинствата.
4. **Доходи и активи:** брутни и нетни заплати по месец, работодатели, самостоятелна дейност, ALG I, Krankengeld, Elterngeld, пенсии, Kindergeld, KiZ, издръжка, Unterhaltsvorschuss, наеми, лихви, дивиденти, чуждестранни плащания, еднократни суми; банкови сметки, спестявания, ценни книжа, криптоактиви, автомобили, имоти, застраховки с парична стойност и бизнес активи.
5. **Жилище:** наемен договор или собственост; Nettokaltmiete, студени Betriebskosten, Heizkosten/топла вода, електричество, гараж; размер и обитатели; действително плащане; лихви и допустими разходи при собственост; Mietstufe и местна община.
6. **Доказателства:** Bescheide, Lohnsteuerbescheinigung, фишове, договори, фактури, банкови плащания, училищни удостоверения, медицински/инвалидностни документи, доказателства за обучение, преводи и всички приложения.
7. **Процедура:** дата и начин на получаване, плик или електронно уведомление, Bescheiddatum, Aktenzeichen/Kundennummer/Steuernummer/Kindergeldnummer, Rechtsbehelfsbelehrung, срок за плащане и срок за обжалване.

## 4. Общ безопасен скрининг — последователност

1. **Определи период и режим.** Не смесвай 2024 с 2025 и не използвай текущи 2026 стойности за исторически период.
2. **Определи органа.** Данъците са при Finanzamt; Kindergeld и KiZ — при Familienkasse; Wohngeld — при местната Wohngeldbehörde; Bürgergeld — при Jobcenter; BuT — при Jobcenter или местна BuT-служба според входната помощ.
3. **Провери статут и фактическо пребиваване.** Гражданство, Anmeldung или наличие на договор сами по себе си не доказват право.
4. **Изчисли състава на релевантното домакинство.** Не брои всички лица на един адрес механично; провери Bedarfsgemeinschaft, Haushaltsmitglieder, изключени членове и действителен дял на грижа.
5. **Провери изключващи и приоритетни помощи.** Същият разход или жилищна нужда не се финансира два пъти; KiZ, Wohngeld и Bürgergeld имат различни режими.
6. **Събери доход, имущество и доказуеми разходи.** Нетна заплата или груб доходен праг не са достатъчни.
7. **Покажи резултата като статус, не като решение.** При липсващ факт изведи `unknown` и поискай точното поле. При риск — човешки преглед и официално заявление/Bescheid.

## 5. Данъчна декларация и удръжки за служители

### 5.1. Проверени стойности за 2024 и 2025 г.

| Позиция | 2024 | 2025 | Как се използва |
|---|---:|---:|---|
| `Arbeitnehmer-Pauschbetrag` | 1 230 EUR | 1 230 EUR | Автоматичен паушал за Werbungskosten при липса на доказани по-високи разходи; не е плащане към лицето. [1] [2] |
| `Entfernungspauschale` | 0,30 EUR/пълен еднопосочен км до 20 км; 0,38 EUR от 21-вия км | Същото | Само за дни с посещение на `erste Tätigkeitsstätte`; обичайният лимит е 4 500 EUR без собствен или предоставен автомобил. [3] [4] |
| `Homeoffice-Tagespauschale` | 6 EUR/допустим ден, максимум 1 260 EUR | Същото | 210 дни достигат математическия максимум, но 210 не е законов праг за право. [5] [6] |
| `Häusliches Arbeitszimmer` | Действителни разходи или `Jahrespauschale` 1 260 EUR при строгите условия | Същото | Отделен режим за помещение, използвано почти изцяло професионално, когато е център на цялата дейност. [5] [7] |
| Детска грижа като `Sonderausgaben` | 2/3 до 4 000 EUR на дете | 80% до 4 800 EUR на дете | При законовите възрастови, фактурни и банкови условия. [8] [9] |
| `Sonderausgaben-Pauschbetrag` | 36 EUR; 72 EUR при съвместно облагане | 36 EUR; 72 EUR при съвместно облагане | Само за изброените в §10c категории, ако не са доказани по-високи разходи. [10] |
| Основен необлагаем минимум | 11 784 EUR | 12 096 EUR | Контекст за общия данък; не променя Arbeitnehmer-Pauschbetrag. [2] [4] |

### 5.2. Твърди правила и безопасен скрининг

**Werbungskosten.** По §9 EStG това са професионално обусловени разходи за придобиване, обезпечаване и запазване на дохода — например Arbeitsmittel, професионално облекло при изпълнени условия, членски вноски, служебни пътувания, двойно домакинство и commute. Прилага се по-високата доказана сума вместо паушала. [1] [3]

**Screening евристика:** ако потенциално доказуемите професионални разходи надхвърлят 1 230 EUR, маркирай `review_possible`, но не прави извод за декларация или възстановяване. Сумата трябва да е за правилната година, професионално обусловена и да не е включена втори път в друга категория.

**Home office.** 6 EUR се допуска за календарен ден, когато работата е извършвана преимуществено у дома и не е посещавано първото работно място. При трайна липса на друго работно място има специална хипотеза и за ден, в който е работено извън дома или е посетена erste Tätigkeitsstätte. За един и същ ден не се броят автоматично home office и commute. Дневната сума не се комбинира за същия период с режима на häusliches Arbeitszimmer или с Unterkunft при двойно домакинство. [5] [6]

**Häusliches Arbeitszimmer.** Работа от дома не означава автоматично домашен кабинет. Необходимо е отделно помещение, използвано почти изцяло професионално, и то да е качественият център на цялата професионална/стопанска дейност. При изпълнение на условията се избира действителен разход или годишната сума 1 260 EUR. [5] [7]

**Sonderausgaben и детска грижа.** За детето трябва да се провери възрастта — под 14 години, или инвалидност, настъпила преди 25-годишна възраст — както и фактура от доставчика и безкасово плащане. Обучение, спорт и свободни дейности не се превръщат автоматично в Kinderbetreuungskosten. [8] [9]

**Außergewöhnliche Belastungen.** Разходът трябва да е неизбежен по правни, фактически или морални причини, необходим и разумен. Признава се само частта над индивидуалната `zumutbare Belastung`, която зависи от доход, семейно положение и деца. Нужни са доказателства за вид/дата на разхода, възстановявания, рецепти/медицински документи и, когато е нужно, Amtsarzt или други специални удостоверения. [11] [12]

### 5.3. Pflichtveranlagung, доброволно подаване и срокове

Типични основания за задължителна декларация по §46 EStG са положителни доходи извън заплатата или плащания с `Progressionsvorbehalt` над 410 EUR, няколко работодатели, определени възстановявания на здравни/Pflege-вноски над 410 EUR, Steuerklasse V/VI или Faktor при съвместно облагане, вписан Freibetrag и специални плащания/трансгранични хипотези. Това е screening списък, не изчерпателен автоматизиран тест. [13] [14]

Когато няма задължение, доброволната Arbeitnehmerveranlagung може да поиска възстановяване на удържаната Lohnsteuer, но може да доведе и до доплащане. Общите срокове за непредставляван данъкоплатец са **31.07.2025 за 2024 г.** и **31.07.2026 за 2025 г.** Доброволният срок е **31.12.2028 за 2024 г.** и **31.12.2029 за 2025 г.**; доброволният срок не се удължава. Срокът при данъчен консултант е отделен режим. [13] [14] [15]

### 5.4. Точни данъчни входове

Асистентът трябва да поиска данъчната година, данъчното местоживеене и ограничена/неограничена данъчна задълженост; Lohnsteuerbescheinigung; брутна заплата, удържани данъци, Steuerklasse, периоди на работа, работодатели, Freibetrag и доходи с Progressionsvorbehalt. За commute са нужни домашен адрес, erste Tätigkeitsstätte и начинът, по който е определена, еднопосочни километри, действителни офис дни, транспорт, автомобил и работодателски субсидии. За home office са нужни календар на дните, дни само у дома, смесени дни и фактът дали трайно е имало друго работно място.

Допълнително се събират доказуеми инструменти, облекло, членски вноски, служебни пътувания, двойно домакинство, пенсионни/здравни/Pflege-вноски, Kirchensteuer, детска грижа с фактури и банкови плащания, обучение, училищни такси, дарения и застрахователни удостоверения. За außergewöhnliche Belastungen се искат вид и дата на разхода, възстановявания, медицински документи/рецепти, Amtsarzt документи, GdB/Merkzeichen, доходи и семейно положение.

## 6. Kindergeld и Kinderfreibetrag

### 6.1. Същност и исторически суми

`Kindergeld` е месечно парично плащане; доходът на родителя не е условие за основното право. Историческите суми са **250 EUR на дете месечно през 2024 г.** и **255 EUR от 01.01.2025 г.** [16] [17]

`Kinderfreibetrag` е отделен данъчен механизъм, не второ месечно плащане. Finanzamt прави `Günstigerprüfung` между полученото Kindergeld и данъчните Freibeträge; двете стойности не се събират като очакван кеш. [2] [18]

### 6.2. Твърди правила за screening

В обичайния случай детето е под 18 години, правоимащият редовно се грижи за него и детето живее в неговото домакинство. За 18–24 години е нужно специално основание: първо обучение/университет, допустима втора квалификация при до 20 работни часа седмично, преход до четири месеца, стаж/доброволна служба или доказано търсене на място за обучение. Безработно дете може да е покрито до преди 21-ия рожден ден при регистрация като търсещо работа. При инвалидност, настъпила преди релевантната възраст, са възможни специални правила и след това, но диагнозата сама по себе си не доказва право. [19] [20]

За български граждани гражданството и Anmeldung не са достатъчни. При преместване в Германия от август 2019 г. BA посочва допълнителна проверка след четвъртия месец за основание по Freizügigkeitsgesetz/EU — работа, самостоятелна дейност, запазен статут, семейно право, достатъчни средства и здравно осигуряване или постоянно пребиваване. При трансгранично семейство се прилагат Регламенти (ЕО) 883/2004 и 987/2009; държавата на работа обичайно е приоритетна, а другата държава може да дължи само разлика. Не се обещават две пълни помощи. [21] [22]

Плащане назад за Kindergeld може да се поиска до шест месеца, ако условията са били изпълнени. Заявлението е безплатно и се подава директно до Familienkasse; представят се копия, не оригинали. [16] [20]

### 6.3. Точни входове за Kindergeld

Искайте държава и дата на пребиваване на родителя и детето, гражданство, Aufenthaltstitel или основание по FreizügG/EU, трудов/самостоятелен статус и държава на работа на всеки родител. Нужни са дата на раждане, кой се грижи за детето и при кого живее; за дете над 18 години — обучение, университет, стаж, доброволна служба, търсене на работа/обучение, седмични работни часове и евентуална инвалидност.

При трансграничен случай се събират плащания от България/ЕС, работещият родител и държавата на работа; Steuer-ID на заявителя и детето, акт за раждане, работодателска бележка или доказателство за самостоятелна дейност. За дете над 18 години се искат текущи удостоверения и промени в статуса.

## 7. Kinderzuschlag (KiZ)

`Kinderzuschlag` е отделна помощ към Kindergeld за семейство, което покрива собствения си минимум, но не покрива или едва покрива нуждите на домакинството. Максимумът е **до 292 EUR на дете месечно през 2024 г.** и **до 297 EUR през 2025 г.**, като сумата за 2025 г. включва Sofortzuschlag от 25 EUR. Това са максимуми, не обещано плащане. [23] [24]

### 7.1. Твърди условия и предпазливи прагове

Основните условия са детето да живее в домакинството, да е под 25 години и да не е женено/омъжено или в регистрирано партньорство; за него да се получава Kindergeld или сравнима помощ; и брутният месечен доход да достига **900 EUR за родителска двойка** или **600 EUR за самотен родител**. След добавяне на KiZ и евентуален Wohngeld трябва да няма остатъчна нужда по теста за семейния Bedarf или да е изпълнен разширеният достъп. [24] [25]

Тези минимални суми са входно условие, а не доходна горна граница. KiZ се изчислява за всяко дете, обичайно използва средния доход от шестте месеца преди началото на периода и се отпуска за шест месеца. По правило няма плащане за месец преди заявлението. Доходът и имуществото на домакинството могат да намалят сумата до нула. KiZ-Lotse е предварителен скрининг и не издава Bescheid. [24] [26]

Административно посочвани прагове за значимо имущество — например 55 000 EUR за двама, 70 000 EUR за трима и плюс 15 000 EUR за всяко следващо дете — се етикетират като **ориентировъчна административна информация**, а не като безопасна универсална правна граница.

### 7.2. Точни входове за KiZ

Нужни са възраст, семейно положение и фактическо живеене на детето; Kindergeld/Bescheid или сравнима помощ; семейна структура и Mehrbedarfe; брутни и реално получени доходи на всеки родител за шестте предходни месеца, по вид и месец — труд, самостоятелна дейност, ALG, Krankengeld, Kurzarbeitergeld, Elterngeld и BAföG при релевантност.

Събират се доходи на детето — издръжка, Unterhaltsvorschuss, Waisenrente; Grundmiete, Nebenkosten и Heizkosten или данни за собствено жилище; доказателства за лихви и Nebenkosten при собственост; имущество на всички членове в Германия и чужбина; Bürgergeld, Sozialhilfe, SGB XII, Wohngeld и други Bescheide; дата на подаване, текущ Bewilligungszeitraum и липсващи доказателства.

### 7.3. Безопасни разграничения

Kindergeld и KiZ не са едно и също. KiZ и Wohngeld могат да се съчетават, но имат различни правила, доказателства и органи. Kindergeld и KiZ не се включват като доход при изчисляване на Wohngeld, докато KiZ се отчита като доход при допълващо Bürgergeld според правилата на SGB II. Не се прави окончателен извод само от нетна заплата или от резултат на KiZ-Lotse.

## 8. Wohngeld

`Wohngeld` е `Mietzuschuss` за наемател/поднаемател/обитател на Heim или `Lastenzuschuss` за собственик на самостоятелно обитавано жилище. Жилището трябва да е центърът на жизнените връзки (`Mittelpunkt der Lebensbeziehungen`). Размерът зависи от признатите членове, законовия доход и признатия наем/жилищна тежест. Само местната Wohngeldbehörde издава обвързващ Bescheid. [27] [28]

### 8.1. Домакинство и статут

Не се броят механично всички регистрирани лица. Проверяват се съпруг/партньор, Einstehensgemeinschaft, роднини, деца и приемни отношения по §5 WoGG. При разделени родители се събират фактическите дялове на грижа; дете може да е Haushaltsmitglied и при двамата при специалните правила. Изключен член може да намали признатия дял от наема, без автоматично да унищожи правото на останалите.

Чужденецът трябва действително да пребивава в Германия и да има допустим статут по §3(5) WoGG. Българско гражданство само по себе си не доказва всички условия. Второ жилище не е достатъчно, ако не е центърът на жизнените връзки. [29] [30]

### 8.2. Изключения, наем и доход

По правило са изключени получатели на SGB II/Bürgergeld, Grundsicherung или Hilfe zum Lebensunterhalt по SGB XII, определени SGB XIV и AsylbLG, когато жилищните разходи вече са включени. Проверяват се законовите изключения, заемът и смесеното домакинство. Ако всички членове по принцип имат BAföG/BAB, по правило няма Wohngeld дори при отказ поради прекалено висок доход; ако само част е изключена, останалите могат да имат частично право. [31] [32]

За наемател обичайно се признава `Bruttokaltmiete` — Nettokaltmiete плюс студени Betriebskosten. Отделно не се добавят отопление/топла вода, електричество, гараж/паркомясто и услуги за грижи/домакинство. При Wohngeld-Plus има отделни паушални Heizkosten- и Klimakomponente. Признатият наем е ограничен според броя лица и местната Mietstufe I–VII. За 2025 г. таблицата Anlage 1 показва например за 1 лице 361–677 EUR и за 4 лица 608–1 139 EUR преди компонентите; това **не са доходни лимити**. [33] [34]

Доходът е очакван за Bewilligungszeitraum, не само нетна заплата. Прилагат се данъчноподобни правила, допустими разходи, 10% приспадания за данък, здравно/Pflege и пенсионно осигуряване, Freibeträge и допустима издръжка. Kindergeld, KiZ и BuT не се прихващат като доход за Wohngeld, но други детски, издръжки, BAföG/BAB, Krankengeld, пенсии и чуждестранни плащания могат да имат специално третиране и се декларират. [35]

Формулата по §19 WoGG е законово определена. Ако изчисленият Wohngeld е под 10 EUR месечно, по правило няма право; няма безопасна федерална граница на спестяванията за автоматичен тест за значимо имущество. От 01.01.2025 г. е приложена двугодишната индексация, средно около 15%; това не е еднакво увеличение за всяко домакинство. [36] [37]

### 8.3. Период и данни

Заявлението се подава до местната Wohngeldbehörde. Периодът обичайно е 12 месеца, а при очаквано постоянни обстоятелства може да е до 24 месеца. Калкулаторът на BMWSB е само ориентир. При трайна промяна в домакинството, дохода или наема се проверява задължението за уведомяване и ново решение по §27 WoGG.

Точните входове са: дата и период на заявлението; адрес, община и Mietstufe; Hauptwohnsitz; всички обитатели с възраст и връзка; наемен договор и изменения; Nettokaltmiete, студени Betriebskosten, отопление/топла вода, електричество, гараж и доказателства за плащане; вид жилище; при собственост — лихви, погасяване и Bewirtschaftungskosten; очаквани доходи по член и месец; данъци и осигуровки; Werbungskosten; издръжка; инвалидност, Pflegegrad, Grundrentenzeiten, самотен родител; всички Bescheide по SGB/AsylbLG/BAföG/BAB и паралелни заявления.

## 9. Bürgergeld по SGB II (приложима рамка 2024–2025)

### 9.1. Твърди входни условия

Основното право по §7 SGB II изисква лицето да е на поне 15 години, да не е достигнало законовата пенсионна възраст, да е `erwerbsfähig`, `hilfebedürftig` и да има `gewöhnlicher Aufenthalt` в Германия. Erwerbsfähig означава възможност за работа поне три часа дневно при обичайните условия на общия трудов пазар; за чужденец трябва да има разрешена или правно възможна заетост. [38] [39] [40]

Нуждата се оценява по лицето и, когато има `Bedarfsgemeinschaft`, по партньора и релевантните деца. Съвместният адрес не доказва автоматично Bedarfsgemeinschaft; проверяват се фактическа връзка, общи финанси, общо дете, грижа и презумпциите за Einstehensgemeinschaft. Доходът и имуществото се разграничават и се оценяват по правилата на §§11–12 SGB II. [41] [42]

### 9.2. Ставки и жилище

За 2024 и 2025 г. Regelbedarf ставките са: **563 EUR** за самотен пълнолетен/самотен родител; **506 EUR** за всеки пълнолетен партньор; **451 EUR** за пълнолетен 18–24 г. без собствено домакинство; **471 EUR** за 14–17 г.; **390 EUR** за 6–13 г.; **357 EUR** за 0–5 г. През 2025 г. има нулева актуализация. [43] [44]

Едногодишната имуществена Karenzzeit през разглеждания период е 40 000 EUR за първото лице и по 15 000 EUR за всяко следващо; след Karenzzeit основното освобождаване е 15 000 EUR на човек. За жилището Karenzzeit не означава автоматично, че всяко отопление се признава без проверка. След Karenzzeit разумността на наема и отоплението е местна преценка по размер на домакинството, община, площ и методика. [45] [46]

### 9.3. Чужденци и приоритетни помощи

Българско гражданство или адрес не гарантира Bürgergeld. Проверяват се работник/самостоятелно зает, запазен статут, първите три месеца, пребиваване само за търсене на работа, петгодишното правило, загуба на Freizügigkeitsrecht и право по AsylbLG. Само регистрация на Gewerbe не доказва действителна самостоятелна дейност. [38] [47]

Лице с право на AsylbLG, стандартно изключено обучение по BAföG/BAB, стационарно настаняване или пенсия за старост може да е изключено от SGB II, като законът съдържа конкретни изключения. Проверяват се приоритетните Wohngeld и KiZ. Wohngeld обичайно е изключен, когато жилищните разходи вече са включени в Bürgergeld; KiZ може да е приоритетна помощ и се отчита като доход при допълващо Bürgergeld. [48] [49]

### 9.4. Точни входове за Bürgergeld

Събират се гражданство, дата на раждане, адрес и дата на регистрация; Aufenthaltstitel/Freizügigkeitsrecht, основание и срок; реална работоспособност, здравни ограничения, бременност, дете под три години или грижа; състав на домакинството, общи финанси и режим на грижа; трудови договори, брутни/нетни доходи, часове, самостоятелна дейност и бизнес разходи; BAföG, BAB или Ausbildungsgeld.

Нужни са всички доходи с дата на получаване — заплати, ALG I, Krankengeld, Elterngeld, пенсии, Kindergeld, KiZ, издръжка, Unterhaltsvorschuss, наеми, лихви, дивиденти, данъчни възстановявания и еднократни плащания. За активите се събират германски и чуждестранни банкови сметки, кеш, ценни книжа, крипто, застраховки, автомобили, имоти, наследства, бизнес активи и пенсионни продукти. Жилищният пакет включва договор/собственост, студен наем, Nebenkosten, отопление, площ, обитатели, просрочия и община.

## 10. Bildung und Teilhabe (BuT)

### 10.1. Кой вход отключва проверка

Първоначално се проверява дали детето или домакинството получава **Bürgergeld, Sozialhilfe по SGB XII, Kinderzuschlag, Wohngeld или Asylbewerberleistungen**. При KiZ и Wohngeld действат допълнителните условия по §6b BKGG; **самото Kindergeld не е достатъчно**. [50] [51]

Общото правило за образователните потребности е ученик под 25 години, който посещава общообразователно или професионално училище и не получава Ausbildungsvergütung. Социално-културното участие е за нуждаещи се деца и младежи под 18 години. Kita/Kindertagespflege се проверяват отделно за екскурзии и общо обедно хранене. [52] [53]

За SGB XII и AsylbLG има несъгласуваност между текста на препращащите разпоредби, федералното обобщение и някои местни страници относно възрастовата граница. Лице над 25 години не се отхвърля механично и не се одобрява автоматично — насочва се към компетентния Sozialamt/AsylbLG орган.

### 10.2. Покривани разходи и точни суми

Проверяват се действителни разходи за еднодневни и многодневни училищни/Kita екскурзии, необходим ученически транспорт, подходяща допълнителна `Lernförderung` и общо обедно хранене. За училищни материали има фиксирани **195 EUR на учебна година** през 2024 и 2025 г.: 130 EUR за първото и 65 EUR за второто полугодие. За социално-културно участие има **до 15 EUR месечно**, но това не са безусловни свободни пари: необходимо е допустимо действително участие/разход и местната процедура може да има допълнителни изисквания. [50] [54]

Lernförderung обичайно изисква становище от училището и отделно заявление. Не е нужно непосредствено да е застрашено преминаването в следващ клас, но не се финансира всяка частна подготовка. Федералното право допуска ваучер, директно плащане към доставчика или парично плащане/възстановяване; формата зависи от органа. [55] [56]

При Bürgergeld основното/подновяващо заявление обичайно обхваща BuT, но Lernförderung остава отделно заявление. При KiZ/Wohngeld обичайно се подава отделно до местната BuT служба. По §6b, ал. 2a BKGG се проверява 12-месечният давностен срок след края на календарния месец, през който е възникнал искът.

### 10.3. Точни входове за BuT

Искайте община/район; възраст и Kita/общообразователно/професионално училище; вид и валидност на получаваната помощ и Bescheid; дали детето е включено в Wohngeld решението; за кое дете е KiZ; конкретния разход; фактура, касова бележка, билет, договор или училищно потвърждение; друг платец или местна отстъпка; при Lernförderung — потвърждение от училището и отделно заявление.

## 11. Германски Bescheid-и, срокове и документен workflow

### 11.1. Класификация и извличане

Чести типове са `Bewilligungsbescheid` (одобрение), `Ablehnungsbescheid` (отказ), `Teilbewilligungsbescheid` (частично одобрение), `Änderungsbescheid` (промяна), `Aufhebungsbescheid` (отмяна), `Aufhebungs- und Erstattungsbescheid` (отмяна и връщане), `Widerspruchsbescheid` (решение по възражение), `Steuerbescheid`, Kindergeld/KiZ-Bescheid, Bürgergeld-/Jobcenter-Bescheid, Arbeitslosengeld-, Wohngeld-, Elterngeld- и BAföG-FRB Bescheid. `Anhörung`, `Aufforderung zur Mitwirkung` и `Nachforderung` може да са процесуални писма, а не обжалваем акт. [57] [58]

AI може да извлече кандидат-полета: орган, вид, заглавие, Bescheiddatum, период от–до, сума, валута, основание, изчислителни листове, `Aktenzeichen/Kundennummer/Steuernummer`, Rechtsbehelfsbelehrung, remedy name, remedy authority, форма на подаване и срок. Винаги се съхраняват дословният немски текст и страницата; OCR/преводът не заменя оригиналния PDF или скан.

### 11.2. Срокове: правило, изключение и неизвестност

Общият административен Widerspruch по §70 VwGO е **един месец след Bekanntgabe**. За социален Bescheid §84 SGG е **един месец**, но при Bekanntgabe в чужбина е **три месеца**. Данъчният Einspruch по §355 AO е **един месец след Bekanntgabe**. При Kindergeld, Elterngeld и Wohngeld официалните портали също посочват едномесечен срок според конкретния Bescheid. [59] [60] [61] [62]

`Bescheiddatum` не е автоматично начало на срока. Трябва да се различават дата на издаване, Versanddatum, Bekanntgabe/Zugang, формално Zustellung и дата на електронно уведомяване/изтегляне. При липсваща или неправилна Rechtsbehelfsbelehrung законите предвиждат специален до едногодишен период за правния способ, но не се обещава резултат без преглед на акта и режима. [63] [64] [65]

Срокът за плащане или връщане е отделен от срока за Widerspruch/Einspruch. Обикновен e-mail не се приема автоматично като допустим канал; следва се Rechtsbehelfsbelehrung, порталът и изискваната форма. При срок под 14 дни, спиране/намаляване/отмяна на помощ, голямо възстановяване, несъответстващи дати, липсваща страница, неясен орган или възможна Klage се изисква човешка проверка.

### 11.3. Точни входове за документния workflow

Изискват се всички страници и приложения; дословно заглавие и последен раздел Rechtsbehelfsbelehrung; Bescheiddatum, Versanddatum, реална дата на получаване, плик или Zustellung, електронно уведомление и download; орган, отдел, адрес, Aktenzeichen/Geschäftszeichen/Kundennummer/Steuernummer/Kindergeldnummer; вид и обхват — одобрение, отказ, частично одобрение, промяна, отмяна или връщане; периоди, месечни/общи суми, payment deadline и remedy deadline; изчислителни листове и липсващи страници; държава на получателя, защото SGG има специално правило за Bekanntgabe в чужбина.

## 12. Какво AI **никога не трябва да твърди**

1. **Не казвай:** `имате право`, `нямате право` или `ще получите X EUR`, когато липсва факт, доказателство или решение на органа. Казвай: `предварителният скрининг показва възможна индикация; подайте заявление/проверете Bescheid`.
2. **Не превръщай максимум в обещание.** 292/297 EUR KiZ, 250/255 EUR Kindergeld, 15 EUR BuT и таблица на признат наем не са автоматично плащане.
3. **Не превръщай праг или евристика в закон.** 1 230 EUR Werbungskosten, 210 home-office дни, 900/600 EUR KiZ и груб процент от дохода не решават сами право или възстановяване.
4. **Не смесвай режими.** Kindergeld не е Kinderfreibetrag; KiZ не е Wohngeld; Wohngeld не е Bürgergeld; данъчното третиране не е социалноправно зачитане; BuT не е автоматично възстановяване на всяка покупка.
5. **Не приемай гражданство, Anmeldung, един адрес, работа или липса на работа като достатъчни.** Статутът, фактическото пребиваване, работоспособността, Bedarfsgemeinschaft, доходът, имуществото и изключенията трябва да са проверени.
6. **Не брои двойно.** Един разход не се заявява едновременно като Werbungskosten, Sonderausgaben и außergewöhnliche Belastung; един ден не се брои автоматично едновременно като commute и home office.
7. **Не приемай всяка работодателска локация за erste Tätigkeitsstätte и не приемай работа от дома за häusliches Arbeitszimmer.**
8. **Не изчислявай срок от Bescheiddatum без потвърдена Bekanntgabe/Zustellung.** При неизвестна дата изведи `unknown` и сценарии, не измислена крайна дата.
9. **Не смесвай срок за обжалване със срок за плащане/връщане и не казвай, че обикновен e-mail е достатъчен.**
10. **Не използвай текущи 2026 страници за 2024–2025 без историческа проверка.** Не пренасяй нови ставки, формули или наименования назад.
11. **Не изпращай оригинали и не искай излишни Sozialdaten.** Потребителят изпраща копия по официален сигурен канал; достъпът е само за оправомощени лица. §67a SGB X, Sozialgeheimnis, GDPR и AI Act се прилагат кумулативно. [66] [67] [68] [69]
12. **Не маскирай административно решение като AI извличане.** AI може да класифицира, цитира и подготви чернова за човешки преглед; не трябва самостоятелно да предоставя, отказва, намалява, отнема или възстановява социална/жилищна помощ.

## 13. Compact source table — водещи официални източници

| № | Тема | Основен официален източник |
|---:|---|---|
| 1 | Arbeitnehmer-Pauschbetrag | https://www.gesetze-im-internet.de/estg/__9a.html |
| 2 | Данъчни таблици 2024/2025 | https://esth.bundesfinanzministerium.de/esth/2024/tabellarische-Uebersicht/inhalt.html ; https://esth.bundesfinanzministerium.de/esth/2025/tabellarische-Uebersicht/inhalt.html |
| 3 | Werbungskosten и commute | https://www.gesetze-im-internet.de/estg/__9.html |
| 4 | Home office и домашен кабинет | https://www.gesetze-im-internet.de/estg/__4.html |
| 5 | Kinderbetreuung и Sonderausgaben | https://www.gesetze-im-internet.de/estg/__10.html |
| 6 | Außergewöhnliche Belastungen | https://www.gesetze-im-internet.de/estg/__33.html |
| 7 | Pflichtveranlagung | https://www.gesetze-im-internet.de/estg/__46.html |
| 8 | Kindergeld | https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-anspruch-hoehe-dauer |
| 9 | Kindergeld над 18 г. и доказателства | https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-ab-18-jahren ; https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/nachweise-einreichen |
| 10 | Kindergeld Ausland/ЕС | https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-ausland |
| 11 | Kinderzuschlag | https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-verstehen/kinderzuschlag-anspruch-hoehe-dauer ; https://www.gesetze-im-internet.de/bkgg_1996/__6a.html |
| 12 | Wohngeld — общо и калкулатор 2025 | https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeld-plus/wohngeld-plus_node.html ; https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_artikel.html |
| 13 | WoGG — членове, изключения, формула | https://www.gesetze-im-internet.de/wogg/ ; https://www.gesetze-im-internet.de/wogg/__5.html ; https://www.gesetze-im-internet.de/wogg/__7.html ; https://www.gesetze-im-internet.de/wogg/__19.html |
| 14 | WoGG — таблици и Mietstufen | https://www.gesetze-im-internet.de/wogg/anlage_1.html ; https://www.gesetze-im-internet.de/wogv/anlage.html |
| 15 | Bürgergeld — закон и ставки | https://www.gesetze-im-internet.de/sgb_2/__7.html ; https://www.gesetze-im-internet.de/sgb_2/__8.html ; https://www.gesetze-im-internet.de/sgb_2/__9.html |
| 16 | Bürgergeld — доходи, имущество, жилище | https://www.gesetze-im-internet.de/sgb_2/__11.html ; https://www.gesetze-im-internet.de/sgb_2/__11b.html ; https://www.gesetze-im-internet.de/sgb_2/__22.html |
| 17 | Bürgergeld — исторически ставки 2024/2025 | https://www.bundesregierung.de/breg-de/aktuelles/faq-zum-buergergeld-2149774 ; https://www.bmas.de/DE/Service/Presse/Meldungen/2024/fortschreibung-regelbedarfe-sozialhilfe-buergergeld.html |
| 18 | BuT — федерални правила | https://www.bmas.de/DE/Arbeit/Grundsicherung-Buergergeld/Bildungspaket/Leistungen/leistungen-bildungspaket_art.html ; https://www.gesetze-im-internet.de/sgb_2/__28.html ; https://www.gesetze-im-internet.de/bkgg_1996/__6b.html |
| 19 | BuT — услуги и местни процедури | https://familienportal.de/familienportal/familienleistungen/bildung-und-teilhabe ; https://service.berlin.de/dienstleistung/324466/ |
| 20 | Bescheid и общи срокове | https://www.gesetze-im-internet.de/vwvfg/__37.html ; https://www.gesetze-im-internet.de/vwvfg/__39.html ; https://www.gesetze-im-internet.de/vwgo/__70.html |
| 21 | Социални и данъчни срокове | https://www.gesetze-im-internet.de/sgg/__84.html ; https://www.gesetze-im-internet.de/ao_1977/__355.html |
| 22 | Bekanntgabe и грешна Rechtsbehelfsbelehrung | https://www.gesetze-im-internet.de/vwvfg/__41.html ; https://www.gesetze-im-internet.de/vwgo/__58.html ; https://www.gesetze-im-internet.de/sgg/__66.html ; https://www.gesetze-im-internet.de/ao_1977/__356.html |
| 23 | Официална защита на Sozialdaten и AI | https://www.gesetze-im-internet.de/sgb_10/__67a.html ; https://www.bfdi.bund.de/DE/Buerger/Inhalte/GesundheitSoziales/IhreRechte/Sozialgeheimnis.html ; https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng ; https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng |

## References

[1]: https://www.gesetze-im-internet.de/estg/__9a.html "Einkommensteuergesetz § 9a – Pauschbeträge für Werbungskosten"
[2]: https://esth.bundesfinanzministerium.de/esth/2024/tabellarische-Uebersicht/inhalt.html "BMF Einkommensteuer-Handbuch 2024 – Tabellarische Übersicht"
[3]: https://www.gesetze-im-internet.de/estg/__9.html "Einkommensteuergesetz § 9 – Werbungskosten"
[4]: https://esth.bundesfinanzministerium.de/esth/2025/tabellarische-Uebersicht/inhalt.html "BMF Einkommensteuer-Handbuch 2025 – Tabellarische Übersicht"
[5]: https://www.gesetze-im-internet.de/estg/__4.html "Einkommensteuergesetz § 4 Abs. 5 – Homeoffice und häusliches Arbeitszimmer"
[6]: https://lsth.bundesfinanzministerium.de/lsth/2024/B-Anhaenge/Anhang-19-Druck/I/inhalt.html "Lohnsteuer-Handbuch 2024 – Häusliches Arbeitszimmer und Tagespauschale"
[7]: https://lsth.bundesfinanzministerium.de/lsth/2025/B-Anhaenge/Anhang-19/I/inhalt.html "Lohnsteuer-Handbuch 2025 – Häusliches Arbeitszimmer und Tagespauschale"
[8]: https://www.gesetze-im-internet.de/estg/__10.html "Einkommensteuergesetz § 10 – Sonderausgaben"
[9]: https://www.bundesfinanzministerium.de/Content/DE/Standardartikel/Themen/Steuern/das-aendert-sich-2025.html "Bundesministerium der Finanzen – Die wichtigsten steuerlichen Änderungen 2025"
[10]: https://esth.bundesfinanzministerium.de/esth/2025/A-Einkommensteuergesetz/II-Einkommen-2-24b/5-Sonderausgaben-10-10g/Paragraf-10c/paragraf-10c.html "EStH 2025 § 10c – Sonderausgaben-Pauschbetrag"
[11]: https://www.gesetze-im-internet.de/estg/__33.html "Einkommensteuergesetz § 33 – Außergewöhnliche Belastungen"
[12]: https://esth.bundesfinanzministerium.de/esth/2025/A-Einkommensteuergesetz/IV-Tarif-31-34b/Paragraf-33/inhalt.html "EStH 2025 – § 33 Außergewöhnliche Belastungen und Nachweise"
[13]: https://www.gesetze-im-internet.de/estg/__46.html "Einkommensteuergesetz § 46 – Veranlagung bei Einkünften от несамостоятелна работа"
[14]: https://www.elster.de/eportal/helpGlobal?themaGlobal=help_est_ufa_10_2025 "ELSTER – Anleitung zur Einkommensteuererklärung 2025"
[15]: https://www.finanzamt.bayern.de/Informationen/Aktuelles/Termine_und_Fristen/default.php "Finanzämter Bayern – Termine und Fristen"
[16]: https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-anspruch-hoehe-dauer "Bundesagentur für Arbeit – Kindergeld: Anspruch, Höhe, Dauer"
[17]: https://www.arbeitsagentur.de/news/kindergeld-kinderzuschlag-2025 "Bundesagentur für Arbeit – Kindergeld und Kinderzuschlag steigen 2025"
[18]: https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2025/01/Inhalte/Kapitel-2-Fokus/die-wichtigsten-steuerlichen-aenderungen-2025.html "BMF-Monatsbericht Januar 2025 – Steuerliche Änderungen 2025"
[19]: https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-ab-18-jahren "Bundesagentur für Arbeit – Kindergeld ab 18 Jahren"
[20]: https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/nachweise-einreichen "Bundesagentur für Arbeit – Kindergeld: Nachweise einreichen"
[21]: https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-ausland "Bundesagentur für Arbeit – Kindergeld für Menschen im oder aus dem Ausland"
[22]: https://www.arbeitsagentur.de/datei/kg52eu_ba033685.pdf "Bundesagentur für Arbeit – Merkblatt Kindergeld in grenzüberschreitenden Fällen"
[23]: https://familienportal.de/familienportal/familienleistungen/kinderzuschlag "Familienportal des Bundes – Kinderzuschlag"
[24]: https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-verstehen/kinderzuschlag-anspruch-hoehe-dauer "Bundesagentur für Arbeit – Kinderzuschlag: Anspruch, Höhe, Dauer"
[25]: https://familienportal.de/familienportal/familienleistungen/kinderzuschlag/wer-kann-kinderzuschlag-bekommen--136754 "Familienportal des Bundes – Wer kann Kinderzuschlag bekommen?"
[26]: https://familienportal.de/familienportal/familienleistungen/kinderzuschlag/wie-und-wo-antrage-ich-kinderzuschlag--136762 "Familienportal des Bundes – Wie und wo beantrage ich Kinderzuschlag?"
[27]: https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeld-plus/wohngeld-plus_node.html "BMWSB – Wohngeld-Plus"
[28]: https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_artikel.html "BMWSB – Wohngeldrechner 2025"
[29]: https://www.gesetze-im-internet.de/wogg/__3.html "WoGG § 3 – Berechtigte"
[30]: https://www.gesetze-im-internet.de/wogg/__5.html "WoGG § 5 – Haushaltsmitglieder"
[31]: https://www.gesetze-im-internet.de/wogg/__7.html "WoGG § 7 – Ausschluss vom Wohngeld"
[32]: https://www.gesetze-im-internet.de/wogg/__8.html "WoGG § 8 – Ausschluss bei Ausbildungsförderung"
[33]: https://www.gesetze-im-internet.de/wogg/anlage_1.html "WoGG Anlage 1 – Höchstbeträge für Miete oder Belastung"
[34]: https://www.gesetze-im-internet.de/wogv/anlage.html "WoGV Anlage – Mietstufen"
[35]: https://www.gesetze-im-internet.de/wogg/__13.html "WoGG § 13 – Gesamteinkommen"
[36]: https://www.gesetze-im-internet.de/wogg/__19.html "WoGG § 19 – Berechnung des Wohngeldes"
[37]: https://www.gesetze-im-internet.de/wogg/__43.html "WoGG § 43 – Fortschreibung"
[38]: https://www.gesetze-im-internet.de/sgb_2/__7.html "SGB II § 7 – Leistungsberechtigte"
[39]: https://www.gesetze-im-internet.de/sgb_2/__8.html "SGB II § 8 – Erwerbsfähigkeit"
[40]: https://www.gesetze-im-internet.de/sgb_2/__9.html "SGB II § 9 – Hilfebedürftigkeit"
[41]: https://www.gesetze-im-internet.de/sgb_2/__11.html "SGB II § 11 – Zu berücksichtigendes Einkommen"
[42]: https://www.bmas.de/DE/Arbeit/Grundsicherung-Buergergeld/Leistungen-und-Bedarfe-im-Buergergeld/bedarfsgemeinschaft-haushaltsgemeinschaft.html "BMAS – Bedarfsgemeinschaft und Haushaltsgemeinschaft"
[43]: https://www.bundesregierung.de/breg-de/aktuelles/faq-zum-buergergeld-2149774 "Bundesregierung – FAQ zum Bürgergeld"
[44]: https://www.bmas.de/DE/Service/Presse/Meldungen/2024/fortschreibung-regelbedarfe-sozialhilfe-buergergeld.html "BMAS – Fortschreibung der Regelbedarfe 2024"
[45]: https://www.gesetze-im-internet.de/sgb_2/__12.html "SGB II § 12 – Zu berücksichtigendes Vermögen"
[46]: https://www.gesetze-im-internet.de/sgb_2/__22.html "SGB II § 22 – Bedarfe für Unterkunft und Heizung"
[47]: https://www.arbeitsagentur.de/datei/merkblatt-sgb2_ba043375.pdf "Bundesagentur für Arbeit – Merkblatt SGB II"
[48]: https://www.gesetze-im-internet.de/sgb_2/__12a.html "SGB II § 12a – Vorrangige Leistungen"
[49]: https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-verstehen/kinderzuschlag-anspruch-hoehe-dauer "Familienkasse – Kinderzuschlag и приоритетни помощи"
[50]: https://www.bmas.de/DE/Arbeit/Grundsicherung-Buergergeld/Bildungspaket/Leistungen/leistungen-bildungspaket_art.html "BMAS – Die Leistungen des Bildungspakets"
[51]: https://www.gesetze-im-internet.de/bkgg_1996/__6b.html "BKGG § 6b – Bildung und Teilhabe"
[52]: https://www.gesetze-im-internet.de/sgb_2/__28.html "SGB II § 28 – Bedarfe für Bildung und Teilhabe"
[53]: https://familienportal.de/familienportal/familienleistungen/bildung-und-teilhabe "Familienportal – Bildung und Teilhabe"
[54]: https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2023/das-aendert-sich-im-jahr-2024.html "BMAS – Das ändert sich im Jahr 2024"
[55]: https://www.gesetze-im-internet.de/sgb_2/__29.html "SGB II § 29 – Erbringung der Leistungen für Bildung und Teilhabe"
[56]: https://service.berlin.de/dienstleistung/324466/ "Service Berlin – Bildung und Teilhabe beantragen"
[57]: https://www.bmas.de/DE/Arbeit/Grundsicherung-Buergergeld/Leistungen-und-Bedarfe-im-Buergergeld/bescheid-und-widerspruch.html "BMAS – Bescheid und Widerspruch beim Bürgergeld"
[58]: https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/das-muessen-sie-beachten/arbeitslosengeld-bescheid "Bundesagentur für Arbeit – Arbeitslosengeld-Bescheid"
[59]: https://www.gesetze-im-internet.de/vwgo/__70.html "VwGO § 70 – Widerspruchsfrist"
[60]: https://www.gesetze-im-internet.de/sgg/__84.html "SGG § 84 – Widerspruchsfrist im Sozialrecht"
[61]: https://www.gesetze-im-internet.de/ao_1977/__355.html "AO § 355 – Einspruchsfrist"
[62]: https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99107023037000/herausgeber/SH-8938711/region/01 "Bundesportal – Wohngeld beantragen"
[63]: https://www.gesetze-im-internet.de/vwvfg/__41.html "VwVfG § 41 – Bekanntgabe des Verwaltungsaktes"
[64]: https://www.gesetze-im-internet.de/vwgo/__58.html "VwGO § 58 – Rechtsbehelfsbelehrung"
[65]: https://www.gesetze-im-internet.de/ao_1977/__356.html "AO § 356 – Rechtsbehelfsbelehrung"
[66]: https://www.gesetze-im-internet.de/sgb_10/__67a.html "SGB X § 67a – Erhebung von Sozialdaten"
[67]: https://www.bfdi.bund.de/DE/Buerger/Inhalte/GesundheitSoziales/IhreRechte/Sozialgeheimnis.html "BfDI – Sozialgeheimnis"
[68]: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng "Regulation (EU) 2016/679 – GDPR"
[69]: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng "Regulation (EU) 2024/1689 – Artificial Intelligence Act"
