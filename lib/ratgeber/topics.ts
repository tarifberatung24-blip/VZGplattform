import type { GuideCategory, GuideTopic } from "./types"

/**
 * The German offices a Bulgarian-speaking resident deals with, written as guide
 * pages rather than a directory.
 *
 * A competitor publishes ~70 words per authority and links to a form. That is
 * enough to rank and not enough to help: the reader still does not know what to
 * bring. Each page here answers the four questions a person actually has — who is
 * this, what do they decide, what do I bring, what goes wrong — and then points at
 * the office's own page for the authoritative detail.
 *
 * The order is the order of a life in Germany: register an address, insure, work,
 * get paid, pay tax, raise a child, retire.
 */

export const guideCategories: GuideCategory[] = [
  {
    id: "authorities",
    title: { bg: "Институции и служби", de: "Behörden und Ämter" },
    intro: {
      bg: "Кой какво решава, какво да носиш и как минава един час при немската администрация.",
      de: "Wer was entscheidet, was mitzubringen ist und wie ein Termin bei einer deutschen Behörde abläuft.",
    },
  },
  {
    id: "money",
    title: { bg: "Пари и осигуровки", de: "Geld und Sozialversicherung" },
    intro: {
      bg: "Плащания, вноски и права: какво ти се дължи и кой го изчислява.",
      de: "Zahlungen, Beiträge und Ansprüche: was dir zusteht und wer es berechnet.",
    },
  },
  {
    id: "everyday",
    title: { bg: "Ежедневие в Германия", de: "Alltag in Deutschland" },
    intro: {
      bg: "Документи, регистрации и задължения, които всички срещат — обяснени по ред.",
      de: "Dokumente, Anmeldungen und Pflichten, die alle treffen – der Reihe nach erklärt.",
    },
  },
]

