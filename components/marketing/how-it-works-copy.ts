import type { Locale } from "@/lib/i18n/dictionaries"

// Kept for the reusable connected-path component and its geometry tests.
export type HowItWorksStageId = "understand" | "manage" | "analyze" | "plan"
export type HowItWorksStage = {
  id: HowItWorksStageId
  label: string
  title: string
  body: string
  chips: string[]
  soon?: string
}

export type HowItWorksServiceId =
  | "guide"
  | "document_explanation"
  | "inkasso"
  | "documents"
  | "agentur"
  | "jobcenter"
  | "termination"
  | "tax"
  | "entitlements"
  | "kindergeld"
  | "contracts"
  | "cost_reduction"
  | "insurance"
  | "education"
  | "forum"

export type HowItWorksService = {
  id: HowItWorksServiceId
  title: string
  problem: string
  steps: [string, string, string]
  resultLabel: string
  result: string
  cta: string
  href: string
}

export type HowItWorksGroup = {
  id: "letters" | "authorities" | "money"
  title: string
  intro: string
  services: HowItWorksService[]
}

export type HowItWorksCopy = {
  back: string
  eyebrow: string
  title: string
  intro: string
  quickTitle: string
  quickHint: string
  stepLabel: string
  groups: HowItWorksGroup[]
  noticeTitle: string
  notice: string
  primaryCta: string
  secondaryCta: string
}

