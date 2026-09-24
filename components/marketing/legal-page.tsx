"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { legalAddress, legalProfile, legalProfileMissing } from "@/lib/legal-profile"

type LegalPageType = "privacy" | "terms" | "imprint" | "affiliate" | "withdrawal"

const privacySections: Array<[string, string, string]> = [
  ["Verantwortlicher", "Verantwortlicher ist Tarifberater24, Einzelunternehmen, Inhaber Svetlozar Gitsov. Die vollständige Anschrift und die Kontaktmöglichkeiten stehen im Impressum. Die Verarbeitung erfolgt nur für die jeweils beschriebenen Zwecke.", "Администратор е Tarifberater24, Einzelunternehmen, собственик Svetlozar Gitsov. Пълният адрес и координатите за контакт са посочени в Импресума. Данните се обработват само за описаните цели."],
  ["Verarbeitungskategorien und Rechtsgrundlagen", "Verarbeitet werden insbesondere Identitäts- und Kontaktdaten, Konto- und Profildaten, Angaben zu Verträgen und Dokumenten, technische Nutzungs- und Sicherheitsdaten sowie Inhalte, die Sie in Chat, Analyse- oder Anfragefunktionen eingeben. Rechtsgrundlage ist, soweit erforderlich, Art. 6 Abs. 1 Buchst. b DSGVO für Konto, Vertrag, Dokumente, angeforderte Chat- und Dokumentenanalyse sowie notwendige vorvertragliche Anfragen. Für Sicherheit, Missbrauchsprävention und eine minimale Nachvollziehbarkeit von Sicherheitsereignissen dient Art. 6 Abs. 1 Buchst. f DSGVO nach Interessenabwägung als Rechtsgrundlage.", "Обработват се по-специално идентификационни и контактни данни, данни за акаунт и профил, информация за договори и документи, технически данни за използване и сигурност, както и съдържание, въведено от Вас в чат, анализ или заявка. Когато е необходимо, правното основание е чл. 6, пар. 1, б. б) GDPR за акаунт, договор, документи, заявен чат и анализ на документи и необходимите преддоговорни запитвания. За сигурност, предотвратяване на злоупотреби и минимална проследимост на събитията по сигурността се прилага чл. 6, пар. 1, б. е) GDPR след преценка на интересите."],
  ["Konto, Verträge und Dokumente", "Bei Registrierung und Nutzung des geschützten Bereichs verarbeitet HORIZON Konto- und Profildaten. Hochgeladene Verträge und Dokumente, daraus extrahierter Text sowie zugehörige Analyseergebnisse werden in privaten Supabase-Speichern und Datenbanktabellen abgelegt. Dies dient der Bereitstellung des persönlichen Dokumentenbereichs und der ausdrücklich angeforderten Funktionen.", "При регистрация и използване на защитената зона HORIZON обработва данни за акаунта и профила. Качени договори и документи, извлечен текст и свързаните резултати от анализа се съхраняват в частни хранилища и таблици на Supabase. Това е необходимо за личната зона с документи и изрично заявените функции."],
  ["Supabase", "Supabase wird als technischer Auftragsverarbeiter für Authentifizierung, Datenbank und private Dokumentenspeicher eingesetzt. Das Produktionsprojekt liegt in eu-central-1 (Frankfurt). Eine darüber hinausgehende EU-exklusive Verarbeitung wird nicht zugesagt. Die konkrete kontobezogene DPA-Annahme und providerseitige Lösch- oder Logeinstellungen werden hier nicht als bestätigt dargestellt.", "Supabase се използва като технически обработващ за удостоверяване, база данни и частни хранилища за документи. Production проектът се намира в eu-central-1 (Frankfurt). Не се гарантира изключителна обработка само в ЕС. Конкретното приемане на DPA за акаунта и настройките на доставчика за изтриване или логове не се представят тук като потвърдени."],
  ["Render", "Render hostet die Produktionsanwendung in Frankfurt und verarbeitet technische Anfragen, Laufzeitdaten und Anwendungslogs. Render dokumentiert zugleich mögliche US-bezogene Verarbeitung und Übermittlungen; Frankfurt-Hosting wird daher nicht als EU-only beschrieben. Für HORIZON gilt als betriebliche Vorgabe eine Aufbewahrung von Anwendungs- und Sicherheitslogs bis zu 30 Tagen oder kürzer, sofern der Provider eine kürzere Frist vorgibt.", "Render хоства production приложението във Frankfurt и обработва технически заявки, данни за изпълнение и логове на приложението. Render също документира възможна обработка и трансфери, свързани със САЩ; затова хостването във Frankfurt не се описва като EU-only. За HORIZON е одобрен срок за логове на приложението и сигурността до 30 дни или по-кратко, ако доставчикът налага по-кратък срок."],
  ["KI-Verarbeitung: Groq und Cerebras", "Wenn Sie Chat oder Dokumentenanalyse ausdrücklich nutzen, werden die dafür erforderlichen Eingaben und der erforderliche Kontext an den jeweils verwendeten KI-Dienst übermittelt. Groq wird für den authentifizierten Chat und als Fallback der Dokumentenanalyse verwendet. Global ZDR und Inference APIs ZDR sind derzeit deaktiviert; nach den aktuellen Groq-Datenkontrollen können Eingaben und Ausgaben bis zu 30 Tage für Zuverlässigkeit und Compliance gespeichert werden. Retained Customer Data wird nach Groq-Angaben in GCP-Buckets in den USA gespeichert. Cerebras kann für Dokumentenanalysen eingesetzt werden, weil der Produktionsschlüssel konfiguriert ist. Für Cerebras werden keine bestätigte EU-Verarbeitungsregion und keine bestätigte kontobezogene DPA-Annahme behauptet. Analyseergebnisse werden zusammen mit dem zugehörigen Dokument oder Fall in HORIZON gespeichert. Es gibt keine automatisierten rechtlich bindenden Entscheidungen.", "Когато изрично използвате чат или анализ на документи, необходимите въведени данни и контекст се предават към използваната AI услуга. Groq се използва за удостоверения чат и като резервен доставчик за анализ на документи. Global ZDR и Inference APIs ZDR в момента са изключени; според текущите контроли на Groq входът и изходът могат да се пазят до 30 дни за надеждност и съответствие. По данни на Groq задържаните клиентски данни се съхраняват в GCP buckets в САЩ. Cerebras може да се използва за анализ на документи, тъй като production ключът е конфигуриран. За Cerebras не се твърдят потвърден EU processing region или потвърдено приемане на DPA за акаунта. Резултатите от анализа се съхраняват с документа или случая в HORIZON. Не се вземат автоматизирани правно обвързващи решения."],
  ["Internationale Datenübermittlungen", "Je nach eingesetztem Dienst können Daten außerhalb des Europäischen Wirtschaftsraums verarbeitet oder dorthin übermittelt werden. Render dokumentiert US-bezogene Verarbeitung bzw. Transfermöglichkeiten; Groq dokumentiert US-Speicherung für retained Customer Data. Für Cerebras ist die konkrete accountbezogene Verarbeitungsregion nicht bestätigt. Eine EU-exklusive Verarbeitung wird nicht zugesagt. Maßgeblich sind die jeweils geltenden vertraglichen Transfermechanismen des tatsächlich eingesetzten Dienstes.", "В зависимост от използваната услуга данните могат да бъдат обработвани или предавани извън Европейското икономическо пространство. Render документира обработка и възможни трансфери, свързани със САЩ; Groq документира съхранение в САЩ за задържаните клиентски данни. За Cerebras конкретният processing region за акаунта не е потвърден. Не се гарантира изключителна обработка в ЕС. Прилагат се действащите договорни механизми за трансфер на реално използваната услуга."],
  ["Kontaktanfragen", "Wenn Sie das Kontaktformular nutzen, werden Name, E-Mail-Adresse und Nachricht zur Beantwortung der Anfrage in der Lead-Datenbank gespeichert. Für vorvertragliche oder von Ihnen ausdrücklich angeforderte Maßnahmen gilt Art. 6 Abs. 1 Buchst. b DSGVO; für sonstige betriebliche Korrespondenz kann Art. 6 Abs. 1 Buchst. f DSGVO nach Interessenabwägung gelten. Nicht konvertierte Leads werden sechs Monate gespeichert.", "При използване на контактната форма името, имейл адресът и съобщението се съхраняват в базата с потенциални клиенти за отговор на запитването. За преддоговорни или изрично заявени от Вас действия се прилага чл. 6, пар. 1, б. б) GDPR; за друга оперативна кореспонденция може да се прилага чл. 6, пар. 1, б. е) GDPR след преценка на интересите. Неконвертираните запитвания се пазят шест месеца."],
  ["Service-Anfragen", "Bei einer Service-Anfrage verarbeiten wir die von Ihnen eingegebenen Kontakt- und Anfragedaten zur Bearbeitung der von Ihnen angeforderten vorvertraglichen bzw. servicebezogenen Schritte auf Grundlage von Art. 6 Abs. 1 Buchst. b DSGVO. n8n ist derzeit nicht aktiv und wird nicht als aktueller Empfänger genannt. Es gibt keine Garantie für Genehmigung, Preis oder ein bestimmtes Ergebnis. Service-Anfragen werden sechs Monate nach Abschluss gespeichert.", "При service заявка обработваме въведените от Вас контактни данни и данни за заявката за поисканите от Вас преддоговорни или свързани с услугата действия на основание чл. 6, пар. 1, б. б) GDPR. n8n в момента не е активен и не се посочва като текущ получател. Не се гарантират одобрение, цена или конкретен резултат. Service заявките се пазят шест месеца след приключването им."],
  ["Dokumentenupload", "Im authentifizierten Bereich werden PDF-, JPG- und PNG-Dateien, extrahierter Text und Analyseergebnisse in privaten Supabase-Speichern verarbeitet. Ausgewählte Inhalte können an Groq oder Cerebras zur angeforderten Analyse übermittelt werden. Bitte laden Sie keine unnötigen sensiblen oder besonderen Kategorien personenbezogener Daten hoch. Dokumente, extrahierter Text und zugehörige Ergebnisse werden nutzerkontrolliert gespeichert und innerhalb von 30 Tagen nach Löschung oder Kontoschließung aus dem aktiven System gelöscht, sofern kein gesetzlicher Aufbewahrungs- oder Rechtsgrund entgegensteht.", "В удостоверената зона PDF, JPG и PNG файлове, извлечен текст и резултати от анализа се обработват в частни хранилища на Supabase. Избрано съдържание може да бъде предадено на Groq или Cerebras за заявения анализ. Не качвайте ненужни чувствителни данни или данни от специални категории. Документите, извлеченият текст и свързаните резултати се пазят под контрола на потребителя и се изтриват от активната система в рамките на 30 дни след изтриване или закриване на акаунта, освен ако няма законово основание за по-дълго съхранение."],
  ["Besondere Kategorien personenbezogener Daten", "Die Plattform ist nicht für die allgemeine Verarbeitung besonderer Kategorien personenbezogener Daten bestimmt. Bitte laden Sie solche Daten nicht unnötig hoch. Eine beabsichtigte Verarbeitung erfordert eine gesonderte Prüfung nach Art. 9 DSGVO.", "Платформата не е предназначена за обща обработка на специални категории лични данни. Не качвайте такива данни без необходимост. Умишлена обработка изисква отделна преценка по чл. 9 GDPR."],
  ["Lokale Demo-Daten", "Der nicht authentifizierte Home-Office-Demobereich kann Dokumente, Analysen und Prüfstände im localStorage dieses Browsers speichern. Diese Demo-Daten werden nicht automatisch an den Server übertragen. Sie können sie über die Demo-Funktion oder durch Löschen der Browserdaten entfernen.", "Неудостоверената Home-Office демо зона може да съхранява документи, анализи и тестови данни в localStorage на браузъра. Тези демо данни не се предават автоматично към сървъра. Можете да ги премахнете чрез демо функцията или чрез изтриване на данните на браузъра."],
  ["Cookies und Local Storage", "Für Anmeldung, Sitzungsverwaltung und Spracheinstellung werden technisch notwendige Speichertechnologien verwendet. Soweit § 25 Abs. 2 TDDDG einschlägig ist, erfolgt der Zugriff auf unbedingt erforderliche Endgerätespeicher ohne zusätzliche Einwilligung. Die Spracheinstellung wird im First-Party-Cookie finanzbg_locale mit einer Laufzeit von einem Jahr und SameSite=Lax gespeichert. Supabase Auth erstellt technisch notwendige Sitzungs-Cookies; Namen und Laufzeiten hängen von der aktiven SDK- und Sitzungskonfiguration ab und werden hier nicht erfunden. sidebar_state und home-office-demo-v1 sind im Repository als lokale Speicherwerte belegt. Nach aktuellem Implementierungs- und Prüfstand sind keine optionalen Marketing-, Analyse- oder Affiliate-Tracking-Skripte eingebunden. Eine spätere Aktivierung erfordert eine gesonderte Einwilligungs- und Rechtsprüfung.", "За вход, управление на сесията и езиковата настройка се използват технически необходими технологии за съхранение. Когато § 25, ал. 2 TDDDG е приложим, достъпът до строго необходимото съхранение на устройството се извършва без допълнително съгласие. Езиковата настройка се пази във first-party cookie finanzbg_locale за една година със SameSite=Lax. Supabase Auth създава технически необходими сесийни cookies; имената и сроковете зависят от активната SDK и конфигурацията на сесията и не се измислят тук. sidebar_state и home-office-demo-v1 са установени в repository като локални стойности. Според текущата имплементация и извършената проверка не са включени незадължителни marketing, analytics или affiliate-tracking скриптове. Бъдещо активиране изисква отделна оценка на съгласието и правното основание."],
  ["Speicherdauer", "Inaktive oder nicht konvertierte Leads werden sechs Monate gespeichert. Service-Anfragen werden sechs Monate nach Abschluss gespeichert. Konten und Profile werden während der aktiven Nutzung gespeichert und innerhalb von 30 Tagen nach Schließung oder Löschanfrage aus dem aktiven System gelöscht, sofern kein rechtlicher Aufbewahrungsgrund entgegensteht. Verträge, Dokumente, extrahierter Text und zugehörige KI-Ergebnisse werden nutzerkontrolliert gespeichert und zusammen gelöscht. Sicherheits- und Audit-Ereignisse werden zwölf Monate gespeichert. Anwendungs- und Sicherheitslogs werden 30 Tage oder kürzer nach providerseitiger Vorgabe gespeichert. Für künftige eigene Backups ist eine rollierende Aufbewahrung von 30 Tagen vorgesehen; aktuell wird keine eigene Backup-Infrastruktur zugesichert.", "Неактивните или неконвертирани потенциални клиенти се пазят шест месеца. Service заявките се пазят шест месеца след приключване. Акаунтите и профилите се пазят, докато са активни, и се изтриват от активната система в рамките на 30 дни след закриване или искане за изтриване, освен ако няма законово основание за съхранение. Договорите, документите, извлеченият текст и свързаните AI резултати се пазят под контрола на потребителя и се изтриват заедно. Събитията по сигурността и audit събитията се пазят 12 месеца. Логовете на приложението и сигурността се пазят 30 дни или по-кратко според изискване на доставчика. За бъдещи собствени архиви е предвидено rolling съхранение от 30 дни; понастоящем не се гарантира собствена backup инфраструктура."],
  ["Sicherheit und Audit-Ereignisse", "Wir verwenden Zugriffsschutz, private Speicherräume, Ratenbegrenzung und eine begrenzte Protokollierung von Sicherheitsereignissen, um die Plattform zu schützen und Missbrauch zu verhindern. Die Protokollierung dient nicht der optionalen Reichweitenmessung.", "Използваме контрол на достъпа, частни хранилища, ограничаване на заявките и ограничено записване на събития по сигурността за защита на платформата и предотвратяване на злоупотреби. Логването не служи за незадължително измерване на обхвата."],
  ["Partnerlinks", "Verlassen Sie HORIZON by VZG über einen gekennzeichneten Partnerlink, gelten die Datenschutzinformationen des jeweiligen Partners. HORIZON by VZG erhält keinen Zugriff auf den Vertrag, den Sie direkt beim Partner abschließen. Nach aktuellem Implementierungsstand werden auf HORIZON keine eigenen Affiliate-Tracking-Skripte geladen.", "При напускане на HORIZON by VZG чрез обозначен партньорски линк се прилага политиката за поверителност на съответния партньор. HORIZON by VZG няма достъп до договора, който сключвате директно с партньора. Според текущата имплементация HORIZON не зарежда собствени affiliate-tracking скриптове."],
  ["Betroffenenrechte und Beschwerde", "Sie haben nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Datenschutzanfragen können Sie über die im Impressum genannte Kontakt-E-Mail stellen. Sie können sich außerdem bei einer Datenschutzaufsichtsbehörde beschweren.", "Съгласно GDPR имате по-специално право на достъп, коригиране, изтриване, ограничаване на обработката, преносимост на данните и възражение. Искания относно лични данни можете да изпращате на имейла за контакт, посочен в Импресума. Можете също да подадете жалба до надзорен орган за защита на данните."],
]