export const guideTopics: GuideTopic[] = [
  {
    slug: "anmeldung",
    category: "everyday",
    germanName: "Anmeldung",
    keywords: {
      bg: ["anmeldung", "адресна регистрация Германия", "регистрация по адрес", "meldebescheinigung"],
      de: ["Anmeldung", "Wohnsitz anmelden", "Meldebescheinigung", "Einwohnermeldeamt"],
    },
    content: {
      bg: {
        title: "Anmeldung — адресна регистрация в Германия",
        summary:
          "Регистрацията на адрес (Anmeldung) е първата стъпка след нанасяне в Германия и от нея зависят данъчен номер, банкова сметка, договори и почти всяка служба.",
        intro:
          "Anmeldung е официалното съобщаване на адреса ти в Германия. Прави се в Bürgeramt (или Einwohnermeldeamt) в общината, в която живееш. Задължението е по Bundesmeldegesetz и срокът е обикновено две седмици след нанасяне. Без Meldebescheinigung не можеш да получиш данъчен идентификационен номер (Steuer-ID), а без него много договори и служби не могат да те обработят.",
        scope: [
          "Потвърждава адреса ти пред държавата и произвежда Meldebescheinigung.",
          "Задейства издаването на Steuer-ID от Bundeszentralamt für Steuern.",
          "Свързва те с общинските услуги — извозване на отпадъци, училище, избори.",
        ],
        steps: [
          {
            title: "Вземи формуляра Anmeldeformular",
            body: "Формулярът е на гишето на Bürgeramt или се сваля от сайта на общината. Някои общини искат предварително запазен час онлайн — провери на страницата на твоята община, защото без час гишето може да те върне.",
          },
          {
            title: "Носи документ за самоличност и потвърждение от наемодателя",
            body: "Нужни са валиден паспорт или лична карта и Wohnungsgeberbestätigung — писменото потвърждение от наемодателя, че живееш на този адрес. От 2015 г. то е задължително и се подписва от собственика или от управителя на сградата.",
          },
          {
            title: "Отиди на гишето и попълни данните",
            body: "Служителят попълва данните в системата, а ти подписваш. Питат за семейно положение и религиозна принадлежност — последното влияе на евентуален църковен данък, така че ако не искаш да плащаш такъв, посочи го.",
          },
          {
            title: "Вземи Meldebescheinigung и изчакай Steuer-ID",
            body: "Получаваш Meldebescheinigung веднага. Steuer-ID идва по пощата отделно, обикновено в рамките на няколко седмици. Пази и двата документа — банките и работодателят ги искат.",
          },
        ],
        documents: [
          "Валиден паспорт или лична карта",
          "Wohnungsgeberbestätigung, подписана от наемодателя",
          "Попълнен Anmeldeformular от общината",
          "За деца: акт за раждане и документите на родителя, който ги регистрира",
        ],
        pitfalls: [
          "Да пропуснеш срока. Две седмици след нанасяне е правилото; закъснението може да доведе до глоба.",
          "Да отидеш без Wohnungsgeberbestätigung. Без нея гишето най-често отказва да регистрира адреса.",
          "Да не посочиш, че не искаш църковен данък, ако не си член на призната църква — после се плаща.",
          "Да смяташ, че Anmeldung е същото като разрешение за пребиваване. Това са две различни неща в две различни служби.",
        ],
        faq: [
          {
            question: "Каква е разликата между Anmeldung и Aufenthaltstitel?",
            answer:
              "Anmeldung регистрира адреса ти в общината и се прави в Bürgeramt. Aufenthaltstitel е разрешението за пребиваване и се издава от Ausländerbehörde. Първото е задължително за всички, второто — според твоя статут.",
          },
          {
            question: "Какво е Steuer-ID и как я получавам?",
            answer:
              "Steuer-ID е постоянният ти данъчен идентификационен номер. Издава се автоматично от Bundeszentralamt für Steuern след Anmeldung и идва по пощата на регистрирания адрес. Номерът остава същият при всяко следващо преместване.",
          },
          {
            question: "Трябва ли да се регистрирам отново при преместване в друг град?",
            answer:
              "Да. При преместване се прави Ummeldung в новата община, обикновено в същия двуседмичен срок. Носиш и предишната Meldebescheinigung, ако я имаш.",
          },
        ],
      },
      de: {
        title: "Anmeldung – Wohnsitz in Deutschland anmelden",
        summary:
          "Die Anmeldung des Wohnsitzes ist der erste Schritt nach dem Einzug in Deutschland: Ohne sie gibt es keine Steuer-ID und damit keine Bankverbindung, keinen Vertrag und keinen Zugang zu den meisten Ämtern.",
        intro:
          "Mit der Anmeldung meldest du deinen Wohnsitz bei der Gemeinde. Zuständig ist das Bürgeramt oder Einwohnermeldeamt. Die Pflicht steht im Bundesmeldegesetz und die Frist beträgt in der Regel zwei Wochen nach dem Einzug. Ohne Meldebescheinigung wird keine Steuer-ID vergeben, und ohne diese können Banken, Arbeitgeber und Ämter dich nicht bearbeiten.",
        scope: [
          "Meldet deinen Wohnsitz gegenüber dem Staat und erzeugt die Meldebescheinigung.",
          "Löst die Vergabe der Steuer-ID durch das Bundeszentralamt für Steuern aus.",
          "Verknüpft dich mit kommunalen Leistungen wie Abfallentsorgung, Schule und Wahlen.",
        ],
        steps: [
          {
            title: "Anmeldeformular besorgen",
            body: "Das Formular gibt es am Empfang des Bürgeramts oder zum Herunterladen auf der Seite deiner Gemeinde. Viele Gemeinden vergeben Termine nur online – ohne Termin schickt dich der Empfang häufig wieder weg.",
          },
          {
            title: "Ausweis und Wohnungsgeberbestätigung mitbringen",
            body: "Nötig sind ein gültiger Pass oder Personalausweis und die Wohnungsgeberbestätigung – die schriftliche Bestätigung des Vermieters, dass du dort wohnst. Seit 2015 ist sie verpflichtend und wird vom Eigentümer oder der Hausverwaltung unterschrieben.",
          },
          {
            title: "Am Schalter die Daten aufnehmen lassen",
            body: "Die Sachbearbeitung erfasst deine Daten, du unterschreibst. Gefragt wird nach Familienstand und Religionszugehörigkeit. Letzteres entscheidet über die Kirchensteuer: Wenn du sie nicht zahlen willst, muss das hier so erfasst werden.",
          },
          {
            title: "Meldebescheinigung mitnehmen und Steuer-ID abwarten",
            body: "Die Meldebescheinigung bekommst du sofort. Die Steuer-ID kommt separat per Post, meist innerhalb weniger Wochen. Beide Dokumente brauchst du für Bank und Arbeitgeber.",
          },
        ],
        documents: [
          "Gültiger Pass oder Personalausweis",
          "Vom Vermieter unterschriebene Wohnungsgeberbestätigung",
          "Ausgefülltes Anmeldeformular der Gemeinde",
          "Für Kinder: Geburtsurkunde und die Dokumente des anmeldenden Elternteils",
        ],
        pitfalls: [
          "Die Frist verstreichen lassen. Zwei Wochen nach Einzug ist die Regel; bei Verspätung droht ein Bußgeld.",
          "Ohne Wohnungsgeberbestätigung erscheinen. Ohne sie wird die Anmeldung meist abgelehnt.",
          "Die Kirchensteuer nicht abwählen, wenn du keiner anerkannten Kirche angehörst – sie wird sonst eingezogen.",
          "Annehmen, die Anmeldung sei der Aufenthaltstitel. Das sind zwei verschiedene Dinge bei zwei verschiedenen Behörden.",
        ],
        faq: [
          {
            question: "Was ist der Unterschied zwischen Anmeldung und Aufenthaltstitel?",
            answer:
              "Die Anmeldung erfasst deinen Wohnsitz bei der Gemeinde im Bürgeramt. Der Aufenthaltstitel ist die Aufenthaltserlaubnis und wird von der Ausländerbehörde erteilt. Ersteres ist für alle Pflicht, letzteres hängt vom Aufenthaltsstatus ab.",
          },
          {
            question: "Was ist die Steuer-ID und wie bekomme ich sie?",
            answer:
              "Die Steuer-ID ist deine dauerhafte Steueridentifikationsnummer. Sie wird nach der Anmeldung automatisch vom Bundeszentralamt für Steuern vergeben und kommt per Post an die gemeldete Adresse. Sie bleibt bei jedem weiteren Umzug gleich.",
          },
          {
            question: "Muss ich mich bei einem Umzug in eine andere Stadt erneut anmelden?",
            answer:
              "Ja. Bei einem Umzug erfolgt eine Ummeldung bei der neuen Gemeinde, in der Regel innerhalb derselben Zwei-Wochen-Frist. Bring die bisherige Meldebescheinigung mit, falls vorhanden.",
          },
        ],
      },
    },
    sources: [
      { label: "Bundesmeldegesetz (BMG)", url: "https://www.gesetze-im-internet.de/bmg/" },
      { label: "Bundeszentralamt für Steuern — Steuer-ID", url: "https://www.bzst.de/DE/Privatpersonen/SteuerlicheIdentifikationsnummer/steuerlicheidentifikationsnummer_node.html" },
    ],
  },
  {
    slug: "jobcenter",
    category: "money",
    germanName: "Jobcenter",
    keywords: {
      bg: ["jobcenter", "джоб център", "Bürgergeld", "социални помощи Германия"],
      de: ["Jobcenter", "Bürgergeld", "Grundsicherung beantragen", "SGB II"],
    },
    content: {
      bg: {
        title: "Jobcenter — Bürgergeld и Grundsicherung",
        summary:
          "Jobcenter изплаща Bürgergeld за хора в трудоспособна възраст без достатъчно доход и покрива наем, отопление и основна издръжка.",
        intro:
          "Jobcenter е съвместната институция на Bundesagentur für Arbeit и общината, която прилага SGB II. Тя изплаща Bürgergeld — помощта за хора в трудоспособна възраст, които не могат да покрият нуждите си от собствен доход или имущество. Помощта се състои от Regelbedarf за издръжка и от покриване на разходите за наем и отопление (Kosten der Unterkunft).",
        scope: [
          "Изчислява и изплаща Bürgergeld по SGB II.",
          "Покрива наем и отопление в рамките на определените от общината граници.",
          "Финансира обучения, квалификация и подкрепа при търсене на работа.",
          "Одобрява и възстановява разходи за първоначално обзавеждане и бебешки принадлежности.",
        ],
        steps: [
          {
            title: "Подай заявление преди да свършат парите",
            body: "Заявлението се подава в Jobcenter, който отговаря за адреса ти, или онлайн. Важно е да го подадеш в месеца, в който нуждата възниква: помощта по правило не се изплаща със задна дата за минали месеци.",
          },
          {
            title: "Събери документите за доход, наем и имущество",
            body: "Трябват документи за самоличност, наемния договор, извлечение за наема и отоплението, банкови извлечения за последните месеци и доказателства за доход от всички в домакинството. Jobcenter иска и справка за имуществото.",
          },
          {
            title: "Отиди на срещата и получи Eingliederungsvereinbarung",
            body: "След подаване те канят на среща. Съставя се Eingliederungsvereinbarung — споразумение какво правиш, за да се върнеш на работа, и какво прави Jobcenter, за да помогне. Прочети го преди да го подпишеш.",
          },
          {
            title: "Изплащане и последващи промени",
            body: "Обикновено се изплаща в началото на месеца за съответния месец. Съобщавай веднага всяка промяна — нова работа, промяна в наема, промяна в домакинството. Неуведомяването води до искане за връщане на надплатеното.",
          },
        ],
        documents: [
          "Документ за самоличност и Aufenthaltstitel, ако си гражданин на трета страна",
          "Наемен договор и извлечение за наем и Nebenkosten",
          "Банкови извлечения за последните месеци",
          "Доказателства за доход — фишове, справки, уведомления",
          "Mietbescheinigung, попълнена от наемодателя",
          "За деца: актове за раждане и училищни удостоверения",
        ],
        pitfalls: [
          "Да подадеш заявлението в следващия месец. Помощта не се изплаща назад за минал период.",
          "Да не декларираш имущество или доход на член от домакинството. Открие ли се, следва връщане и възможно наказателно производство.",
          "Да подпишеш Eingliederungsvereinbarung, без да си сигурен какво поемаш. Санкциите при неизпълнение намаляват помощта.",
          "Да пропуснеш да съобщиш за намерена работа. Промяната в дохода трябва да се съобщи веднага.",
        ],
        faq: [
          {
            question: "Мога ли да получа Bürgergeld, ако работя?",
            answer:
              "Да, ако доходът ти не покрива нуждата. Jobcenter изчислява разликата между потребността и действителния доход и изплаща остатъка. Част от дохода остава неприспадната, за да се запази стимулът за работа.",
          },
          {
            question: "Каква е разликата между Jobcenter и Agentur für Arbeit?",
            answer:
              "Agentur für Arbeit изплаща Arbeitslosengeld I след осигуряване и работи по SGB III. Jobcenter изплаща Bürgergeld по SGB II и се включва, когато няма право на Arbeitslosengeld или то не покрива нуждата.",
          },
          {
            question: "Покрива ли Jobcenter наема изцяло?",
            answer:
              "Покрива наема и отоплението в рамките на границите, които общината определя като подходящи. Ако наемът е по-висок, разликата се поема за ограничен период и се очаква да намалиш разхода.",
          },
        ],
      },
      de: {
        title: "Jobcenter – Bürgergeld und Grundsicherung",
        summary:
          "Das Jobcenter zahlt Bürgergeld an erwerbsfähige Personen ohne ausreichendes Einkommen und übernimmt Miete, Heizung und den Regelbedarf.",
        intro:
          "Das Jobcenter ist die gemeinsame Einrichtung von Bundesagentur für Arbeit und Kommune und führt das SGB II aus. Es zahlt Bürgergeld – die Grundsicherung für erwerbsfähige Personen, die ihren Bedarf nicht aus eigenem Einkommen oder Vermögen decken können. Die Leistung besteht aus dem Regelbedarf und der Übernahme der Kosten für Unterkunft und Heizung.",
        scope: [
          "Berechnet und zahlt Bürgergeld nach dem SGB II.",
          "Übernimmt Miete und Heizung innerhalb der örtlichen Richtwerte.",
          "Finanziert Weiterbildung, Qualifizierung und Unterstützung bei der Arbeitssuche.",
          "Genehmigt und erstattet Erstausstattungen für Wohnung und Baby.",
        ],
        steps: [
          {
            title: "Antrag stellen, bevor das Geld ausgeht",
            body: "Der Antrag wird beim zuständigen Jobcenter oder online gestellt. Wichtig ist die Stellung im Monat, in dem der Bedarf entsteht: Leistungen werden grundsätzlich nicht für vergangene Monate nachgezahlt.",
          },
          {
            title: "Unterlagen zu Einkommen, Miete und Vermögen sammeln",
            body: "Nötig sind Identitätsnachweise, Mietvertrag, Abrechnung über Miete und Heizung, Kontoauszüge der letzten Monate und Nachweise über Einkommen aller Haushaltsmitglieder. Zusätzlich wird eine Vermögensaufstellung verlangt.",
          },
          {
            title: "Zum Termin gehen und die Eingliederungsvereinbarung prüfen",
            body: "Nach der Antragstellung wirst du eingeladen. Es wird eine Eingliederungsvereinbarung erstellt: was du für die Rückkehr in Arbeit tust und was das Jobcenter dafür leistet. Vor dem Unterschreiben vollständig lesen.",
          },
          {
            title: "Auszahlung und Änderungsmitteilungen",
            body: "Die Auszahlung erfolgt in der Regel zum Monatsanfang für den laufenden Monat. Jede Änderung sofort mitteilen – neue Arbeit, geänderte Miete, geänderter Haushalt. Ohne Mitteilung wird zu viel Gezahltes zurückgefordert.",
          },
        ],
        documents: [
          "Ausweis und Aufenthaltstitel, wenn du Drittstaatsangehörige bist",
          "Mietvertrag und Abrechnung über Miete und Nebenkosten",
          "Kontoauszüge der letzten Monate",
          "Einkommensnachweise – Lohnabrechnungen, Bescheide, Mitteilungen",
          "Vom Vermieter ausgefüllte Mietbescheinigung",
          "Für Kinder: Geburtsurkunden und Schulbescheinigungen",
        ],
        pitfalls: [
          "Den Antrag erst im Folgemonat stellen. Eine Nachzahlung für den Vormonat ist nicht vorgesehen.",
          "Vermögen oder Einkommen eines Haushaltsmitglieds nicht angeben. Das führt zur Rückforderung und kann strafbar sein.",
          "Die Eingliederungsvereinbarung unterschreiben, ohne die Pflichten zu kennen. Bei Nichterfüllung wird die Leistung gekürzt.",
          "Eine neue Arbeitsstelle nicht mitteilen. Einkommensänderungen sind unverzüglich anzugeben.",
        ],
        faq: [
          {
            question: "Kann ich Bürgergeld bekommen, wenn ich arbeite?",
            answer:
              "Ja, wenn dein Einkommen den Bedarf nicht deckt. Das Jobcenter berechnet die Differenz zwischen Bedarf und tatsächlichem Einkommen und zahlt den Rest. Ein Teil des Einkommens bleibt anrechnungsfrei, damit Arbeit sich lohnt.",
          },
          {
            question: "Was ist der Unterschied zwischen Jobcenter und Agentur für Arbeit?",
            answer:
              "Die Agentur für Arbeit zahlt Arbeitslosengeld I nach einer versicherungspflichtigen Beschäftigung und arbeitet nach dem SGB III. Das Jobcenter zahlt Bürgergeld nach dem SGB II und kommt ins Spiel, wenn kein Anspruch auf Arbeitslosengeld besteht oder es den Bedarf nicht deckt.",
          },
          {
            question: "Übernimmt das Jobcenter die Miete vollständig?",
            answer:
              "Übernommen werden Miete und Heizung innerhalb der örtlichen Richtwerte. Liegt die Miete darüber, wird die Differenz für einen begrenzten Zeitraum getragen; eine Senkung der Kosten wird erwartet.",
          },
        ],
      },
    },
    sources: [
      { label: "SGB II (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/sgb_2/" },
      { label: "Bundesagentur für Arbeit — Grundsicherung beantragen", url: "https://www.arbeitsagentur.de/grundsicherung/grundsicherungsgeld-beantragen" },
      { label: "jobcenter.digital", url: "https://www.jobcenter.digital/" },
    ],
  },
  {
    slug: "finanzamt",
    category: "money",
    germanName: "Finanzamt",
    keywords: {
      bg: ["finanzamt", "данъчна служба Германия", "данъчна декларация", "Steuererklärung"],
      de: ["Finanzamt", "Steuererklärung", "Steuerbescheid", "ELSTER"],
    },
    content: {
      bg: {
        title: "Finanzamt — данъчната служба в Германия",
        summary:
          "Finanzamt приема данъчните декларации, издава данъчните актове и определя какво дължиш или какво ти се връща за съответната година.",
        intro:
          "Finanzamt е местната данъчна служба и отговаря за твоето данъчно досие. Там се подава Steuererklärung — данъчната декларация за годината — и оттам идва Steuerbescheid, официалният акт, с който се определя данъкът. Декларацията се подава по електронен път през ELSTER; хартиено подаване е възможно само в изключителни случаи.",
        scope: [
          "Приема данъчните декларации и ги обработва.",
          "Издава Steuerbescheid и определя дължимия или възстановимия данък.",
          "Издава данъчния номер (Steuernummer) за твоето досие.",
          "Решава въпроси по Lohnsteuer, Kapitalertragsteuer и свързаните удръжки.",
        ],
        steps: [
          {
            title: "Регистрирай се в ELSTER",
            body: "ELSTER е официалният портал за електронно подаване. Регистрацията иска активиране по пощата и отнема няколко дни, затова я направи преди крайния срок, а не в последния ден.",
          },
          {
            title: "Събери документите за годината",
            body: "Нужни са Lohnsteuerbescheinigung от работодателя, доказателства за разходи, свързани с работата, разходи за обучение, разходи за домакински услуги, дарения и, ако е приложимо, доказателства за деца и за разходи при развод или болест.",
          },
          {
            title: "Подай декларацията в срока",
            body: "Срокът за задължените да подават е до края на юли на следващата година. При подаване чрез Steuerberater срокът е по-дълъг. Ако си доброволно подаващ, обикновено имаш четири години назад — използвай това, ако пропуснеш година.",
          },
          {
            title: "Прегледай Steuerbescheid внимателно",
            body: "В акта е посочено какво е признато и какво не. Ако нещо е отказано, имаш един месец да възразиш с Einspruch. Провери дали са включени всички декларирани разходи и дали Steuer-ID е правилният.",
          },
        ],
        documents: [
          "Steuer-ID и Steuernummer",
          "Lohnsteuerbescheinigung от всеки работодател",
          "Доказателства за професионални разходи",
          "Удостоверения за осигуровки и вноски",
          "Доказателства за дарения и за разходи за домакински услуги",
          "При деца: документите за Kindergeld и разходите за грижа",
        ],
        pitfalls: [
          "Да пропуснеш срока за задължителна декларация. Закъснението може да доведе до Verspätungszuschlag.",
          "Да пропуснеш едномесечния срок за Einspruch след неблагоприятен акт. След това актът става окончателен.",
          "Да подадеш с грешен Steuer-ID. Това премества декларацията в чуждо досие и забавя обработката с месеци.",
          "Да не декларираш чуждестранен доход, включително от България. Германия облага световния доход на местните лица.",
        ],
        faq: [
          {
            question: "Трябва ли да подавам данъчна декларация?",
            answer:
              "Задължителна е при определени случаи — например при доход от две работи, при получаване на Lohnersatzleistungen или при специфични данъчни класове. В останалите случаи е доброволна и често връща пари.",
          },
          {
            question: "Каква е разликата между Steuernummer и Steuer-ID?",
            answer:
              "Steuer-ID е постоянният идентификатор, който получаваш веднъж и не се променя. Steuernummer се дава от конкретното Finanzamt за конкретното досие и може да се различава при преместване в друга област.",
          },
          {
            question: "Колко време имам да подам декларация за минала година?",
            answer:
              "Ако подаваш доброволно, имаш четири години след края на данъчната година. За задължителната декларация срокът е до края на юли на следващата година, освен ако декларацията се подава чрез Steuerberater.",
          },
        ],
      },
      de: {
        title: "Finanzamt – die Steuerverwaltung in Deutschland",
        summary:
          "Das Finanzamt nimmt die Steuererklärungen an, erlässt die Steuerbescheide und legt fest, was du für das jeweilige Jahr zahlst oder erstattet bekommst.",
        intro:
          "Das Finanzamt ist die örtliche Steuerbehörde und führt deine Steuerakte. Dort wird die Steuererklärung eingereicht, und von dort kommt der Steuerbescheid, mit dem die Steuer festgesetzt wird. Die Erklärung wird elektronisch über ELSTER übermittelt; eine Abgabe in Papierform ist nur in Ausnahmefällen möglich.",
        scope: [
          "Nimmt Steuererklärungen an und bearbeitet sie.",
          "Erlässt den Steuerbescheid und setzt Nachzahlung oder Erstattung fest.",
          "Vergibt die Steuernummer für deine Akte.",
          "Entscheidet über Lohnsteuer, Kapitalertragsteuer und damit zusammenhängende Abzüge.",
        ],
        steps: [
          {
            title: "Bei ELSTER registrieren",
            body: "ELSTER ist das offizielle Portal für die elektronische Abgabe. Die Registrierung erfordert eine postalische Aktivierung und dauert mehrere Tage – erledige sie vor der Frist und nicht am letzten Tag.",
          },
          {
            title: "Unterlagen des Jahres sammeln",
            body: "Nötig sind die Lohnsteuerbescheinigung des Arbeitgebers, Nachweise über Werbungskosten, Ausbildungs- und haushaltsnahe Dienstleistungen, Spenden sowie – falls zutreffend – Nachweise zu Kindern und zu Trennung oder Krankheit.",
          },
          {
            title: "Erklärung fristgerecht abgeben",
            body: "Für Pflichtveranlagte endet die Frist am 31. Juli des Folgejahres. Bei Abgabe über einen Steuerberater gilt eine längere Frist. Wer freiwillig abgibt, hat in der Regel vier Jahre Zeit – nutze das, wenn ein Jahr ausgefallen ist.",
          },
          {
            title: "Steuerbescheid genau prüfen",
            body: "Der Bescheid zeigt, was anerkannt wurde und was nicht. Wurde etwas abgelehnt, hast du einen Monat für den Einspruch. Prüfe, ob alle angegebenen Aufwendungen berücksichtigt sind und die Steuer-ID korrekt ist.",
          },
        ],
        documents: [
          "Steuer-ID und Steuernummer",
          "Lohnsteuerbescheinigung je Arbeitgeber",
          "Nachweise über Werbungskosten",
          "Bescheinigungen über Sozialversicherungsbeiträge",
          "Spendenbescheinigungen und Nachweise haushaltsnaher Dienstleistungen",
          "Bei Kindern: Unterlagen zu Kindergeld und Betreuungskosten",
        ],
        pitfalls: [
          "Die Frist für die Pflichtabgabe verpassen. Bei Verspätung kann ein Verspätungszuschlag festgesetzt werden.",
          "Die Monatsfrist für den Einspruch verstreichen lassen. Danach wird der Bescheid bestandskräftig.",
          "Mit falscher Steuer-ID abgeben. Die Erklärung landet in einer fremden Akte und die Bearbeitung verzögert sich um Monate.",
          "Ausländische Einkünfte, auch aus Bulgarien, nicht angeben. Deutschland besteuert das Welteinkommen unbeschränkt Steuerpflichtiger.",
        ],
        faq: [
          {
            question: "Muss ich überhaupt eine Steuererklärung abgeben?",
            answer:
              "Pflicht besteht in bestimmten Fällen – etwa bei Einkünften aus zwei Jobs, bei Lohnersatzleistungen oder bei bestimmten Steuerklassen. Sonst ist sie freiwillig und führt häufig zu einer Erstattung.",
          },
          {
            question: "Was ist der Unterschied zwischen Steuernummer und Steuer-ID?",
            answer:
              "Die Steuer-ID ist die dauerhafte Identifikationsnummer, die du einmal erhältst und die sich nicht ändert. Die Steuernummer vergibt das zuständige Finanzamt für die konkrete Akte und kann bei einem Umzug in einen anderen Bezirk abweichen.",
          },
          {
            question: "Wie lange habe ich Zeit für die Erklärung eines früheren Jahres?",
            answer:
              "Bei freiwilliger Abgabe gilt eine Frist von vier Jahren nach Ablauf des Steuerjahres. Für die Pflichtveranlagung endet die Frist am 31. Juli des Folgejahres, sofern die Erklärung nicht über einen Steuerberater abgegeben wird.",
          },
        ],
      },
    },
    sources: [
      { label: "Bundesministerium der Finanzen — Steuererklärung", url: "https://www.bundesfinanzministerium.de/" },
      { label: "ELSTER — offizielles Portal", url: "https://www.elster.de/" },
      { label: "Abgabenordnung (AO), § 149 Fristen", url: "https://www.gesetze-im-internet.de/ao_1977/__149.html" },
    ],
  },
]