export const howItWorksCopy: Record<Locale, HowItWorksCopy> = {
  bg: {
    back: "Към началото",
    eyebrow: "Всички услуги на едно място",
    title: "Какво можеш да свършиш с HORIZON",
    intro: "Намери своя проблем. Виж трите стъпки. Отвори точната услуга.",
    quickTitle: "Избери тема",
    quickHint: "Не е нужно да знаеш името на функцията.",
    stepLabel: "Стъпка",
    groups: [
      {
        id: "letters",
        title: "Имам писмо или документ",
        intro: "За писма, срокове, дългове и документи, които не разбираш.",
        services: [
          {
            id: "guide",
            title: "HORIZON Guide и лични случаи",
            problem: "Имаш проблем, но не знаеш коя услуга ти трябва.",
            steps: ["Избираш какво се е случило.", "Добавяш текст или документ.", "Следваш ясната следваща стъпка."],
            resultLabel: "Получаваш",
            result: "Личен случай с документи, въпроси и действия на едно място.",
            cta: "Започни личен случай",
            href: "/guide",
          },
          {
            id: "document_explanation",
            title: "Обяснение на документи",
            problem: "Получил си немско писмо и не разбираш какво означава.",
            steps: ["Качваш писмото.", "Потвърждаваш какъв документ е.", "Проверяваш срока и важните места."],
            resultLabel: "Получаваш",
            result: "Кратко обяснение и ясна следваща стъпка.",
            cta: "Обясни документ",
            href: "/guide",
          },
          {
            id: "inkasso",
            title: "Inkasso Check",
            problem: "Искаш да провериш писмо за дълг, такси или Mahnbescheid.",
            steps: ["Качваш писмото или поставяш текста.", "Проверяваш извлечените суми и дати.", "Избираш какво да подготвиш."],
            resultLabel: "Получаваш",
            result: "Разбивка на претенцията, сигнали за проверка и чернова за действие.",
            cta: "Провери Inkasso писмо",
            href: "/pruefung",
          },
          {
            id: "documents",
            title: "Моите документи",
            problem: "Писмата и файловете ти са разпръснати и трудно ги намираш.",
            steps: ["Качваш PDF, снимка или скрийншот.", "Файлът се проверява и съхранява.", "Отваряш го, когато ти потрябва."],
            resultLabel: "Получаваш",
            result: "Едно подредено място за важните документи.",
            cta: "Отвори документите",
            href: "/documents",
          },
        ],
      },
      {
        id: "authorities",
        title: "Имам работа с институция",
        intro: "За Agentur für Arbeit, Jobcenter, данъци, помощи и прекратяване на договор.",
        services: [
          {
            id: "agentur",
            title: "Agentur für Arbeit",
            problem: "Трябва да отговориш, да подадеш данни или да попълниш документ.",
            steps: ["Избираш задачата.", "Добавяш известните данни.", "Проверяваш подготвения документ."],
            resultLabel: "Получаваш",
            result: "Подреден случай и подготвена следваща стъпка.",
            cta: "Отвори Agentur für Arbeit",
            href: "/guide",
          },
          {
            id: "jobcenter",
            title: "Jobcenter",
            problem: "Имаш писмо, заявление или искане за липсващи данни.",
            steps: ["Избираш вида на задачата.", "Добавяш данните и документите.", "Преглеждаш подготвения резултат."],
            resultLabel: "Получаваш",
            result: "Ясен списък какво липсва и какво да направиш после.",
            cta: "Отвори Jobcenter",
            href: "/guide",
          },
          {
            id: "termination",
            title: "Прекратяване на договор",
            problem: "Искаш да прекратиш договор, но не знаеш как да започнеш.",
            steps: ["Добавяш договора и срока.", "Проверяваш данните.", "Одобряваш подготвеното предизвестие."],
            resultLabel: "Получаваш",
            result: "Чернова за прекратяване, която ти решаваш дали да използваш.",
            cta: "Подготви прекратяване",
            href: "/guide",
          },
          {
            id: "tax",
            title: "Данъчна декларация",
            problem: "Искаш да подредиш данните за данъчната си декларация.",
            steps: ["Избираш данъчната година.", "Добавяш и потвърждаваш данните.", "Преглеждаш наличния официален формуляр."],
            resultLabel: "Получаваш",
            result: "Подготвени данни и формуляр за личен преглед.",
            cta: "Отвори данъците",
            href: "/steuer",
          },
          {
            id: "entitlements",
            title: "Права и социални помощи",
            problem: "Не знаеш кои държавни помощи може да са подходящи за теб.",
            steps: ["Описваш домакинството.", "Добавяш доходи и разходи.", "Виждаш кои възможности да провериш."],
            resultLabel: "Получаваш",
            result: "Ориентир и списък с документи, без автоматично решение за право.",
            cta: "Провери възможностите",
            href: "/anspruch",
          },
          {
            id: "kindergeld",
            title: "Kindergeld Navigator",
            problem: "Искаш да подготвиш данните за Kindergeld.",
            steps: ["Отговаряш на кратки въпроси.", "Проверяваш въведените данни.", "Получаваш подготвена чернова."],
            resultLabel: "Получаваш",
            result: "Структурирана подготовка, която преглеждаш преди използване.",
            cta: "Започни Kindergeld",
            href: "/kindergeld",
          },
        ],
      },
      {
        id: "money",
        title: "Искам контрол над парите си",
        intro: "За договори, разходи, застраховки, знания и общност.",
        services: [
          {
            id: "contracts",
            title: "Договори и срокове",
            problem: "Не знаеш колко плащаш и кога можеш да прекратиш договор.",
            steps: ["Добавяш договор ръчно или като файл.", "Потвърждаваш сумата и датите.", "Следиш разходите и сроковете."],
            resultLabel: "Получаваш",
            result: "Ясен списък на договорите и следващите действия.",
            cta: "Отвори договорите",
            href: "/vertraege",
          },
          {
            id: "cost_reduction",
            title: "Намаляване на разходи",
            problem: "Искаш да провериш разход за ток, газ или отопление.",
            steps: ["Описваш текущата ситуация.", "Добавяш нужните данни или документ.", "Заявката се подготвя за личен преглед."],
            resultLabel: "Получаваш",
            result: "Подредена заявка за проверка, без обещана цена или спестяване.",
            cta: "Заяви проверка",
            href: "/kosten-senken",
          },
          {
            id: "insurance",
            title: "Застраховки",
            problem: "Търсиш автомобилна или фирмена застраховка.",
            steps: ["Избираш вида застраховка.", "Преглеждаш наличната партньорска оферта.", "Решаваш дали да продължиш при партньора."],
            resultLabel: "Получаваш",
            result: "Ясен път към наличните предложения с означени партньорски връзки.",
            cta: "Виж застраховките",
            href: "/versicherungen",
          },
          {
            id: "education",
            title: "Финансово обучение",
            problem: "Искаш да разбираш по-добре договори, бюджет и финансови решения.",
            steps: ["Избираш тема.", "Четеш обяснението със собствено темпо.", "Използваш наученото при следващо решение."],
            resultLabel: "Получаваш",
            result: "Кратки и разбираеми материали, а не лична финансова консултация.",
            cta: "Започни обучение",
            href: "/finanzbildung",
          },
          {
            id: "forum",
            title: "HORIZON Forum",
            problem: "Искаш да споделиш опит, да зададеш въпрос или да следиш важни промени.",
            steps: ["Избираш тема.", "Публикуваш или коментираш.", "Следиш отговорите и съобщенията."],
            resultLabel: "Получаваш",
            result: "Общо място за мнения, казуси и важна информация.",
            cta: "Отвори форума",
            href: "/forum",
          },
        ],
      },
    ],
    noticeTitle: "Важно",
    notice: "HORIZON подрежда, обяснява и подготвя. Не взема автоматични решения. Не заменя данъчна, правна или социална консултация. HORIZON не е застраховател и не обещава цена, спестяване или одобрение. Партньорските връзки са означени.",
    primaryCta: "Създай профил",
    secondaryCta: "Вход",
  },
  de: {
    back: "Zur Startseite",
    eyebrow: "Alle Dienste an einem Ort",
    title: "Was du mit HORIZON erledigen kannst",
    intro: "Finde dein Problem. Sieh die drei Schritte. Öffne den passenden Dienst.",
    quickTitle: "Thema wählen",
    quickHint: "Du musst den Namen der Funktion nicht kennen.",
    stepLabel: "Schritt",
    groups: [
      {
        id: "letters",
        title: "Ich habe einen Brief oder ein Dokument",
        intro: "Für Schreiben, Fristen, Forderungen und Unterlagen, die unklar sind.",
        services: [
          {
            id: "guide",
            title: "HORIZON Guide und persönliche Vorgänge",
            problem: "Du hast ein Problem, weißt aber nicht, welcher Dienst passt.",
            steps: ["Du wählst, was passiert ist.", "Du fügst Text oder ein Dokument hinzu.", "Du folgst dem klaren nächsten Schritt."],
            resultLabel: "Ergebnis",
            result: "Ein persönlicher Vorgang mit Unterlagen, Fragen und Aktionen an einem Ort.",
            cta: "Persönlichen Vorgang starten",
            href: "/guide",
          },
          {
            id: "document_explanation",
            title: "Dokumente erklären",
            problem: "Du hast ein deutsches Schreiben erhalten und verstehst es nicht.",
            steps: ["Du lädst das Schreiben hoch.", "Du bestätigst die Dokumentart.", "Du prüfst Frist und wichtige Stellen."],
            resultLabel: "Ergebnis",
            result: "Eine kurze Erklärung und ein klarer nächster Schritt.",
            cta: "Dokument erklären",
            href: "/guide",
          },
          {
            id: "inkasso",
            title: "Inkasso-Check",
            problem: "Du möchtest eine Forderung, Gebühren oder einen Mahnbescheid prüfen.",
            steps: ["Du lädst das Schreiben hoch oder fügst den Text ein.", "Du prüfst Beträge und Daten.", "Du wählst, was vorbereitet werden soll."],
            resultLabel: "Ergebnis",
            result: "Eine Aufteilung der Forderung, Prüfhinweise und ein Entwurf für die nächste Aktion.",
            cta: "Inkassoschreiben prüfen",
            href: "/pruefung",
          },
          {
            id: "documents",
            title: "Meine Dokumente",
            problem: "Deine Schreiben und Dateien liegen an verschiedenen Orten.",
            steps: ["Du lädst PDF, Foto oder Screenshot hoch.", "Die Datei wird geprüft und gespeichert.", "Du öffnest sie wieder, wenn du sie brauchst."],
            resultLabel: "Ergebnis",
            result: "Ein geordneter Ort für wichtige Dokumente.",
            cta: "Dokumente öffnen",
            href: "/documents",
          },
        ],
      },
      {
        id: "authorities",
        title: "Ich muss etwas mit einer Behörde klären",
        intro: "Für Agentur für Arbeit, Jobcenter, Steuern, Leistungen und Kündigungen.",
        services: [
          {
            id: "agentur",
            title: "Agentur für Arbeit",
            problem: "Du musst antworten, Angaben machen oder ein Dokument ausfüllen.",
            steps: ["Du wählst die Aufgabe.", "Du ergänzt die bekannten Angaben.", "Du prüfst das vorbereitete Dokument."],
            resultLabel: "Ergebnis",
            result: "Ein geordneter Vorgang und ein vorbereiteter nächster Schritt.",
            cta: "Agentur für Arbeit öffnen",
            href: "/guide",
          },
          {
            id: "jobcenter",
            title: "Jobcenter",
            problem: "Du hast ein Schreiben, einen Antrag oder eine Nachfrage zu fehlenden Angaben.",
            steps: ["Du wählst die Aufgabe.", "Du ergänzt Angaben und Unterlagen.", "Du prüfst das vorbereitete Ergebnis."],
            resultLabel: "Ergebnis",
            result: "Eine klare Liste mit fehlenden Angaben und dem nächsten Schritt.",
            cta: "Jobcenter öffnen",
            href: "/guide",
          },
          {
            id: "termination",
            title: "Vertrag kündigen",
            problem: "Du möchtest einen Vertrag beenden und weißt nicht, wie du anfangen sollst.",
            steps: ["Du ergänzt Vertrag und Frist.", "Du prüfst die Angaben.", "Du gibst den vorbereiteten Entwurf frei."],
            resultLabel: "Ergebnis",
            result: "Ein Kündigungsentwurf, über dessen Verwendung du selbst entscheidest.",
            cta: "Kündigung vorbereiten",
            href: "/guide",
          },
          {
            id: "tax",
            title: "Steuererklärung",
            problem: "Du möchtest deine Angaben für die Steuererklärung ordnen.",
            steps: ["Du wählst das Steuerjahr.", "Du ergänzt und bestätigst die Angaben.", "Du prüfst das verfügbare amtliche Formular."],
            resultLabel: "Ergebnis",
            result: "Vorbereitete Angaben und ein Formular für deine eigene Prüfung.",
            cta: "Steuern öffnen",
            href: "/steuer",
          },
          {
            id: "entitlements",
            title: "Ansprüche und Sozialleistungen",
            problem: "Du weißt nicht, welche staatlichen Leistungen zu deiner Situation passen könnten.",
            steps: ["Du beschreibst deinen Haushalt.", "Du ergänzt Einkommen und Ausgaben.", "Du siehst, welche Möglichkeiten du prüfen kannst."],
            resultLabel: "Ergebnis",
            result: "Eine Orientierung und eine Unterlagenliste, aber keine automatische Anspruchsentscheidung.",
            cta: "Möglichkeiten prüfen",
            href: "/anspruch",
          },
          {
            id: "kindergeld",
            title: "Kindergeld Navigator",
            problem: "Du möchtest die Angaben für Kindergeld vorbereiten.",
            steps: ["Du beantwortest kurze Fragen.", "Du prüfst deine Angaben.", "Du erhältst einen vorbereiteten Entwurf."],
            resultLabel: "Ergebnis",
            result: "Eine strukturierte Vorbereitung, die du vor der Verwendung prüfst.",
            cta: "Kindergeld starten",
            href: "/kindergeld",
          },
        ],
      },
      {
        id: "money",
        title: "Ich möchte meine Finanzen im Blick behalten",
        intro: "Für Verträge, Kosten, Versicherungen, Wissen und Austausch.",
        services: [
          {
            id: "contracts",
            title: "Verträge und Fristen",
            problem: "Du weißt nicht genau, was du zahlst oder wann du kündigen kannst.",
            steps: ["Du erfasst einen Vertrag oder lädst ihn hoch.", "Du bestätigst Betrag und Daten.", "Du behältst Kosten und Fristen im Blick."],
            resultLabel: "Ergebnis",
            result: "Eine klare Liste deiner Verträge und nächsten Aktionen.",
            cta: "Verträge öffnen",
            href: "/vertraege",
          },
          {
            id: "cost_reduction",
            title: "Kosten senken",
            problem: "Du möchtest Kosten für Strom, Gas oder Heizung prüfen lassen.",
            steps: ["Du beschreibst deine aktuelle Situation.", "Du ergänzt die nötigen Angaben oder ein Dokument.", "Die Anfrage wird für eine persönliche Prüfung vorbereitet."],
            resultLabel: "Ergebnis",
            result: "Eine geordnete Prüfanfrage ohne versprochenen Preis oder Ersparnis.",
            cta: "Prüfung anfragen",
            href: "/kosten-senken",
          },
          {
            id: "insurance",
            title: "Versicherungen",
            problem: "Du suchst eine Kfz- oder Firmenversicherung.",
            steps: ["Du wählst die Versicherungsart.", "Du prüfst das verfügbare Partnerangebot.", "Du entscheidest, ob du beim Partner fortfährst."],
            resultLabel: "Ergebnis",
            result: "Ein klarer Weg zu verfügbaren Angeboten mit gekennzeichneten Partnerlinks.",
            cta: "Versicherungen ansehen",
            href: "/versicherungen",
          },
          {
            id: "education",
            title: "Finanzbildung",
            problem: "Du möchtest Verträge, Budget und Finanzentscheidungen besser verstehen.",
            steps: ["Du wählst ein Thema.", "Du liest die Erklärung in deinem Tempo.", "Du nutzt das Wissen bei deiner nächsten Entscheidung."],
            resultLabel: "Ergebnis",
            result: "Kurze, verständliche Inhalte statt persönlicher Finanzberatung.",
            cta: "Lernen beginnen",
            href: "/finanzbildung",
          },
          {
            id: "forum",
            title: "HORIZON Forum",
            problem: "Du möchtest Erfahrungen teilen, eine Frage stellen oder wichtige Änderungen verfolgen.",
            steps: ["Du wählst ein Thema.", "Du veröffentlichst einen Beitrag oder Kommentar.", "Du verfolgst Antworten und Mitteilungen."],
            resultLabel: "Ergebnis",
            result: "Ein gemeinsamer Ort für Erfahrungen, Fragen und wichtige Informationen.",
            cta: "Forum öffnen",
            href: "/forum",
          },
        ],
      },
    ],
    noticeTitle: "Wichtig",
    notice: "HORIZON ordnet, erklärt und bereitet vor. Es trifft keine automatischen Entscheidungen und ersetzt keine Steuer-, Rechts- oder Sozialberatung. HORIZON ist kein Versicherer und verspricht keinen Preis, keine Ersparnis und keine Genehmigung. Partnerlinks sind gekennzeichnet.",
    primaryCta: "Profil erstellen",
    secondaryCta: "Anmelden",
  },
}
