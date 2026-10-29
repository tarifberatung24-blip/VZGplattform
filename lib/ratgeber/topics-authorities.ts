import type { GuideTopic } from "./types"

/**
 * Health insurance, residence, child benefit, unemployment insurance and pensions.
 *
 * These five cover the questions that reach the platform most often from people who
 * have just arrived: am I insured, is my permit still valid, does my child get
 * money, what happens if I lose the job, and what have I earned towards a pension.
 */
export const guideTopicsAuthorities: GuideTopic[] = [
  {
    slug: "krankenkasse",
    category: "authorities",
    germanName: "Krankenkasse",
    keywords: {
      bg: ["krankenkasse", "здравна каса Германия", "здравно осигуряване", "AOK TK"],
      de: ["Krankenkasse", "gesetzliche Krankenversicherung", "Krankenversicherung anmelden", "GKV"],
    },
    content: {
      bg: {
        title: "Krankenkasse — здравното осигуряване в Германия",
        summary:
          "Krankenkasse е здравната каса: тя покрива лечението, болничните и лекарствата и е задължителна за почти всеки, който живее и работи в Германия.",
        intro:
          "В Германия здравното осигуряване е задължително. Повечето хора са в gesetzliche Krankenversicherung (GKV) — законното осигуряване, което се удържа автоматично от заплатата и се доплаща от работодателя. Част от хората са в private Krankenversicherung (PKV). Касата се избира свободно, а изборът се обявява пред работодателя.",
        scope: [
          "Покрива лекарско лечение, болнично лечение и повечето лекарства.",
          "Изплаща Krankengeld при по-дълго боледуване.",
          "Покрива прегледи при специалист, ваксини и профилактика.",
          "Издава европейската здравна карта за пътуване в ЕС.",
        ],
        steps: [
          {
            title: "Избери каса преди да започнеш работа",
            body: "Всички законни каси покриват еднаквите задължителни услуги, но се различават по допълнителни предложения и по размера на допълнителната вноска. Сравни преди да избереш, защото смяната е ограничена.",
          },
          {
            title: "Съобщи избора на работодателя",
            body: "Работодателят се нуждае от името на касата и от членския номер, за да започне удръжките. Ако не съобщиш, работодателят може да те регистрира в каса по подразбиране.",
          },
          {
            title: "Регистрирай се и получи Gesundheitskarte",
            body: "Касата изпраща Gesundheitskarte по пощата. Картата се носи при всеки преглед — без нея кабинетът обикновено иска да платиш и после да си търсиш възстановяването.",
          },
          {
            title: "Съобщавай промените веднага",
            body: "Промяна в работата, в дохода или в семейното положение се съобщава на касата. При продължително боледуване касата поема изплащането след като работодателят спре да плаща заплата.",
          },
        ],
        documents: [
          "Документ за самоличност",
          "Трудов договор или уведомление за осигуряване от работодателя",
          "Meldebescheinigung с адреса",
          "При семейно осигуряване: документи за брак и за деца",
        ],
        pitfalls: [
          "Да останеш без осигуряване между две работи и да не съобщиш на касата. Периодът без осигуряване може да доведе до искане за вноски назад.",
          "Да смениш касата без да провериш обвързващия срок. Смяната е възможна само след определен период на членство.",
          "Да отидеш на лекар без Gesundheitskarte и да платиш в брой, без да поискаш документ за възстановяване.",
          "Да предположиш, че туристическата застраховка от България покрива престой в Германия за постоянно. Тя покрива пътуване, не местожителство.",
        ],
        faq: [
          {
            question: "Мога ли да остана в българската здравна система?",
            answer:
              "Ако работиш в Германия, обикновено си задължително осигурен в Германия. За кратък престой има форми като S1, издадена от българската каса. За постоянно местожителство осигуряването е немско.",
          },
          {
            question: "Какво покрива GKV и какво не?",
            answer:
              "GKV покрива необходимите медицински услуги, болнично лечение и повечето лекарства. Не покрива всичко — например част от зъбните протези, някои алтернативни лечения и част от очилата. За тях има допълнителни застраховки.",
          },
          {
            question: "Какво става, ако загубя работата си?",
            answer:
              "Осигуряването продължава, докато получаваш Arbeitslosengeld или Bürgergeld — тогава вноската се поема от институцията. Ако останеш без доход и без обезщетение, трябва да съобщиш на касата, за да се уреди вноската.",
          },
        ],
      },
      de: {
        title: "Krankenkasse – die Krankenversicherung in Deutschland",
        summary:
          "Die Krankenkasse trägt Behandlung, Krankengeld und Medikamente und ist für nahezu alle Pflicht, die in Deutschland leben und arbeiten.",
        intro:
          "In Deutschland ist die Krankenversicherung Pflicht. Die meisten Menschen sind in der gesetzlichen Krankenversicherung (GKV) – sie wird automatisch vom Lohn abgezogen und vom Arbeitgeber bezuschusst. Ein Teil ist privat versichert (PKV). Die Kasse ist frei wählbar; die Wahl wird dem Arbeitgeber mitgeteilt.",
        scope: [
          "Trägt ärztliche und stationäre Behandlung sowie die meisten Medikamente.",
          "Zahlt Krankengeld bei längerer Arbeitsunfähigkeit.",
          "Übernimmt Facharzttermine, Impfungen und Vorsorge.",
          "Stellt die Europäische Krankenversicherungskarte für Reisen in der EU aus.",
        ],
        steps: [
          {
            title: "Kasse wählen, bevor die Arbeit beginnt",
            body: "Alle gesetzlichen Kassen leisten die gleichen Pflichtleistungen, unterscheiden sich aber bei Zusatzangeboten und beim Zusatzbeitrag. Vor der Wahl vergleichen, denn ein Wechsel ist nur eingeschränkt möglich.",
          },
          {
            title: "Die Wahl dem Arbeitgeber mitteilen",
            body: "Der Arbeitgeber braucht Kassenname und Mitgliedsnummer, um die Beiträge abzuführen. Ohne Mitteilung wird häufig eine Kasse per Voreinstellung gewählt.",
          },
          {
            title: "Anmelden und Gesundheitskarte erhalten",
            body: "Die Kasse schickt die Gesundheitskarte per Post. Sie wird bei jedem Termin vorgelegt – ohne sie wird in der Praxis meist eine Privatrechnung verlangt.",
          },
          {
            title: "Änderungen unverzüglich melden",
            body: "Änderungen bei Arbeit, Einkommen oder Familienstand werden der Kasse gemeldet. Bei längerer Krankheit zahlt die Kasse, sobald der Arbeitgeber den Lohn einstellt.",
          },
        ],
        documents: [
          "Identitätsnachweis",
          "Arbeitsvertrag oder Arbeitgebermeldung",
          "Meldebescheinigung mit Adresse",
          "Bei Familienversicherung: Heiratsurkunde und Kinderdokumente",
        ],
        pitfalls: [
          "Zwischen zwei Jobs ohne Versicherung bleiben und die Kasse nicht informieren. Der lückenlose Zeitraum kann zu Beitragsforderungen führen.",
          "Die Kasse wechseln, ohne die Bindungsfrist zu prüfen. Ein Wechsel ist erst nach einer bestimmten Mitgliedsdauer möglich.",
          "Ohne Gesundheitskarte zur Praxis gehen und bar zahlen, ohne Beleg für die Erstattung zu verlangen.",
          "Annehmen, eine Reiseversicherung aus Bulgarien decke den dauerhaften Aufenthalt in Deutschland. Sie deckt Reisen, nicht den Wohnsitz.",
        ],
        faq: [
          {
            question: "Kann ich in der bulgarischen Krankenversicherung bleiben?",
            answer:
              "Wer in Deutschland arbeitet, ist hier grundsätzlich versicherungspflichtig. Für kurze Aufenthalte gibt es Formulare wie die S1, ausgestellt von der bulgarischen Kasse. Bei dauerhaftem Wohnsitz gilt die deutsche Versicherung.",
          },
          {
            question: "Was deckt die GKV und was nicht?",
            answer:
              "Die GKV trägt die notwendige medizinische Versorgung, stationäre Behandlung und die meisten Medikamente. Nicht alles ist enthalten – etwa ein Teil von Zahnersatz, manche alternativen Verfahren und ein Teil der Brillen. Dafür gibt es Zusatzversicherungen.",
          },
          {
            question: "Was passiert, wenn ich meinen Job verliere?",
            answer:
              "Die Versicherung läuft weiter, solange du Arbeitslosengeld oder Bürgergeld beziehst – der Beitrag wird dann vom Träger gezahlt. Ohne Einkommen und ohne Leistung musst du die Kasse informieren, damit der Beitrag geregelt wird.",
          },
        ],
      },
    },
    sources: [
      { label: "SGB V (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/sgb_5/" },
      { label: "GKV-Spitzenverband", url: "https://www.gkv-spitzenverband.de/" },
    ],
  },
  {
    slug: "auslaenderbehoerde",
    category: "authorities",
    germanName: "Ausländerbehörde",
    keywords: {
      bg: ["ausländerbehörde", "разрешение за пребиваване", "виза Германия", "Aufenthaltstitel"],
      de: ["Ausländerbehörde", "Aufenthaltstitel", "Aufenthaltserlaubnis", "Niederlassungserlaubnis"],
    },
    content: {
      bg: {
        title: "Ausländerbehörde — разрешение за пребиваване",
        summary:
          "Ausländerbehörde решава за пребиваването ти в Германия: издава и подновява разрешението, променя целта му и решава по въпросите за постоянно пребиваване.",
        intro:
          "Ausländerbehörde е службата по пребиваването към общината и прилага Aufenthaltsgesetz. Тя издава Aufenthaltstitel — разрешението, което указва на какво основание и за колко време можеш да останеш. Тук се подава и заявлението за Niederlassungserlaubnis, постоянното пребиваване, когато са изпълнени условията за него.",
        scope: [
          "Издава, подновява и изменя разрешения за пребиваване.",
          "Решава по молби за постоянно пребиваване и за гражданство.",
          "Свързва разрешението с условия — работно място, учебно заведение, осигуряване.",
          "Издава удостоверения за пребиваване за служби и работодатели.",
        ],
        steps: [
          {
            title: "Запази час и подай преди изтичане",
            body: "Заявлението се подава в общината по адреса ти, обикновено с предварително запазен час. Подай преди разрешението да изтече — закъснението създава период без статут.",
          },
          {
            title: "Събери документите по основанието",
            body: "Какво се иска зависи от основанието: трудов договор или предложение за работа, документи за брак или семейна връзка, документи за обучение, доказателства за осигуряване и за жилище.",
          },
          {
            title: "Яви се на срещата и дай биометрични данни",
            body: "На гишето се проверяват документите, снемат се пръстови отпечатъци и се прави снимка. От това зависи издаването на електронната карта.",
          },
          {
            title: "Вземи картата и провери съдържанието",
            body: "Разрешението идва като електронна карта, а условията са в Zusatzblatt. Провери срока, основанието и разрешението за работа, преди да напуснеш сградата.",
          },
        ],
        documents: [
          "Валиден паспорт",
          "Meldebescheinigung",
          "Биометрична снимка, отговаряща на изискванията",
          "Документ за основанието — договор, акт за брак, документ за обучение",
          "Доказателства за осигуряване и за доход",
          "Наемен договор или Wohnungsgeberbestätigung",
        ],
        pitfalls: [
          "Да оставиш разрешението да изтече, преди да си подал. След изтичане възможностите се стесняват и се появява нелегален престой.",
          "Да подпишеш, без да провериш Zusatzblatt. Ограничение като „Arbeit nur mit Erlaubnis\" спира започването на работа.",
          "Да смениш адреса в друга община, без да съобщиш. Досието трябва да се прехвърли в новата Ausländerbehörde.",
          "Да заявиш постоянно пребиваване, без да провериш изискванията за език и вноски. Отказът струва такса и време.",
        ],
        faq: [
          {
            question: "Каква е разликата между Aufenthaltserlaubnis и Niederlassungserlaubnis?",
            answer:
              "Aufenthaltserlaubnis е срочно и е обвързано с целта на престоя. Niederlassungserlaubnis е безсрочно, не зависи от целта и обикновено изисква определен период на пребиваване, езикови познания и осигурителни вноски.",
          },
          {
            question: "Мога ли да работя с разрешението си?",
            answer:
              "Зависи от записа в Zusatzblatt. Там е посочено дали работата е разрешена без ограничение, само със съгласие или не е разрешена. Провери преди да приемеш предложение за работа.",
          },
          {
            question: "Какво е Fiktionsbescheinigung?",
            answer:
              "Това е документ, който се издава, докато заявлението ти е в обработка. Той поддържа статута ти временно и обикновено не носи правата на новото разрешение, а тези на предишното.",
          },
        ],
      },
      de: {
        title: "Ausländerbehörde – Aufenthaltstitel in Deutschland",
        summary:
          "Die Ausländerbehörde entscheidet über deinen Aufenthalt: Sie erteilt und verlängert den Aufenthaltstitel, ändert den Zweck und entscheidet über die Niederlassungserlaubnis.",
        intro:
          "Die Ausländerbehörde ist die Aufenthaltsbehörde bei der Kommune und führt das Aufenthaltsgesetz aus. Sie erteilt den Aufenthaltstitel – das Dokument, das Grund und Dauer des Aufenthalts festlegt. Dort wird auch die Niederlassungserlaubnis beantragt, sobald die Voraussetzungen erfüllt sind.",
        scope: [
          "Erteilt, verlängert und ändert Aufenthaltstitel.",
          "Entscheidet über Niederlassungserlaubnis und Einbürgerungsverfahren.",
          "Verknüpft den Titel mit Auflagen – Arbeitsplatz, Ausbildung, Versicherung.",
          "Stellt Aufenthaltsbescheinigungen für Behörden und Arbeitgeber aus.",
        ],
        steps: [
          {
            title: "Termin buchen und vor Ablauf beantragen",
            body: "Der Antrag wird bei der Gemeinde deines Wohnsitzes gestellt, meist mit vorher gebuchtem Termin. Stelle ihn vor Ablauf des Titels – eine Verspätung erzeugt einen Zeitraum ohne Status.",
          },
          {
            title: "Unterlagen nach dem Aufenthaltszweck sammeln",
            body: "Was verlangt wird, hängt vom Zweck ab: Arbeitsvertrag oder Stellenangebot, Ehe- oder Familiennachweise, Ausbildungsunterlagen, Nachweise über Versicherung und Wohnraum.",
          },
          {
            title: "Zum Termin erscheinen und Biometrie abgeben",
            body: "Am Schalter werden die Unterlagen geprüft, Fingerabdrücke genommen und ein Foto erstellt. Davon hängt die Ausstellung der elektronischen Karte ab.",
          },
          {
            title: "Karte abholen und Inhalt prüfen",
            body: "Der Titel kommt als elektronische Karte, die Auflagen stehen im Zusatzblatt. Prüfe Laufzeit, Zweck und Arbeitserlaubnis, bevor du das Gebäude verlässt.",
          },
        ],
        documents: [
          "Gültiger Pass",
          "Meldebescheinigung",
          "Biometrisches Passfoto nach Vorgabe",
          "Nachweis des Aufenthaltszwecks – Vertrag, Heiratsurkunde, Ausbildungsnachweis",
          "Nachweise über Versicherung und Einkommen",
          "Mietvertrag oder Wohnungsgeberbestätigung",
        ],
        pitfalls: [
          "Den Titel ablaufen lassen, bevor der Antrag gestellt ist. Nach Ablauf wird der Spielraum enger und der Aufenthalt unrechtmäßig.",
          "Unterschreiben, ohne das Zusatzblatt zu prüfen. Eine Auflage wie „Arbeit nur mit Erlaubnis\" verhindert den Arbeitsbeginn.",
          "In eine andere Gemeinde umziehen, ohne es zu melden. Die Akte muss an die neue Ausländerbehörde abgegeben werden.",
          "Die Niederlassungserlaubnis beantragen, ohne Sprach- und Beitragsvoraussetzungen zu prüfen. Eine Ablehnung kostet Gebühr und Zeit.",
        ],
        faq: [
          {
            question: "Was ist der Unterschied zwischen Aufenthaltserlaubnis und Niederlassungserlaubnis?",
            answer:
              "Die Aufenthaltserlaubnis ist befristet und an den Aufenthaltszweck gebunden. Die Niederlassungserlaubnis ist unbefristet, zweckunabhängig und setzt in der Regel eine bestimmte Aufenthaltsdauer, Sprachkenntnisse und Beitragszeiten voraus.",
          },
          {
            question: "Darf ich mit meinem Titel arbeiten?",
            answer:
              "Das hängt vom Zusatzblatt ab. Dort steht, ob die Beschäftigung uneingeschränkt erlaubt ist, nur mit Zustimmung erlaubt ist oder nicht erlaubt ist. Vor Annahme eines Angebots prüfen.",
          },
          {
            question: "Was ist eine Fiktionsbescheinigung?",
            answer:
              "Sie wird ausgestellt, solange der Antrag bearbeitet wird. Sie sichert den Status vorübergehend und trägt in der Regel die Rechte des bisherigen Titels, nicht die des beantragten.",
          },
        ],
      },
    },
    sources: [
      { label: "Aufenthaltsgesetz (AufenthG)", url: "https://www.gesetze-im-internet.de/aufenthg_2004/" },
      { label: "BAMF — Aufenthalt", url: "https://www.bamf.de/DE/Themen/Themen-node.html" },
    ],
  },
  {
    slug: "familienkasse",
    category: "money",
    germanName: "Familienkasse",
    keywords: {
      bg: ["familienkasse", "Kindergeld", "детски надбавки Германия", "Kinderzuschlag"],
      de: ["Familienkasse", "Kindergeld", "Kinderzuschlag", "Kindergeld beantragen"],
    },
    content: {
      bg: {
        title: "Familienkasse — Kindergeld и Kinderzuschlag",
        summary:
          "Familienkasse изплаща Kindergeld за всяко дете и Kinderzuschlag за семейства с доход, който е над прага за помощи, но недостатъчен за домакинството.",
        intro:
          "Familienkasse е част от Bundesagentur für Arbeit и изплаща Kindergeld — месечната помощ за деца. Правото зависи от това къде живее детето и къде е данъчно задължен родителят, а не от гражданството. При по-нисък доход от работа Familienkasse изплаща и Kinderzuschlag, който допълва заплатата и може да отвори достъп до други помощи.",
        scope: [
          "Изплаща Kindergeld за деца до определена възраст, а при обучение — по-дълго.",
          "Изплаща Kinderzuschlag за семейства с ниска заетост.",
          "Решава по молби за продължаване на изплащането след 18 години.",
          "Издава удостоверения за получено Kindergeld за други служби.",
        ],
        steps: [
          {
            title: "Подай заявлението веднага след раждане или пристигане",
            body: "Kindergeld се изплаща от месеца, в който са изпълнени условията, но заявлението трябва да е подадено. За предходни години има ограничение назад, затова не отлагай.",
          },
          {
            title: "Приготви документите за детето и за себе си",
            body: "Нужни са актът за раждане на детето, документ за самоличност и данъчният идентификатор на родителя, както и доказателство за пребиваване. За деца, дошли по-късно, се прилагат документите за влизане.",
          },
          {
            title: "Подай по електронен път или на хартия",
            body: "Заявлението може да се подаде през онлайн услугата на Bundesagentur или с формуляр. Електронното подаване дава номер за проследяване и е по-бързо.",
          },
          {
            title: "Провери решението и съобщавай промени",
            body: "В решението е записан размерът и периодът. Съобщавай промени в адрес, доход, брой деца или учебен статус на детето, за да не се стигне до връщане на надплатено.",
          },
        ],
        documents: [
          "Акт за раждане на детето",
          "Документ за самоличност и Steuer-ID на родителя",
          "Доказателство за пребиваване",
          "При деца над 18 години: удостоверение за обучение или за търсене на работа",
          "За Kinderzuschlag: фишове за заплата и документи за наем и разходи",
        ],
        pitfalls: [
          "Да подадеш заявлението късно и да загубиш месеци. Изплащането назад е ограничено.",
          "Да не съобщиш, че детето е започнало работа или обучение. Това променя правото и може да прекрати плащането.",
          "Да предположиш, че Kindergeld спира автоматично на 18 години. При обучение то продължава, но трябва да се заяви.",
          "Да пропуснеш Kinderzuschlag, ако работиш на ниска заплата. Много семейства имат право, без да знаят.",
        ],
        faq: [
          {
            question: "До каква възраст се получава Kindergeld?",
            answer:
              "Обикновено до навършване на 18 години, а при безработно дете, което търси работа, до 21. При обучение или висше образование изплащането може да продължи до 25 години, ако е заявено навреме.",
          },
          {
            question: "Имам ли право, ако работя само в България или в друга държава?",
            answer:
              "Правото зависи от това къде живее детето и къде си данъчно задължен. При трансгранични случаи има правила на ЕС, които определят коя държава изплаща. Този случай трябва да се провери индивидуално в Familienkasse.",
          },
          {
            question: "Какво е Kinderzuschlag и как се различава от Bürgergeld?",
            answer:
              "Kinderzuschlag е допълнителна помощ за семейства, чиято заплата покрива нуждите им без помощ, но не покрива и децата. За разлика от Bürgergeld, той не иска пълно деклариране на нуждата и не изключва заетост.",
          },
        ],
      },
      de: {
        title: "Familienkasse – Kindergeld und Kinderzuschlag",
        summary:
          "Die Familienkasse zahlt Kindergeld für jedes Kind und Kinderzuschlag für Familien, deren Einkommen über der Sozialhilfegrenze liegt, aber für den Haushalt nicht reicht.",
        intro:
          "Die Familienkasse gehört zur Bundesagentur für Arbeit und zahlt das Kindergeld – die monatliche Leistung für Kinder. Der Anspruch hängt davon ab, wo das Kind lebt und wo die Eltern steuerlich pflichtig sind, nicht von der Staatsangehörigkeit. Bei geringem Erwerbseinkommen zahlt sie zusätzlich Kinderzuschlag, der den Lohn ergänzt und Zugang zu weiteren Leistungen öffnen kann.",
        scope: [
          "Zahlt Kindergeld bis zu einem bestimmten Alter, bei Ausbildung länger.",
          "Zahlt Kinderzuschlag für Familien mit geringem Erwerbseinkommen.",
          "Entscheidet über die Weiterzahlung nach dem 18. Geburtstag.",
          "Stellt Nachweise über gezahltes Kindergeld für andere Stellen aus.",
        ],
        steps: [
          {
            title: "Antrag direkt nach Geburt oder Einreise stellen",
            body: "Kindergeld wird ab dem Monat gezahlt, in dem die Voraussetzungen vorliegen – aber nur bei gestelltem Antrag. Für frühere Jahre gibt es eine begrenzte Rückzahlung, deshalb nicht aufschieben.",
          },
          {
            title: "Unterlagen zum Kind und zu dir vorbereiten",
            body: "Nötig sind die Geburtsurkunde des Kindes, Ausweis und Steuer-ID des antragstellenden Elternteils sowie ein Nachweis des Wohnsitzes. Bei später eingereisten Kindern kommen die Einreisedokumente hinzu.",
          },
          {
            title: "Elektronisch oder auf Papier einreichen",
            body: "Der Antrag kann über den Onlinedienst der Bundesagentur oder per Formular gestellt werden. Die elektronische Abgabe liefert eine Vorgangsnummer und ist schneller.",
          },
          {
            title: "Bescheid prüfen und Änderungen mitteilen",
            body: "Der Bescheid nennt Höhe und Zeitraum. Änderungen bei Adresse, Einkommen, Kinderzahl oder Ausbildungsstatus des Kindes mitteilen, damit keine Rückforderung entsteht.",
          },
        ],
        documents: [
          "Geburtsurkunde des Kindes",
          "Ausweis und Steuer-ID des antragstellenden Elternteils",
          "Nachweis des Wohnsitzes",
          "Bei Kindern über 18: Ausbildungs- oder Arbeitsuchendbescheinigung",
          "Für Kinderzuschlag: Lohnabrechnungen sowie Miet- und Kostenbelege",
        ],
        pitfalls: [
          "Den Antrag zu spät stellen und Monate verlieren. Eine Rückzahlung ist nur begrenzt möglich.",
          "Nicht mitteilen, dass das Kind eine Arbeit oder Ausbildung begonnen hat. Das ändert den Anspruch und kann die Zahlung beenden.",
          "Annehmen, das Kindergeld ende automatisch mit 18. Bei Ausbildung läuft es weiter, muss aber beantragt werden.",
          "Den Kinderzuschlag übersehen, wenn du zu geringem Lohn arbeitest. Viele Familien haben einen Anspruch, ohne es zu wissen.",
        ],
        faq: [
          {
            question: "Bis zu welchem Alter wird Kindergeld gezahlt?",
            answer:
              "In der Regel bis zur Vollendung des 18. Lebensjahres, bei einem arbeitsuchenden Kind ohne Beschäftigung bis 21. Bei Ausbildung oder Studium kann die Zahlung bis 25 laufen, wenn sie rechtzeitig beantragt wird.",
          },
          {
            question: "Habe ich einen Anspruch, wenn ich nur in Bulgarien oder einem anderen Staat arbeite?",
            answer:
              "Der Anspruch hängt davon ab, wo das Kind lebt und wo du steuerlich pflichtig bist. Bei grenzüberschreitenden Fällen legen EU-Regeln fest, welcher Staat zahlt. Solche Fälle sind individuell bei der Familienkasse zu prüfen.",
          },
          {
            question: "Was ist der Kinderzuschlag und wie unterscheidet er sich vom Bürgergeld?",
            answer:
              "Der Kinderzuschlag ergänzt Familien, deren Lohn den eigenen Bedarf deckt, aber nicht den der Kinder. Anders als Bürgergeld setzt er keine vollständige Bedarfsprüfung voraus und schließt Erwerbsarbeit nicht aus.",
          },
        ],
      },
    },
    sources: [
      { label: "Bundesagentur für Arbeit — Kindergeld", url: "https://www.arbeitsagentur.de/familie-und-kinder/kindergeld" },
      { label: "Einkommensteuergesetz (EStG), §§ 62 ff.", url: "https://www.gesetze-im-internet.de/estg/" },
    ],
  },
  {
    slug: "agentur-fuer-arbeit",
    category: "money",
    germanName: "Agentur für Arbeit",
    keywords: {
      bg: ["agentur für arbeit", "Arbeitslosengeld", "безработица Германия", "arbeitslos melden"],
      de: ["Agentur für Arbeit", "Arbeitslosengeld", "arbeitslos melden", "SGB III"],
    },
    content: {
      bg: {
        title: "Agentur für Arbeit — Arbeitslosengeld и търсене на работа",
        summary:
          "Agentur für Arbeit изплаща Arbeitslosengeld I след осигуряване и подкрепя търсенето на работа с консултации, обучения и помощи при наемане.",
        intro:
          "Agentur für Arbeit е федералната служба по заетостта и прилага SGB III. Тя изплаща Arbeitslosengeld I — обезщетението за хора, които са били осигурени и са загубили работата си. Отделно от това подкрепя търсенето на работа с консултации, финансирани обучения и помощи за работодатели, които наемат.",
        scope: [
          "Изплаща Arbeitslosengeld I според осигурителния стаж и възрастта.",
          "Приема Arbeitslosmeldung и Arbeitsuchendmeldung.",
          "Финансира обучение, квалификация и преквалификация.",
          "Изплаща Insolvenzgeld при несъстоятелност на работодателя.",
        ],
        steps: [
          {
            title: "Регистрирай се като търсещ работа, преди да свърши договорът",
            body: "Arbeitsuchendmeldung се прави най-късно три месеца преди края на срочния договор или веднага след като научиш за прекратяването. Регистрацията е отделна от заявлението за обезщетение.",
          },
          {
            title: "Регистрирай се като безработен в първия ден",
            body: "Arbeitslosmeldung трябва да се направи на първия ден без работа. Ако закъснееш, обезщетението може да започне от деня на регистрацията, а не от края на заетостта.",
          },
          {
            title: "Подай заявление за Arbeitslosengeld",
            body: "Заявлението се подава с документите за осигуряване и за прекратяване на работата. Вземеш ли Arbeitsbescheinigung от работодателя, това ускорява обработката значително.",
          },
          {
            title: "Изпълнявай задълженията и съобщавай промени",
            body: "Очаква се да търсиш активно работа и да се явяваш на срещи. Трябва да съобщаваш всяка промяна — намерена работа, болест, отсъствие от мястото на пребиваване.",
          },
        ],
        documents: [
          "Документ за самоличност",
          "Arbeitsbescheinigung от работодателя",
          "Уведомление за прекратяване или срочен договор",
          "Доказателства за осигурителни вноски",
          "Банкова сметка за изплащане",
        ],
        pitfalls: [
          "Да се регистрираш като безработен късно. Това отлага началото на обезщетението.",
          "Да не се регистрираш като търсещ работа преди края на договора. Пропускаш задължението и може да има санкция.",
          "Да не съобщиш за отпуск или отсъствие. Обезщетението се спира за периода.",
          "Да приемеш, че Arbeitslosengeld I е същото като Bürgergeld. Различни институции, различни условия.",
        ],
        faq: [
          {
            question: "Как се изчислява Arbeitslosengeld I?",
            answer:
              "Изчислява се като процент от осигурения доход от последната заетост, с горна граница. Продължителността зависи от възрастта и от продължителността на осигуряването. Точната цифра се определя от Agentur за твоя случай.",
          },
          {
            question: "Колко дълго трябва да съм работил, за да имам право?",
            answer:
              "Обикновено се изисква осигуряване в рамките на определена рамка от години, като заетостта трябва да е била осигурена по SGB III. Точният период се проверява от Agentur по твоите вноски.",
          },
          {
            question: "Мога ли да получа обезщетение, ако напусна сам?",
            answer:
              "При напускане без важна причина обикновено следва Sperrzeit — период, в който обезщетението не се изплаща. При важна причина, например здравословна, периодът може да отпадне след проверка.",
          },
        ],
      },
      de: {
        title: "Agentur für Arbeit – Arbeitslosengeld und Arbeitssuche",
        summary:
          "Die Agentur für Arbeit zahlt Arbeitslosengeld I nach versicherungspflichtiger Beschäftigung und unterstützt die Arbeitssuche mit Beratung, Qualifizierung und Eingliederungshilfen.",
        intro:
          "Die Agentur für Arbeit ist die Bundesbehörde für Beschäftigung und führt das SGB III aus. Sie zahlt Arbeitslosengeld I – die Leistung für Personen, die versichert waren und ihre Beschäftigung verloren haben. Daneben unterstützt sie die Arbeitssuche mit Beratung, finanzierten Qualifizierungen und Hilfen für einstellende Arbeitgeber.",
        scope: [
          "Zahlt Arbeitslosengeld I nach Versicherungszeit und Alter.",
          "Nimmt Arbeitslosmeldung und Arbeitsuchendmeldung entgegen.",
          "Finanziert Ausbildung, Qualifizierung und Umschulung.",
          "Zahlt Insolvenzgeld bei Zahlungsunfähigkeit des Arbeitgebers.",
        ],
        steps: [
          {
            title: "Vor Vertragsende arbeitsuchend melden",
            body: "Die Arbeitsuchendmeldung erfolgt spätestens drei Monate vor Ende eines befristeten Vertrags oder unmittelbar nach Kenntnis der Kündigung. Sie ist unabhängig vom Leistungsantrag.",
          },
          {
            title: "Am ersten Tag arbeitslos melden",
            body: "Die Arbeitslosmeldung muss am ersten Tag ohne Beschäftigung erfolgen. Bei Verspätung beginnt die Leistung gegebenenfalls erst mit der Meldung statt mit dem Ende der Beschäftigung.",
          },
          {
            title: "Arbeitslosengeld beantragen",
            body: "Der Antrag wird mit den Versicherungs- und Beendigungsunterlagen gestellt. Eine Arbeitsbescheinigung des Arbeitgebers beschleunigt die Bearbeitung erheblich.",
          },
          {
            title: "Pflichten erfüllen und Änderungen mitteilen",
            body: "Erwartet wird eine aktive Arbeitssuche und die Teilnahme an Terminen. Jede Änderung ist mitzuteilen – neue Arbeit, Krankheit, Ortsabwesenheit.",
          },
        ],
        documents: [
          "Identitätsnachweis",
          "Arbeitsbescheinigung des Arbeitgebers",
          "Kündigungsschreiben oder befristeter Vertrag",
          "Nachweise über Versicherungszeiten",
          "Bankverbindung für die Auszahlung",
        ],
        pitfalls: [
          "Sich zu spät arbeitslos melden. Das verschiebt den Leistungsbeginn.",
          "Die Arbeitsuchendmeldung vor Vertragsende versäumen. Die Pflicht entfällt nicht ohne Folgen.",
          "Urlaub oder Ortsabwesenheit nicht mitteilen. Die Leistung wird für den Zeitraum eingestellt.",
          "Arbeitslosengeld I mit Bürgergeld verwechseln. Verschiedene Träger, verschiedene Voraussetzungen.",
        ],
        faq: [
          {
            question: "Wie wird Arbeitslosengeld I berechnet?",
            answer:
              "Es wird als Prozentsatz des versicherten Entgelts aus der letzten Beschäftigung berechnet, mit einer Beitragsbemessungsgrenze. Die Dauer hängt von Alter und Versicherungszeit ab. Der konkrete Betrag wird von der Agentur für deinen Fall festgesetzt.",
          },
          {
            question: "Wie lange muss ich gearbeitet haben, um anspruchsberechtigt zu sein?",
            answer:
              "In der Regel ist eine versicherungspflichtige Beschäftigung innerhalb eines bestimmten Zeitrahmens erforderlich, wobei die Beschäftigung nach dem SGB III versichert gewesen sein muss. Die genaue Zeit prüft die Agentur anhand deiner Beiträge.",
          },
          {
            question: "Bekomme ich Leistung, wenn ich selbst kündige?",
            answer:
              "Bei Kündigung ohne wichtigen Grund folgt in der Regel eine Sperrzeit, in der keine Leistung gezahlt wird. Bei einem wichtigen Grund, etwa aus gesundheitlichen Gründen, kann die Sperrzeit nach Prüfung entfallen.",
          },
        ],
      },
    },
    sources: [
      { label: "SGB III (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/sgb_3/" },
      { label: "Bundesagentur für Arbeit — Arbeitslosengeld", url: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/das-muessen-sie-beachten" },
    ],
  },
  {
    slug: "rentenversicherung",
    category: "money",
    germanName: "Rentenversicherung",
    keywords: {
      bg: ["rentenversicherung", "пенсия Германия", "осигурителен стаж", "Rentenbescheid"],
      de: ["Rentenversicherung", "Rentenbescheid", "Rentenpunkte", "Altersrente"],
    },
    content: {
      bg: {
        title: "Rentenversicherung — пенсионното осигуряване",
        summary:
          "Deutsche Rentenversicherung записва осигурителния ти стаж в Германия, издава справка за натрупаните права и изплаща пенсията при навършване на възрастта.",
        intro:
          "Deutsche Rentenversicherung е пенсионният осигурител и събира вноските, удържани от заплатата. Всеки осигурен получава Versicherungsverlauf — запис на всички периоди и вноски, и Renteninformation — справка каква пенсия се очаква. Периоди, отработени в България, се отчитат по правилата на ЕС, а не се губят.",
        scope: [
          "Записва осигурителните периоди и вноските.",
          "Издава Versicherungsverlauf и Renteninformation по заявка.",
          "Изчислява и изплаща пенсии по старост, инвалидност и наследствена пенсия.",
          "Признава периоди, отработени в други държави от ЕС, по европейските правила.",
        ],
        steps: [
          {
            title: "Провери Versicherungsverlauf",
            body: "Редовно проверявай записа на осигурителните си периоди. Липсващ период, който не се оспори навреме, намалява пенсията завинаги. Справката се иска онлайн или писмено.",
          },
          {
            title: "Събери доказателства за чуждестранни периоди",
            body: "Периодите в България се уреждат чрез формуляр от европейската координация. Пази документи за работа, осигуровки и трудови книжки, защото те са доказателството.",
          },
          {
            title: "Подай заявление за пенсия навреме",
            body: "Заявлението се подава няколко месеца преди планираната дата, за да може изчисляването да приключи. Подава се до носителя по мястото на пребиваване.",
          },
          {
            title: "Провери изчислението и възрази при грешка",
            body: "След решението провери дали всички периоди са включени. При несъгласие има срок за възражение, който трябва да се спази.",
          },
        ],
        documents: [
          "Versicherungsnummer (осигурителният номер)",
          "Документ за самоличност",
          "Доказателства за осигурителни периоди",
          "Документи за периоди, отработени в друга държава от ЕС",
          "При заявление за пенсия: банкова сметка и документи за семейно положение",
        ],
        pitfalls: [
          "Да не провериш Versicherungsverlauf и да откриеш липси при пенсиониране. Тогава коригирането е трудно.",
          "Да изхвърлиш трудовите книжки и удостоверенията от България. Без тях периодите се доказват трудно.",
          "Да подадеш заявлението за пенсия в последния момент. Изчисляването отнема време и пенсията може да закъснее.",
          "Да пропуснеш срока за възражение след решението. След това изчислението става окончателно.",
        ],
        faq: [
          {
            question: "Броят ли се годините, отработени в България?",
            answer:
              "Да. По правилата на европейската координация периодите, отработени в друга държава от ЕС, се отчитат. Всяка държава изчислява своята част, а изплащането може да идва от няколко държави.",
          },
          {
            question: "Какво е Versicherungsnummer и как го получавам?",
            answer:
              "Това е постоянният осигурителен номер, който се получава веднъж и остава същият. Обикновено идва по пощата след първата осигурена работа и се пази, защото се използва при всяко заявление.",
          },
          {
            question: "Мога ли да получа справка колко пенсия ще имам?",
            answer:
              "Да. Renteninformation се изпраща периодично след определена възраст и може да се поиска по всяко време. Справката е прогноза при текущите вноски и не е окончателно изчисление.",
          },
        ],
      },
      de: {
        title: "Rentenversicherung – die gesetzliche Rentenversicherung",
        summary:
          "Die Deutsche Rentenversicherung erfasst deine Versicherungszeiten in Deutschland, erteilt Auskunft über die erworbenen Ansprüche und zahlt die Rente bei Erreichen der Altersgrenze.",
        intro:
          "Die Deutsche Rentenversicherung ist der Rententräger und zieht die Beiträge vom Lohn ein. Alle Versicherten erhalten den Versicherungsverlauf – die Aufzeichnung aller Zeiten und Beiträge – sowie die Renteninformation – eine Auskunft über die zu erwartende Rente. In Bulgarien zurückgelegte Zeiten gehen nach den EU-Regeln nicht verloren.",
        scope: [
          "Erfasst Versicherungszeiten und Beiträge.",
          "Erteilt auf Antrag Versicherungsverlauf und Renteninformation.",
          "Berechnet und zahlt Alters-, Erwerbsminderungs- und Hinterbliebenenrenten.",
          "Berücksichtigt Zeiten aus anderen EU-Staaten nach den Koordinierungsregeln.",
        ],
        steps: [
          {
            title: "Versicherungsverlauf prüfen",
            body: "Den Versicherungsverlauf regelmäßig kontrollieren. Eine fehlende Zeit, die nicht rechtzeitig beanstandet wird, mindert die Rente dauerhaft. Die Auskunft ist online oder schriftlich erhältlich.",
          },
          {
            title: "Nachweise für ausländische Zeiten sammeln",
            body: "Zeiten in Bulgarien werden über das europäische Koordinierungsformular geklärt. Arbeits-, Beitrags- und Beschäftigungsnachweise aufbewahren – sie sind der Beleg.",
          },
          {
            title: "Rentenantrag rechtzeitig stellen",
            body: "Der Antrag wird einige Monate vor dem geplanten Termin gestellt, damit die Berechnung abgeschlossen werden kann. Er wird beim Träger am Wohnort eingereicht.",
          },
          {
            title: "Berechnung prüfen und bei Fehlern widersprechen",
            body: "Nach dem Bescheid prüfen, ob alle Zeiten enthalten sind. Bei Abweichungen gilt eine Widerspruchsfrist, die eingehalten werden muss.",
          },
        ],
        documents: [
          "Versicherungsnummer",
          "Identitätsnachweis",
          "Nachweise über Versicherungszeiten",
          "Unterlagen zu Zeiten in anderen EU-Staaten",
          "Beim Rentenantrag: Bankverbindung und Unterlagen zum Familienstand",
        ],
        pitfalls: [
          "Den Versicherungsverlauf nicht prüfen und Lücken erst bei der Verrentung entdecken. Eine Korrektur ist dann aufwendig.",
          "Arbeitsbücher und Bescheinigungen aus Bulgarien entsorgen. Ohne sie sind die Zeiten schwer nachzuweisen.",
          "Den Rentenantrag erst kurz vor dem Termin stellen. Die Berechnung dauert und die Rente kann sich verzögern.",
          "Die Widerspruchsfrist nach dem Bescheid verstreichen lassen. Danach wird die Berechnung bestandskräftig.",
        ],
        faq: [
          {
            question: "Zählen in Bulgarien zurückgelegte Jahre?",
            answer:
              "Ja. Nach den Regeln der europäischen Koordination werden Zeiten in anderen EU-Staaten berücksichtigt. Jeder Staat berechnet seinen Anteil; die Zahlung kann aus mehreren Staaten kommen.",
          },
          {
            question: "Was ist die Versicherungsnummer und wie bekomme ich sie?",
            answer:
              "Es ist die dauerhafte Versicherungsnummer, die einmal vergeben wird und unverändert bleibt. Sie kommt meist per Post nach der ersten versicherten Beschäftigung und wird bei jedem Antrag benötigt.",
          },
          {
            question: "Kann ich eine Auskunft über meine zu erwartende Rente erhalten?",
            answer:
              "Ja. Die Renteninformation wird ab einem bestimmten Alter regelmäßig versandt und kann jederzeit angefordert werden. Sie ist eine Prognose auf Basis der bisherigen Beiträge, keine endgültige Berechnung.",
          },
        ],
      },
    },
    sources: [
      { label: "SGB VI (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/sgb_6/" },
      { label: "Deutsche Rentenversicherung", url: "https://www.deutsche-rentenversicherung.de/" },
    ],
  },
]