const legalHeadingBg: Record<string, string> = {
  Verantwortlicher: "Администратор",
  "Verarbeitungskategorien und Rechtsgrundlagen": "Категории данни и правни основания",
  "Konto, Verträge und Dokumente": "Акаунт, договори и документи",
  Supabase: "Supabase",
  Render: "Render",
  "KI-Verarbeitung: Groq und Cerebras": "AI обработка: Groq и Cerebras",
  "Internationale Datenübermittlungen": "Международни трансфери на данни",
  Kontaktanfragen: "Контактни запитвания",
  "Service-Anfragen": "Service заявки",
  Dokumentenupload: "Качване на документи",
  "Besondere Kategorien personenbezogener Daten": "Специални категории лични данни",
  "Lokale Demo-Daten": "Локални демо данни",
  "Cookies und Local Storage": "Cookies и Local Storage",
  Speicherdauer: "Срокове за съхранение",
  "Sicherheit und Audit-Ereignisse": "Сигурност и audit събития",
  Partnerlinks: "Партньорски линкове",
  "Betroffenenrechte und Beschwerde": "Права на лицата и жалби",
  Anbieter: "Доставчик",
  Kontakt: "Контакт",
  "Register und Umsatzsteuer": "Регистър и ДДС",
  "Inhaltlich verantwortlich": "Отговорност за съдържанието",
  Geltungsbereich: "Обхват",
  Leistungsumfang: "Обхват на услугата",
  "Keine individuelle Beratung": "Без индивидуална консултация",
  "Pflichten der Nutzer": "Задължения на потребителите",
  Partnerangebote: "Партньорски предложения",
  Kosten: "Разходи",
  Verbraucherstreitbeilegung: "Потребителско извънсъдебно решаване на спорове",
  Kennzeichnung: "Обозначаване",
  Vergütung: "Възнаграждение",
  "Unabhängige Entscheidung": "Самостоятелно решение",
  "Externe Websites": "Външни сайтове",
  "Aktueller Stand": "Текущо положение",
  Partnerverträge: "Договори с партньори",
  "Künftige kostenpflichtige Leistungen": "Бъдещи платени услуги",
}

