import type { GuideTopic } from "./types"

/**
 * Everyday obligations and registrations: the town hall counter, the licence fee,
 * a tenancy agreement and a bank account.
 *
 * These four are the ones a newly arrived resident meets in the first weeks, and
 * each of them has a mistake that costs money and is avoidable if it is written
 * down in advance.
 */
export const guideTopicsEveryday: GuideTopic[] = [
  {
    slug: "buergeramt",
    category: "everyday",
    germanName: "Bürgeramt",
    keywords: {
      bg: ["bürgeramt", "община Германия", "документи от общината", "гише Германия"],
      de: ["Bürgeramt", "Meldeamt", "Termin Bürgeramt", "Urkunden bestellen"],
    },
    content: {
      bg: {
        title: "Bürgeramt — общинската служба за граждани",
        summary:
          "Bürgeramt е общинското гише за документи и регистрации: адресна регистрация, удостоверения, документи за самоличност и заверки.",
        intro:
          "Bürgeramt е мястото, където се уреждат повечето ежедневни административни въпроси — от адресна регистрация до удостоверения и заявления за документи. Нарича се още Einwohnermeldeamt или Meldeamt в зависимост от общината. Много общини работят само с предварително запазен час, затова проверката на страницата на общината е първата стъпка.",
        scope: [
          "Адресна регистрация, промяна на адрес и дерегистрация.",
          "Издаване на удостоверения и заверки на копия.",
          "Заявления за лична карта и паспорт.",
          "Други общински услуги — извозване на отпадъци, такси, разрешителни.",
        ],
        steps: [
          {
            title: "Провери как се запазва час в твоята община",
            body: "Общините използват различни системи за запазване на час, а някои приемат и без час в определени часове. Провери на сайта на общината, преди да отидеш.",
          },
          {
            title: "Определи точно коя услуга ти трябва",
            body: "Гишетата са разделени по услуги. Ако отидеш за грешната услуга, ще те върнат. Провери списъка с услуги и нужните документи за конкретната услуга.",
          },
          {
            title: "Носи всички документи в оригинал",
            body: "Обикновено се искат оригинали, а не копия. За заверки носи документа и копие. За регистрация — паспорт и потвърждение от наемодателя.",
          },
          {
            title: "Плати таксата и вземи удостоверението",
            body: "Таксите се плащат на гишето, обикновено само в брой или с карта в зависимост от общината. Удостоверението се дава веднага при повечето услуги.",
          },
        ],
        documents: [
          "Валиден паспорт или лична карта",
          "Потвърждение от наемодателя при регистрация на адрес",
          "Попълнени формуляри за съответната услуга",
          "При заверка: оригиналът и копието",
          "Средства за таксата",
        ],
        pitfalls: [
          "Да отидеш без час, когато общината приема само с час. Това е най-честата загубена сутрин.",
          "Да носиш копия вместо оригинали. Копията не се приемат за самоличност.",
          "Да отидеш в общината, която не отговаря за адреса ти. Компетентността е строго териториална.",
          "Да подпишеш документ, без да разбереш какво удостоверяваш. Питай на гишето, ако нещо не е ясно.",
        ],
        faq: [
          {
            question: "Каква е разликата между Bürgeramt и Rathaus?",
            answer:
              "Rathaus е сградата на общинската администрация и в нея често се намира Bürgeramt. Bürgeramt е конкретното звено за услуги на граждани. В големите градове Bürgeramt може да е в отделна сграда.",
          },
          {
            question: "Мога ли да отида в друга община, ако там има свободни часове?",
            answer:
              "За адресна регистрация — не, тя е обвързана с адреса ти. За други услуги като паспорт понякога е възможно, ако общината предлага т.нар. услуга за всички. Провери предварително.",
          },
          {
            question: "Трябва ли да нося превод на документите си?",
            answer:
              "Ако документът не е на немски, често се иска превод от заклет преводач. За паспорт и лична карта това обикновено не се иска, защото форматът е международен.",
          },
        ],
      },
      de: {
        title: "Bürgeramt – das kommunale Bürgerbüro",
        summary:
          "Das Bürgeramt ist die kommunale Anlaufstelle für Dokumente und Anmeldungen: Wohnsitz, Bescheinigungen, Ausweisdokumente und Beglaubigungen.",
        intro:
          "Im Bürgeramt werden die meisten alltäglichen Verwaltungsangelegenheiten erledigt – von der Anmeldung des Wohnsitzes bis zu Bescheinigungen und Ausweisanträgen. Je nach Gemeinde heißt es auch Einwohnermeldeamt oder Meldeamt. Viele Gemeinden arbeiten nur mit Termin, deshalb ist der Blick auf die Gemeindeseite der erste Schritt.",
        scope: [
          "An-, Um- und Abmeldung des Wohnsitzes.",
          "Ausstellung von Bescheinigungen und Beglaubigungen.",
          "Anträge für Personalausweis und Reisepass.",
          "Weitere kommunale Leistungen – Abfall, Gebühren, Genehmigungen.",
        ],
        steps: [
          {
            title: "Terminvergabe der Gemeinde prüfen",
            body: "Gemeinden nutzen unterschiedliche Buchungssysteme, manche bieten zu bestimmten Zeiten auch Termine ohne Reservierung an. Vor dem Besuch die Gemeindeseite prüfen.",
          },
          {
            title: "Genau festlegen, welche Leistung benötigt wird",
            body: "Die Schalter sind nach Leistungen getrennt. Wer die falsche Leistung anfragt, wird zurückgeschickt. Die Leistungsliste und die benötigten Unterlagen vorher prüfen.",
          },
          {
            title: "Alle Unterlagen im Original mitbringen",
            body: "In der Regel sind Originale verlangt, keine Kopien. Für Beglaubigungen das Dokument und die Kopie mitbringen. Für die Anmeldung Pass und Vermieterbestätigung.",
          },
          {
            title: "Gebühr zahlen und Bescheinigung mitnehmen",
            body: "Gebühren werden am Schalter gezahlt, je nach Gemeinde bar oder mit Karte. Die Bescheinigung wird bei den meisten Leistungen sofort ausgehändigt.",
          },
        ],
        documents: [
          "Gültiger Pass oder Personalausweis",
          "Wohnungsgeberbestätigung bei der Anmeldung",
          "Ausgefüllte Formulare der jeweiligen Leistung",
          "Bei Beglaubigung: Original und Kopie",
          "Zahlungsmittel für die Gebühr",
        ],
        pitfalls: [
          "Ohne Termin erscheinen, wenn die Gemeinde nur mit Termin arbeitet. Das ist der häufigste verlorene Vormittag.",
          "Kopien statt Originale mitbringen. Kopien werden nicht als Identitätsnachweis anerkannt.",
          "Zum falschen Bürgeramt gehen. Die Zuständigkeit ist strikt örtlich gebunden.",
          "Ein Dokument unterschreiben, ohne den Inhalt zu verstehen. Am Schalter nachfragen, wenn etwas unklar ist.",
        ],
        faq: [
          {
            question: "Was ist der Unterschied zwischen Bürgeramt und Rathaus?",
            answer:
              "Das Rathaus ist das Verwaltungsgebäude der Gemeinde, in dem oft auch das Bürgeramt sitzt. Das Bürgeramt ist die konkrete Stelle für Bürgerleistungen. In großen Städten kann es in einem eigenen Gebäude liegen.",
          },
          {
            question: "Kann ich in eine andere Gemeinde gehen, wenn dort Termine frei sind?",
            answer:
              "Für die Anmeldung des Wohnsitzes nein – sie ist an deinen Wohnort gebunden. Für andere Leistungen wie den Pass ist es teils möglich, wenn die Gemeinde eine Leistung für alle anbietet. Vorher prüfen.",
          },
          {
            question: "Brauche ich Übersetzungen meiner Dokumente?",
            answer:
              "Ist das Dokument nicht auf Deutsch, wird häufig eine Übersetzung durch eine beeidigte Übersetzungskraft verlangt. Für Pass und Personalausweis gilt das meist nicht, weil das Format international ist.",
          },
        ],
      },
    },
    sources: [
      { label: "Bundesmeldegesetz (BMG)", url: "https://www.gesetze-im-internet.de/bmg/" },
    ],
  },
  {
    slug: "rundfunkbeitrag",
    category: "everyday",
    germanName: "Rundfunkbeitrag",
    keywords: {
      bg: ["rundfunkbeitrag", "GEZ", "такса радио и телевизия", "ARD ZDF"],
      de: ["Rundfunkbeitrag", "GEZ", "Beitragsservice", "Rundfunkbeitrag anmelden"],
    },
    content: {
      bg: {
        title: "Rundfunkbeitrag — таксата за радио и телевизия",
        summary:
          "Rundfunkbeitrag е задължителна месечна такса за всяко жилище в Германия, независимо дали ползваш радио или телевизия.",
        intro:
          "Rundfunkbeitrag е вноската за публичното радио и телевизия ARD, ZDF и Deutschlandradio. Тя се дължи за всяко жилище, а не за лице или за устройство. Дължи се от момента на нанасяне, независимо дали имаш телевизор или радио. Събира се от Beitragsservice, който изпраща и напомняния при неплащане.",
        scope: [
          "Регистрира жилището и определя дължимата месечна вноска.",
          "Освобождава от вноска при определени социални помощи.",
          "Приспада се между съквартиранти, ако само един е регистриран.",
          "Изпраща напомняния и предава вземанията за принудително събиране.",
        ],
        steps: [
          {
            title: "Регистрирай жилището след нанасяне",
            body: "Регистрацията се прави онлайн, по пощата или по телефон. Дължи се от месеца на нанасяне. Всяко жилище се регистрира веднъж, дори ако в него живеят няколко души.",
          },
          {
            title: "Посочи съквартирант за приспадане",
            body: "Ако в жилището живеят няколко души, вноската се дължи само веднъж. Останалите се регистрират и посочват номера на вноската на първия, за да не плащат повторно.",
          },
          {
            title: "Провери за право на освобождаване",
            body: "Получателите на определени помощи могат да бъдат освободени от вноската. Освобождаването не е автоматично — трябва да се заяви с доказателство от институцията.",
          },
          {
            title: "Плати навреме и пази номера на вноската",
            body: "Вноската се плаща тримесечно, на половин година или годишно. Номерът на вноската е нужен при всяка промяна и при възражение.",
          },
        ],
        documents: [
          "Адрес и данни за жилището",
          "Документ за самоличност",
          "При освобождаване: удостоверение от институцията, изплащаща помощта",
          "При приспадане между съквартиранти: номерът на вноската на регистрирания",
        ],
        pitfalls: [
          "Да не регистрираш жилището. Неплащането води до напомняния и до принудително събиране с допълнителни разходи.",
          "Да плащаш, без да знаеш, че вноската е вече платена за жилището от съквартирант.",
          "Да пропуснеш да заявиш освобождаване, ако получаваш помощ. Освобождаването не се дава автоматично.",
          "Да изхвърлиш писмата от Beitragsservice. Всяко писмо носи номер и срок, които трябва да се проследят.",
        ],
        faq: [
          {
            question: "Дължа ли вноската, ако не ползвам радио или телевизия?",
            answer:
              "Да. Вноската е обвързана с жилището, а не с ползването или с устройство. Тя се дължи от момента на нанасяне, независимо от това какво притежаваш.",
          },
          {
            question: "Как се разделя вноската между съквартиранти?",
            answer:
              "Вноската се дължи веднъж на жилище. Един от живеещите се регистрира и плаща, а останалите се регистрират и посочват номера на неговата вноска, за да бъдат освободени.",
          },
          {
            question: "Мога ли да бъда освободен от вноската?",
            answer:
              "Да, при определени социални помощи и при определени условия за хора с увреждания. Освобождаването се заявява с доказателство от институцията и се прилага от месеца на подаване.",
          },
        ],
      },
      de: {
        title: "Rundfunkbeitrag – der Beitrag für Rundfunk und Fernsehen",
        summary:
          "Der Rundfunkbeitrag ist ein monatlicher Pflichtbeitrag je Wohnung in Deutschland, unabhängig davon, ob du Radio oder Fernsehen nutzt.",
        intro:
          "Der Rundfunkbeitrag ist der Beitrag für das öffentlich-rechtliche Angebot von ARD, ZDF und Deutschlandradio. Er fällt je Wohnung an, nicht je Person und nicht je Gerät. Er wird ab dem Einzug geschuldet, unabhängig davon, ob du ein Gerät besitzt. Er wird vom Beitragsservice eingezogen, der auch bei Zahlungsverzug mahnt.",
        scope: [
          "Meldet die Wohnung an und legt den monatlichen Beitrag fest.",
          "Befreit unter bestimmten Sozialleistungen von der Beitragspflicht.",
          "Wird bei Wohngemeinschaften verrechnet, wenn nur eine Person angemeldet ist.",
          "Versendet Mahnungen und gibt Forderungen an die Vollstreckung ab.",
        ],
        steps: [
          {
            title: "Wohnung nach dem Einzug anmelden",
            body: "Die Anmeldung erfolgt online, per Post oder telefonisch. Der Beitrag wird ab dem Einzugsmonat geschuldet. Jede Wohnung wird einmal angemeldet, auch wenn mehrere Personen darin leben.",
          },
          {
            title: "Mitbewohner zur Verrechnung benennen",
            body: "Leben mehrere Personen in der Wohnung, fällt der Beitrag nur einmal an. Die übrigen melden sich und nennen das Beitragskonto der angemeldeten Person, damit keine doppelte Zahlung entsteht.",
          },
          {
            title: "Befreiungsanspruch prüfen",
            body: "Empfänger bestimmter Leistungen können befreit werden. Die Befreiung erfolgt nicht automatisch – sie muss mit Nachweis des Trägers beantragt werden.",
          },
          {
            title: "Rechtzeitig zahlen und Beitragsnummer aufbewahren",
            body: "Der Beitrag wird vierteljährlich, halbjährlich oder jährlich gezahlt. Die Beitragsnummer wird bei jeder Änderung und beim Widerspruch benötigt.",
          },
        ],
        documents: [
          "Adresse und Angaben zur Wohnung",
          "Identitätsnachweis",
          "Bei Befreiung: Bescheinigung des leistenden Trägers",
          "Bei Verrechnung in der Wohngemeinschaft: Beitragskonto der angemeldeten Person",
        ],
        pitfalls: [
          "Die Wohnung nicht anmelden. Zahlungsverzug führt zu Mahnungen und zur Vollstreckung mit Zusatzkosten.",
          "Zahlen, ohne zu wissen, dass der Beitrag für die Wohnung bereits von einer Mitbewohnerin gezahlt wird.",
          "Die Befreiung nicht beantragen, obwohl eine Leistung bezogen wird. Die Befreiung wird nicht automatisch erteilt.",
          "Schreiben des Beitragsservice wegwerfen. Jeder Brief enthält Nummer und Frist, die nachgehalten werden müssen.",
        ],
        faq: [
          {
            question: "Muss ich zahlen, wenn ich kein Radio oder Fernsehen nutze?",
            answer:
              "Ja. Der Beitrag knüpft an die Wohnung an, nicht an die Nutzung oder das Gerät. Er wird ab dem Einzug geschuldet, unabhängig davon, was du besitzt.",
          },
          {
            question: "Wie wird der Beitrag in einer Wohngemeinschaft geteilt?",
            answer:
              "Der Beitrag fällt einmal je Wohnung an. Eine Person meldet sich an und zahlt; die übrigen melden sich und nennen deren Beitragskonto, um befreit zu werden.",
          },
          {
            question: "Kann ich von der Beitragspflicht befreit werden?",
            answer:
              "Ja, bei bestimmten Sozialleistungen und unter bestimmten Voraussetzungen für Menschen mit Behinderung. Die Befreiung wird mit Nachweis des Trägers beantragt und gilt ab dem Antragsmonat.",
          },
        ],
      },
    },
    sources: [
      { label: "Rundfunkbeitragsstaatsvertrag (RBStV)", url: "https://www.gesetze-im-internet.de/rbstv/" },
      { label: "ARD ZDF Deutschlandradio Beitragsservice", url: "https://www.rundfunkbeitrag.de/" },
    ],
  },
  {
    slug: "mietvertrag",
    category: "everyday",
    germanName: "Mietvertrag",
    keywords: {
      bg: ["mietvertrag", "наемен договор Германия", "наем квартира", "Kündigung наем"],
      de: ["Mietvertrag", "Wohnung mieten", "Kündigung Mietvertrag", "Mietkaution"],
    },
    content: {
      bg: {
        title: "Mietvertrag — наемът на жилище в Германия",
        summary:
          "Mietvertrag е договорът за наем на жилище: определя наема, депозита, срока за предизвестие и правата и задълженията на двете страни.",
        intro:
          "Договорът за наем в Германия е силно защитен в полза на наемателя от Bürgerliches Gesetzbuch. Обичайната форма е неограничен договор със срок за предизвестие, а не срочен договор. Депозитът е ограничен по закон, а повишаването на наема е обвързано с правила и с местния сравнителен наем.",
        scope: [
          "Определя наема, аванса за разходи и депозита.",
          "Определя срока за предизвестие и условията за прекратяване.",
          "Определя кой поема ремонти и дребни поправки.",
          "Урежда предаването на жилището и протокола при напускане.",
        ],
        steps: [
          {
            title: "Прочети договора преди подписване",
            body: "Провери наема, аванса за разходи (Nebenkosten), депозита и дали е посочен срок. Не подписвай с празни полета или с допълнения, които не разбираш.",
          },
          {
            title: "Плати депозита и поискай разписка",
            body: "Депозитът е обичайно до три месечни наема и може да се плати на вноски. Искай разписка за всяко плащане, защото при напускане се приспада от него.",
          },
          {
            title: "Направи протокол при нанасяне",
            body: "Преди да внесеш мебели, документирай състоянието — снимки и подписан протокол със собственика. Без него щетите се приписват на теб при напускане.",
          },
          {
            title: "Спази срока при предизвестие",
            body: "При неограничен договор предизвестието обикновено е три месеца. Изпращай го писмено и с доказателство за получаване, защото срокът тече от получаването.",
          },
        ],
        documents: [
          "Договорът за наем и всички допълнения",
          "Протокол за състоянието при нанасяне",
          "Разписки за депозита и за платения наем",
          "Документи за аванса за разходи и годишните отчети",
          "Доказателство за изпратено предизвестие",
        ],
        pitfalls: [
          "Да подпишеш договор със срочен срок, без да разбереш последиците. Срочният договор обвързва до края и не може да се прекрати лесно.",
          "Да не направиш протокол при нанасяне. Тогава всяка стара щета се приспада от депозита.",
          "Да изпратиш предизвестие без доказателство за получаване. Спорът за датата може да струва месеци наем.",
          "Да не оспориш годишния отчет за разходите в срока. След срока отчетът се приема за съгласуван.",
        ],
        faq: [
          {
            question: "Какъв е обичайният срок за предизвестие?",
            answer:
              "При неограничен договор за жилище обичайно е три месеца. Предизвестието трябва да е писмено и да пристигне до края на месеца, за да започне да тече срокът.",
          },
          {
            question: "Може ли собственикът да вдигне наема по всяко време?",
            answer:
              "Не. Повишаването е обвързано с правила, обикновено с местния сравнителен наем и с ограничения за честотата. Искане за повишаване трябва да е обосновано и писмено.",
          },
          {
            question: "Кой плаща дребните ремонти в жилището?",
            answer:
              "Зависи от договора. Клаузата за дребни ремонти е обичайна, но има граници по съдебна практика. Ако в договора няма такава клауза, дребните ремонти обикновено са за сметка на собственика.",
          },
        ],
      },
      de: {
        title: "Mietvertrag – Wohnraum in Deutschland mieten",
        summary:
          "Der Mietvertrag regelt Miete, Kaution, Kündigungsfrist und die Rechte und Pflichten beider Seiten.",
        intro:
          "Der Mietvertrag ist in Deutschland durch das Bürgerliche Gesetzbuch stark zugunsten der Mieterseite geschützt. Üblich ist der unbefristete Vertrag mit Kündigungsfrist, nicht der befristete. Die Kaution ist gesetzlich begrenzt, und Mieterhöhungen sind an Regeln und an die ortsübliche Vergleichsmiete gebunden.",
        scope: [
          "Legt Miete, Nebenkostenvorauszahlung und Kaution fest.",
          "Legt Kündigungsfrist und Beendigungsvoraussetzungen fest.",
          "Regelt, wer Reparaturen und Kleinreparaturen trägt.",
          "Regelt Rückgabe und Übergabeprotokoll bei Auszug.",
        ],
        steps: [
          {
            title: "Vertrag vor der Unterschrift lesen",
            body: "Miete, Nebenkostenvorauszahlung, Kaution und eine etwaige Befristung prüfen. Nicht mit leeren Feldern oder mit unverständlichen Zusätzen unterschreiben.",
          },
          {
            title: "Kaution zahlen und Quittung verlangen",
            body: "Die Kaution beträgt üblicherweise bis zu drei Monatsmieten und kann in Raten gezahlt werden. Für jede Zahlung eine Quittung verlangen, da sie beim Auszug verrechnet wird.",
          },
          {
            title: "Bei Einzug ein Protokoll erstellen",
            body: "Vor dem Einbringen von Möbeln den Zustand dokumentieren – Fotos und ein unterschriebenes Protokoll mit der Vermieterseite. Ohne Protokoll werden Schäden beim Auszug dir zugerechnet.",
          },
          {
            title: "Kündigungsfrist einhalten",
            body: "Bei unbefristeten Verträgen beträgt die Frist meist drei Monate. Schriftlich und mit Zustellnachweis kündigen, denn die Frist läuft ab Zugang.",
          },
        ],
        documents: [
          "Mietvertrag und alle Zusatzvereinbarungen",
          "Übergabeprotokoll bei Einzug",
          "Quittungen über Kaution und gezahlte Miete",
          "Unterlagen zur Nebenkostenvorauszahlung und zu Jahresabrechnungen",
          "Nachweis über die zugestellte Kündigung",
        ],
        pitfalls: [
          "Einen befristeten Vertrag unterschreiben, ohne die Folgen zu kennen. Ein befristeter Vertrag bindet bis zum Ende.",
          "Kein Protokoll bei Einzug erstellen. Dann wird jeder Altschaden von der Kaution abgezogen.",
          "Kündigen ohne Zustellnachweis. Der Streit über das Datum kann Monatsmieten kosten.",
          "Der Jahresabrechnung nicht fristgerecht widersprechen. Danach gilt sie als anerkannt.",
        ],
        faq: [
          {
            question: "Welche Kündigungsfrist ist üblich?",
            answer:
              "Bei unbefristeten Wohnraummietverträgen sind es in der Regel drei Monate. Die Kündigung muss schriftlich zugehen und bis Monatsende eingehen, damit die Frist zu laufen beginnt.",
          },
          {
            question: "Darf der Vermieter die Miete jederzeit erhöhen?",
            answer:
              "Nein. Erhöhungen sind an Regeln gebunden, meist an die ortsübliche Vergleichsmiete und an Begrenzungen der Häufigkeit. Ein Erhöhungsverlangen muss begründet und schriftlich sein.",
          },
          {
            question: "Wer zahlt Kleinreparaturen in der Wohnung?",
            answer:
              "Das hängt vom Vertrag ab. Eine Kleinreparaturklausel ist üblich, unterliegt aber Grenzen der Rechtsprechung. Fehlt eine solche Klausel, trägt der Vermieter die Kleinreparaturen in der Regel selbst.",
          },
        ],
      },
    },
    sources: [
      { label: "BGB, §§ 535 ff. Mietvertrag", url: "https://www.gesetze-im-internet.de/bgb/" },
      { label: "BGB, § 573 Kündigung des Vermieters", url: "https://www.gesetze-im-internet.de/bgb/__573.html" },
    ],
  },
  {
    slug: "bankkonto",
    category: "everyday",
    germanName: "Bankkonto",
    keywords: {
      bg: ["банкова сметка Германия", "Girokonto", "откриване на сметка", "SEPA"],
      de: ["Girokonto", "Bankkonto eröffnen", "SEPA-Lastschrift", "Schufa"],
    },
    content: {
      bg: {
        title: "Bankkonto — Girokonto в Германия",
        summary:
          "Girokonto е разплащателната сметка, без която в Германия не може да се получава заплата, да се плащат наем и вноски или да се тегли от банкомат.",
        intro:
          "Girokonto е основната разплащателна сметка. Заплатата се превежда по нея, наемът и вноските се удържат от нея чрез SEPA-превод или SEPA-директно дебитиране. Откриването иска идентификация и адрес, а много банки проверяват и кредитна информация. От 2016 г. при смяна на банка преместването на сметката може да се възложи на новата банка.",
        scope: [
          "Получаване на заплата, помощи и възстановявания.",
          "Плащане на наем, осигуровки и сметки чрез превод или директен дебит.",
          "Теглене в брой и плащане с карта.",
          "База за договори за телефон, интернет и застраховки.",
        ],
        steps: [
          {
            title: "Избери банка и вид сметка",
            body: "Сравни месечната такса, условията за безплатна сметка, достъпа до банкомати и езика на обслужване. Някои банки искат определен доход за безплатна сметка.",
          },
          {
            title: "Направи идентификация",
            body: "Идентификацията се прави в клон, по видео или чрез пощенска процедура. За нея са нужни валиден документ и адрес. Без идентификация сметката остава блокирана.",
          },
          {
            title: "Подпиши договора и получи IBAN",
            body: "След идентификацията получаваш IBAN — международния номер на сметката. Той се съобщава на работодателя и на всички, които извършват плащания към теб.",
          },
          {
            title: "Настрой директни дебити и внимавай с овърдрафта",
            body: "Наемът и сметките се плащат чрез SEPA-Lastschrift, който изисква разрешение. Овърдрафтът е удобен, но носи лихва, затова задай лимит или го изключи.",
          },
        ],
        documents: [
          "Валиден паспорт или лична карта",
          "Meldebescheinigung или доказателство за адрес",
          "Данъчен идентификатор при поискване",
          "При определени сметки: доказателство за доход",
        ],
        pitfalls: [
          "Да оставиш сметката неизползвана и да не забележиш месечната такса. Таксите се удържат и при нулево салдо.",
          "Да позволиш директен дебит без проверка на сумата. Оспорването има срок, който трябва да се спази.",
          "Да приемеш овърдрафт по подразбиране и да плащаш висока лихва върху малки суми.",
          "Да затвориш старата сметка, преди заплатата и вноските да са прехвърлени към новата.",
        ],
        faq: [
          {
            question: "Мога ли да открия сметка без адресна регистрация?",
            answer:
              "Някои банки приемат и без Meldebescheinigung, но повечето изискват адрес. Регистрацията на адрес улеснява значително откриването и поддържането на сметка.",
          },
          {
            question: "Какво е Schufa и влияе ли на откриването на сметка?",
            answer:
              "Schufa е частна информационна система за кредитна надеждност. Много банки проверяват информация там при овърдрафт или кредит. Основна разплащателна сметка се дава и без положителна справка, но с ограничени функции.",
          },
          {
            question: "Мога ли да преместя сметката си в друга банка без проблеми?",
            answer:
              "Да. От 2016 г. новата банка е длъжна да извърши преместването по заявка: прехвърля плащанията и съобщава на платещите. Услугата е безплатна и се извършва в определен срок.",
          },
        ],
      },
      de: {
        title: "Bankkonto – das Girokonto in Deutschland",
        summary:
          "Das Girokonto ist das Zahlungskonto, ohne das in Deutschland kein Gehalt, keine Miete und keine Beiträge abgewickelt werden können.",
        intro:
          "Das Girokonto ist das zentrale Zahlungskonto. Das Gehalt wird darauf überwiesen, Miete und Beiträge werden per SEPA-Überweisung oder SEPA-Lastschrift davon abgebucht. Die Eröffnung verlangt Identifikation und Adresse, viele Banken prüfen zusätzlich die Bonität. Seit 2016 kann der Kontowechsel bei einer anderen Bank beauftragt werden.",
        scope: [
          "Empfang von Gehalt, Leistungen und Erstattungen.",
          "Zahlung von Miete, Beiträgen und Rechnungen per Überweisung oder Lastschrift.",
          "Bargeldabhebung und Kartenzahlung.",
          "Grundlage für Verträge zu Telefon, Internet und Versicherungen.",
        ],
        steps: [
          {
            title: "Bank und Kontomodell wählen",
            body: "Monatliche Gebühr, Bedingungen für ein kostenloses Konto, Zugang zu Geldautomaten und Beratungssprache vergleichen. Manche Banken verlangen ein Mindesteinkommen für ein kostenloses Konto.",
          },
          {
            title: "Identifikation durchführen",
            body: "Die Identifikation erfolgt in der Filiale, per Video oder über das Postverfahren. Nötig sind ein gültiger Ausweis und eine Adresse. Ohne Identifikation bleibt das Konto gesperrt.",
          },
          {
            title: "Vertrag unterschreiben und IBAN erhalten",
            body: "Nach der Identifikation erhältst du die IBAN. Sie wird dem Arbeitgeber und allen mitgeteilt, die Zahlungen an dich leisten.",
          },
          {
            title: "Lastschriften einrichten und Dispo prüfen",
            body: "Miete und Rechnungen laufen über SEPA-Lastschrift, die eine Ermächtigung erfordert. Der Dispokredit ist bequem, kostet aber Zinsen – Limit setzen oder ausschließen.",
          },
        ],
        documents: [
          "Gültiger Pass oder Personalausweis",
          "Meldebescheinigung oder Adressnachweis",
          "Steueridentifikationsnummer auf Anfrage",
          "Bei bestimmten Konten: Einkommensnachweis",
        ],
        pitfalls: [
          "Das Konto ungenutzt lassen und die Monatsgebühr übersehen. Gebühren fallen auch bei Nullsaldo an.",
          "Eine Lastschrift ohne Prüfung des Betrags zulassen. Für den Widerspruch gilt eine Frist, die eingehalten werden muss.",
          "Den Dispo standardmäßig annehmen und hohe Zinsen auf kleine Beträge zahlen.",
          "Das alte Konto schließen, bevor Gehalt und Abbuchungen auf das neue umgestellt sind.",
        ],
        faq: [
          {
            question: "Kann ich ein Konto ohne Anmeldung eröffnen?",
            answer:
              "Einige Banken akzeptieren es ohne Meldebescheinigung, die meisten verlangen jedoch eine Adresse. Die Anmeldung des Wohnsitzes erleichtert die Eröffnung und Führung des Kontos deutlich.",
          },
          {
            question: "Was ist die Schufa und wirkt sie sich auf die Kontoeröffnung aus?",
            answer:
              "Die Schufa ist eine private Auskunftei zur Kreditwürdigkeit. Viele Banken prüfen sie bei Dispo oder Kredit. Ein Basiskonto wird auch ohne positive Auskunft erteilt, dann mit eingeschränkten Funktionen.",
          },
          {
            question: "Kann ich mein Konto problemlos zu einer anderen Bank wechseln?",
            answer:
              "Ja. Seit 2016 muss die neue Bank den Wechsel auf Antrag durchführen: Sie überträgt Zahlungen und informiert Zahlungspartner. Der Service ist kostenlos und erfolgt innerhalb einer festgelegten Frist.",
          },
        ],
      },
    },
    sources: [
      { label: "BGB, §§ 675c ff. Zahlungsdienste", url: "https://www.gesetze-im-internet.de/bgb/" },
      { label: "Bundesbank — Kontowechsel", url: "https://www.bundesbank.de/" },
    ],
  },
]
