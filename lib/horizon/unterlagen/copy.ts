import type { Locale } from "@/lib/i18n/dictionaries"
import type { DocumentKind, NextAction, RiskState } from "./classify"
import type { DeadlineEvidenceKind } from "./deadline"

/**
 * P16 copy, in the two active UI languages.
 *
 * Kept beside the engine for the same reason as P12–P15: the strings are coupled
 * to the engine's vocabulary, so a `Record<DocumentKind, …>` turns an unlabelled
 * kind into a compile error rather than a raw key appearing in the UI.
 *
 * The risk wording is the sensitive part. Each state describes what was *checked*,
 * not what is *true*: `no_obvious_signals` never says a document is safe, and
 * `signals_detected` never says the sender is fraudulent.
 */
export type UnterlagenCopy = {
  heading: string
  intro: string
  classificationHeading: string
  classificationEvidence: string
  classificationUnclear: string
  classificationCorrect: string
  kinds: Record<DocumentKind, string>
  deadlineHeading: string
  deadlineKinds: Record<DeadlineEvidenceKind, string>
  deadlineQuote: string
  deadlineRule: string
  deadlineVerify: string
  riskHeading: string
  riskStates: Record<RiskState, string>
  riskSignalsHeading: string
  riskQuoteLabel: string
  nextActionHeading: string
  nextActions: Record<NextAction, string>
  languageHeading: string
  languageNote: string
  translate: string
  translationPending: string
  translateUnavailable: string
  explanationHeading: string
  noExplanationYet: string
  askMissingHeading: string
  askMissingNote: string
  missingFactKeys: string
}