const content: Record<LegalPageType, { title: string; titleBg: string; intro: string; introBg?: string; sections: Array<[string, string, string?]> }> = {
  imprint: {
    title: "Impressum", titleBg: "Импресум",
    intro: "Angaben gemäß § 5 DDG.",
    introBg: "Задължителни данни за доставчика съгласно § 5 DDG.",
    sections: [
      ["Anbieter", "Die vollständigen Anbieterangaben werden aus den hinterlegten öffentlichen Unternehmensdaten geladen.", "Пълните данни за доставчика се зареждат от въведените публични фирмени данни."],
      ["Kontakt", "Für Anfragen nutzen Sie bitte die angegebene Kontakt-E-Mail oder Telefonnummer.", "За запитвания използвайте посочения имейл адрес или телефон."],
      ["Register und Umsatzsteuer", "Angaben zu Handelsregister und Umsatzsteuer-ID werden nur angezeigt, wenn sie für den Anbieter tatsächlich bestehen.", "Данни за търговски регистър и ДДС номер се показват само ако действително са приложими за доставчика."],
      ["Inhaltlich verantwortlich", "Verantwortlich für die Inhalte dieser Website ist die im Impressum angegebene verantwortliche Person.", "За съдържанието на този сайт отговаря посоченото в Импресума отговорно лице."],
    ],
  },
  privacy: {
    title: "Datenschutzerklärung", titleBg: "Политика за поверителност",
    intro: "Informationen zur Verarbeitung personenbezogener Daten bei HORIZON by VZG.",
    introBg: "Информация за обработването на лични данни при HORIZON by VZG.",
    sections: privacySections,
  },
  terms: {
    title: "Allgemeine Geschäftsbedingungen", titleBg: "Общи условия",
    intro: "Rahmenbedingungen für die Nutzung der HORIZON-Plattform durch Privatkunden.",
    introBg: "Условия за използване на платформата HORIZON от частни потребители.",
    sections: [
      ["Geltungsbereich", "Diese Bedingungen regeln die Nutzung der digitalen HORIZON-Plattform durch private Nutzerinnen und Nutzer.", "Тези условия уреждат използването на дигиталната платформа HORIZON от частни потребители."],
      ["Leistungsumfang", "HORIZON by VZG unterstützt beim Ordnen von Dokumenten, beim Anzeigen von Vertragsinformationen und bei der verständlichen Orientierung. Der konkrete Funktionsumfang kann sich je nach freigeschaltetem Bereich unterscheiden.", "HORIZON by VZG подпомага подреждането на документи, показването на информация за договори и разбираемата ориентация. Конкретният обхват зависи от активираната функционалност."],
      ["Keine individuelle Beratung", "Automatisierte Zusammenfassungen, Übersetzungen und Hinweise sind keine individuelle Rechts-, Steuer-, Anlage-, Kredit- oder Versicherungsberatung. Wichtige Entscheidungen und Fristen müssen anhand des Originals und gegebenenfalls mit einer zugelassenen Fachperson geprüft werden.", "Автоматичните резюмета, преводи и указания не представляват индивидуална правна, данъчна, инвестиционна, кредитна или застрахователна консултация. Важни решения и срокове трябва да се проверяват по оригиналните документи и при необходимост с квалифициран специалист."],
      ["Pflichten der Nutzer", "Es dürfen nur rechtmäßig bereitgestellte Inhalte hochgeladen werden. Zugangsdaten sind vertraulich zu behandeln. Unklare oder fehlerhafte Analyseergebnisse dürfen nicht ungeprüft als Grundlage für Entscheidungen verwendet werden.", "Могат да се качват само законосъобразно предоставени материали. Данните за достъп трябва да се пазят поверително. Неясни или грешни резултати от анализ не трябва да се използват без проверка като основа за решения."],
      ["Partnerangebote", "Partnerangebote sind als solche gekennzeichnet. Ein Vertrag mit einem Partner kommt ausschließlich zwischen Ihnen und dem jeweiligen Partner zustande; dessen Bedingungen und Datenschutzinformationen gelten ergänzend.", "Партньорските предложения се обозначават като такива. Договор с партньор се сключва единствено между Вас и съответния партньор; прилагат се и неговите условия и политика за поверителност."],
      ["Kosten", "Die Plattform enthält derzeit keinen eigenen Online-Checkout und HORIZON by VZG schließt derzeit keinen eigenen kostenpflichtigen B2C-Vertrag über diese Website ab. Bevor kostenpflichtige HORIZON-Leistungen online buchbar werden, werden Preis, Leistungsumfang, Vertragslaufzeit und die hierfür geltenden Verbraucherinformationen separat veröffentlicht.", "В момента платформата няма собствен онлайн checkout и чрез този сайт HORIZON by VZG не сключва собствен платен B2C договор. Преди да бъдат активирани платени HORIZON услуги онлайн, ще бъдат публикувани отделно цена, обхват, срок и приложимата потребителска информация."],
      ["Verbraucherstreitbeilegung", "Tarifberater24 erklärt derzeit keine freiwillige Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle. Eine gesetzlich verpflichtende Teilnahme bleibt hiervon unberührt.", "Tarifberater24 понастоящем не заявява доброволно участие в процедура пред потребителски помирителен орган. Евентуално законово задължително участие остава незасегнато."],
    ],
  },
  affiliate: {
    title: "Hinweis zu Partnerlinks", titleBg: "Партньорска прозрачност",
    intro: "Transparenz zu Empfehlungen und externen Partnerangeboten.",
    introBg: "Прозрачност за препоръки и външни партньорски предложения.",
    sections: [
      ["Kennzeichnung", "Links zu Partnern und Empfehlungen werden als Partnerangebot oder Werbung gekennzeichnet.", "Линковете към партньори и препоръките се обозначават като партньорско предложение или реклама."],
      ["Vergütung", "Bei einem erfolgreichen Abschluss über einen gekennzeichneten Link kann HORIZON by VZG vom Partner eine Vergütung erhalten. Für Sie entstehen durch das Anklicken eines Links allein keine zusätzlichen Kosten.", "При успешно сключване чрез обозначен линк HORIZON by VZG може да получи възнаграждение от партньора. Самото натискане на линка не води до допълнителни разходи за Вас."],
      ["Unabhängige Entscheidung", "Ob ein Angebot zu Ihnen passt, entscheiden Sie selbst anhand der Vertragsunterlagen des Partners. HORIZON by VZG gibt keine individuelle Finanz-, Versicherungs-, Kredit- oder Rechtsberatung.", "Вие сами преценявате дали дадено предложение е подходящо според документите на партньора. HORIZON by VZG не предоставя индивидуална финансова, застрахователна, кредитна или правна консултация."],
      ["Externe Websites", "Für Preise, Verfügbarkeit, Vertragsabschluss und Datenschutz auf Partnerseiten ist ausschließlich der jeweilige Partner verantwortlich.", "За цени, наличност, сключване на договор и защита на данните в сайтовете на партньорите отговаря съответният партньор."],
    ],
  },
  withdrawal: {
    title: "Widerruf und Verbraucherinformationen", titleBg: "Отказ и информация за потребители",
    intro: "Hinweise zu Verträgen mit HORIZON by VZG und zu externen Partnerangeboten.",
    introBg: "Информация за договори с HORIZON by VZG и за външни партньорски предложения.",
    sections: [
      ["Aktueller Stand", "Über diese Website wird derzeit kein eigener kostenpflichtiger Vertrag mit HORIZON by VZG online abgeschlossen. Deshalb gibt es aktuell kein separates Online-Widerrufsformular für HORIZON-Leistungen.", "В момента чрез този сайт не се сключва собствен платен онлайн договор с HORIZON by VZG. Поради това към момента няма отделен онлайн формуляр за отказ от HORIZON услуги."],
      ["Partnerverträge", "Für Verträge, die Sie direkt mit einem Partner schließen, gelten ausschließlich dessen Widerrufsbelehrung, Vertragsbedingungen und Kontaktwege.", "За договори, които сключвате директно с партньор, се прилагат неговите указания за отказ, договорни условия и канали за контакт."],
      ["Künftige kostenpflichtige Leistungen", "Bevor HORIZON by VZG eigene kostenpflichtige Leistungen online anbietet, werden die gesetzlich erforderlichen Verbraucherinformationen, Preise, Laufzeiten und eine passende Widerrufsbelehrung bereitgestellt.", "Преди HORIZON by VZG да предлага собствени платени услуги онлайн, ще бъдат предоставени изискуемата по закон потребителска информация, цени, срокове и подходящи указания за отказ."],
    ],
  },
}

export function LegalPage({ type }: { type: LegalPageType }) {
  const { locale } = useLanguage()
  const page = content[type]
  const isBg = locale === "bg"
  const address = legalAddress()
  const hasMissingProfile = legalProfileMissing.length > 0
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">← {isBg ? "Към началото" : "Zur Startseite"}</Link>
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-primary">{isBg ? "Правна информация" : "Rechtliche Informationen"}</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight">{isBg ? page.titleBg : page.title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{isBg ? (page.introBg ?? page.intro) : page.intro}</p>
        </header>
        {hasMissingProfile && (
          <aside className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-foreground">
            {isBg ? "Правните данни на доставчика все още не са попълнени в production configuration. Страницата не е готова за партньорски кандидатури." : "Die Pflichtangaben des Anbieters sind noch nicht in den Production-Einstellungen hinterlegt. Diese Seite ist noch nicht bereit für Partnerbewerbungen."}
          </aside>
        )}
        {type === "imprint" && (
          <section className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-xl font-semibold">{isBg ? "Данни за доставчика" : "Angaben zum Anbieter"}</h2>
            {address.length > 0 && <address className="not-italic leading-relaxed text-muted-foreground">{address.map((line) => <span className="block" key={line}>{line}</span>)}</address>}
            {legalProfile.email && <a className="text-primary hover:underline" href={`mailto:${legalProfile.email}`}>{legalProfile.email}</a>}
            {legalProfile.phone && <a className="text-primary hover:underline" href={`tel:${legalProfile.phone}`}>{legalProfile.phone}</a>}
            {legalProfile.registerCourt && legalProfile.registerNumber && <p className="text-muted-foreground">{legalProfile.registerCourt}, {legalProfile.registerNumber}</p>}
            {legalProfile.vatId && <p className="text-muted-foreground">Umsatzsteuer-ID: {legalProfile.vatId}</p>}
          </section>
        )}
        <div className="flex flex-col gap-6">
          {page.sections.map(([heading, body, bodyBg]) => <section key={heading} className="flex flex-col gap-2 border-t border-border pt-6"><h2 className="text-xl font-semibold">{isBg ? (legalHeadingBg[heading] ?? heading) : heading}</h2><p className="leading-relaxed text-muted-foreground">{isBg ? (bodyBg ?? body) : body}</p></section>)}
        </div>
      </article>
    </main>
  )
}