export const unterlagenCopy: Record<Locale, UnterlagenCopy> = {
  de: {
    heading: "Unterlagen erklären",
    intro:
      "HORIZON liest das Dokument, benennt die Art, sucht Fristen nur im Text und beschreibt Risiken mit ihrer Unsicherheit. Es wird nichts ergänzt, was nicht im Dokument steht.",
    classificationHeading: "Erkannte Art",
    classificationEvidence: "Belegstelle im Dokument",
    classificationUnclear:
      "Die Art ließ sich nicht sicher bestimmen. HORIZON rät nicht, sondern bittet dich, die Art selbst zu bestätigen.",
    classificationCorrect: "Zutreffende Art wählen",
    kinds: {
      behoerdenbescheid: "Behördenbescheid",
      rechnung: "Rechnung",
      vertrag: "Vertrag",
      kuendigung: "Kündigung",
      mahnung: "Mahnung",
      antrag: "Antrag",
      formular: "Formular",
      mitteilung: "Mitteilung",
      unclear: "Nicht sicher bestimmbar",
    },
    deadlineHeading: "Frist",
    deadlineKinds: {
      printed: "Im Dokument abgedruckt",
      calculated: "Aus einer im Dokument genannten Frist berechnet",
      unknown: "Keine Frist belegt",
    },
    deadlineQuote: "Belegstelle",
    deadlineRule: "Angewandte Regel",
    deadlineVerify:
      "Diese Frist ist berechnet und muss von dir geprüft werden. Sie kann durch andere Stellen im Dokument eingeschränkt sein.",
    riskHeading: "Risikohinweise",
    riskStates: {
      signals_detected:
        "Es wurden Formulierungen gefunden, die auf Druck oder bekannte Betrugsmuster hindeuten können. Das ist kein Urteil über den Absender — bitte prüfe die zitierten Stellen selbst.",
      no_obvious_signals:
        "Es wurden keine der geprüften Muster gefunden. Das ist keine Freigabe: auch ohne erkannte Muster kann ein Schreiben problematisch sein.",
      cannot_determine:
        "Es liegt zu wenig Text vor, um Formulierungen zu prüfen. Eine Aussage über Risiken ist damit nicht möglich.",
    },
    riskSignalsHeading: "Gefundene Stellen",
    riskQuoteLabel: "Zitat",
    nextActionHeading: "Empfohlener nächster Schritt",
    nextActions: {
      verify_deadline: "Frist prüfen und bestätigen",
      review_risk_signals: "Zitierte Stellen prüfen",
      confirm_facts: "Offene Angaben bestätigen",
      prepare_reply: "Antwort vorbereiten",
      translate_document: "Dokument übersetzen",
      no_action_evident: "Kein Schritt erkennbar",
    },
    languageHeading: "Sprache",
    languageNote:
      "Amtliche deutsche Dokumente bleiben im Original. HORIZON erklärt sie, übersetzt sie aber nicht in eine amtliche Fassung.",
    translate: "Übersetzung anfordern",
    translationPending: "Übersetzung wird vorbereitet …",
    translateUnavailable:
      "Übersetzung ist derzeit nicht verfügbar. Das Dokument bleibt im Original nutzbar.",
    explanationHeading: "Erklärung in einfacher Sprache",
    noExplanationYet:
      "Noch keine Erklärung erstellt. Die Erklärung stützt sich ausschließlich auf den Dokumenttext.",
    askMissingHeading: "Offene Fragen",
    askMissingNote:
      "HORIZON fragt nur, was zur Einordnung fehlt. Nicht beantwortete Fragen gelten nicht als Zustimmung.",
    missingFactKeys: "Fehlende Angaben",
  },
  bg: {
    heading: "Обяснение на документи",
    intro:
      "HORIZON прочита документа, посочва вида му, търси срокове само в текста и описва рисковете заедно с тяхната несигурност. Не се добавя нищо, което не е в документа.",
    classificationHeading: "Разпознат вид",
    classificationEvidence: "Място в документа",
    classificationUnclear:
      "Видът не можа да бъде определен сигурно. HORIZON не гадае, а те моли сам да потвърдиш вида.",
    classificationCorrect: "Избери правилния вид",
    kinds: {
      behoerdenbescheid: "Решение на институция",
      rechnung: "Фактура",
      vertrag: "Договор",
      kuendigung: "Прекратяване",
      mahnung: "Напомняне за плащане",
      antrag: "Заявление",
      formular: "Формуляр",
      mitteilung: "Съобщение",
      unclear: "Не може да се определи сигурно",
    },
    deadlineHeading: "Срок",
    deadlineKinds: {
      printed: "Отпечатан в документа",
      calculated: "Изчислен от посочен в документа срок",
      unknown: "Няма доказан срок",
    },
    deadlineQuote: "Място в текста",
    deadlineRule: "Приложено правило",
    deadlineVerify:
      "Този срок е изчислен и трябва да бъде проверен от теб. Други места в документа може да го ограничават.",
    riskHeading: "Сигнали за риск",
    riskStates: {
      signals_detected:
        "Открити са формулировки, които може да сочат натиск или известни схеми за измама. Това не е присъда за подателя — прегледай сам цитираните места.",
      no_obvious_signals:
        "Не са открити проверяваните схеми. Това не е разрешение: дори без открити схеми едно писмо може да е проблемно.",
      cannot_determine:
        "Има твърде малко текст за проверка на формулировки. Заключение за рискове не е възможно.",
    },
    riskSignalsHeading: "Открити места",
    riskQuoteLabel: "Цитат",
    nextActionHeading: "Препоръчана следваща стъпка",
    nextActions: {
      verify_deadline: "Провери и потвърди срока",
      review_risk_signals: "Прегледай цитираните места",
      confirm_facts: "Потвърди липсващите данни",
      prepare_reply: "Подготви отговор",
      translate_document: "Преведи документа",
      no_action_evident: "Няма ясна стъпка",
    },
    languageHeading: "Език",
    languageNote:
      "Официалните немски документи остават в оригинала. HORIZON ги обяснява, но не ги превръща в официален превод.",
    translate: "Поискай превод",
    translationPending: "Преводът се подготвя …",
    translateUnavailable:
      "Преводът в момента не е наличен. Документът остава използваем в оригинала.",
    explanationHeading: "Обяснение на прост език",
    noExplanationYet:
      "Още няма обяснение. Обяснението се основава само на текста на документа.",
    askMissingHeading: "Отворени въпроси",
    askMissingNote:
      "HORIZON пита само каквото липсва за преценка. Неотговорените въпроси не се броят за съгласие.",
    missingFactKeys: "Липсващи данни",
  },
}

export function getUnterlagenCopy(locale: Locale): UnterlagenCopy {
  return unterlagenCopy[locale]
}
