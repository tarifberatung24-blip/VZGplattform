import type { Locale } from "@/lib/i18n/dictionaries"
import type { DecisionAction, NegotiationState, SavingsState, VerificationResult } from "./contract"
import type { PreferenceItem } from "./preferences"

/**
 * HORIZON NEGOTIATION copy, in both active UI languages.
 *
 * The wording is deliberately careful about the two product rules this feature
 * exists to honour. First, nothing is promised: the entry point says HORIZON can
 * analyse whether a contract *may* have optimization options, never that it will
 * lower a bill. Second, no number is shown unless it is evidenced — where a
 * comparison is missing the copy says so rather than filling the space.
 */

export type NegotiationCopy = {
  // Entry point on the contract archive
  optimizeAction: string
  entryIntro: string
  disabledNote: string
  notEligible: string
  notEligibleRegulated: string
  ineligibleCategory: string

  // Center
  centerTitle: string
  centerIntro: string
  analyze: string
  analyzing: string
  analysisFailed: string
  stateLabel: string
  decisionLabel: string
  confidence: string
  nextReview: string

  // Decision actions
  actions: Record<DecisionAction, string>
  reasons: Record<string, string>
  missing: Record<string, string>

  // Comparison
  comparisonRequired: string
  currentMonthly: string
  targetMonthly: string
  potentialMonthlySaving: string
  potentialAnnualSaving: string
  noSavingManufactured: string

  // States
  states: Record<NegotiationState, string>
  savingsStates: Record<SavingsState, string>
  verificationResults: Record<VerificationResult, string>

  // Preferences
  preferencesTitle: string
  preferencesIntro: string
  preferencesSaved: string
  preferencesSaveFailed: string
  mustKeep: string
  mayAccept: string
  mustNeverAccept: string
  /** Human labels for each preference vocabulary item. */
  preferenceItems: Record<PreferenceItem, string>
  maxExtension: string
  minSaving: string
  allowPlanChange: string
  allowAddons: string
  allowOneTimeCredit: string
  allowTemporaryDiscount: string
  save: string

  // Dossier + package
  dossierTitle: string
  dossierIntro: string
  primaryAsk: string
  fallbackAsk: string
  walkAway: string
  switchAlternative: string
  packageTitle: string
  modeSelf: string
  modeAssisted: string
  modeAutomated: string
  modeAutomatedDisabled: string
  selfIntro: string
  assistedIntro: string
  noCredentials: string

  // Assisted mode (MODE B)
  assistedHandoffTitle: string
  assistedHandoffIntro: string
  assistedQueueStatus: string
  assistedStatuses: Record<string, string>
  assistedStart: string
  assistedStarting: string
  assistedQueued: string
  assistedQueueFailed: string
  assistedAuthorizationRequired: string
  assistedNotConfigured: string
  assistedCancel: string
  assistedCancelled: string
  assistedCancelFailed: string

  // Offers
  offerTitle: string
  offerIntro: string
  offerSourceLabel: string
  pasteOffer: string
  submitOffer: string
  offerSaved: string
  offerSaveFailed: string
  old: string
  providerOffer: string
  approvedAlternative: string
  effectTitle: string
  monthlySaving: string
  twelveMonthSaving: string
  additionalBinding: string
  activationFee: string
  hardwareFee: string
  oneTimeCredit: string
  temporaryDiscount: string
  postPromotionUnknown: string
  acceptOffer: string
  counterOffer: string
  rejectOffer: string
  compareSwitch: string
  acceptBlockedPreferences: string
  acceptBlockedHash: string
  decisionRecorded: string
  decisionFailed: string

  // Verification
  verificationTitle: string
  verificationIntro: string
  verificationDue: string
  submitBill: string
  billSaved: string
  billFailed: string
  verifiedSaving: string
  verifiedMonthly: string
  verifiedAnnual: string
  notVerifiedYet: string

  // Legal / safety
  legalNote: string
  assistedLegalNote: string
  affiliateNote: string
  capitalNote: string
}

export const negotiationCopy: Record<Locale, NegotiationCopy> = {
  de: {
    optimizeAction: "Vertrag optimieren",
    entryIntro:
      "HORIZON kann analysieren, ob dein Vertrag Optimierungsoptionen haben könnte. Es wird nichts zugesagt und nichts ohne deine Freigabe getan.",
    disabledNote: "Die Vertragsoptimierung ist derzeit nicht aktiviert.",
    notEligible: "Dieser Vertrag kann derzeit nicht optimiert werden.",
    notEligibleRegulated:
      "Versicherungen und regulierte Finanzprodukte sind noch nicht freigeschaltet und werden hier nicht verhandelt.",
    ineligibleCategory: "Diese Kategorie ist für die Optimierung noch nicht aktiviert.",

    centerTitle: "Optimierungs-Center",
    centerIntro:
      "HORIZON prüft deinen Vertrag anhand der erfassten Angaben und schlägt den nächsten sinnvollen Schritt vor.",
    analyze: "Vertrag analysieren",
    analyzing: "Analyse läuft …",
    analysisFailed: "Die Analyse konnte nicht erstellt werden.",
    stateLabel: "Status",
    decisionLabel: "Empfohlener Schritt",
    confidence: "Datengrundlage",
    nextReview: "Nächste Prüfung",

    actions: {
      NEGOTIATE: "Verhandeln",
      SWITCH: "Wechseln",
      CANCEL: "Kündigen",
      WAIT: "Abwarten",
      NO_ACTION: "Kein Schritt nötig",
    },
    reasons: {
      PRICE_ABOVE_APPROVED_ALTERNATIVE: "Dein Preis liegt über einem freigegebenen Alternativangebot.",
      PRICE_ABOVE_ALTERNATIVE: "Dein Preis liegt über einem hinterlegten Alternativangebot.",
      APPROVED_ALTERNATIVE_AVAILABLE: "Ein freigegebenes Alternativangebot ist verfügbar.",
      CANCELLATION_WINDOW_OPEN: "Das Kündigungsfenster ist offen.",
      CONTRACT_ENDED: "Die Vertragslaufzeit ist beendet.",
      PROMOTION_ACTIVE: "Eine Aktion ist derzeit aktiv.",
      PROMOTION_EXPIRING_SOON: "Die Aktion läuft bald aus.",
      DOCUMENTED_PRICE_INCREASE: "Eine Preiserhöhung ist dokumentiert.",
      CUSTOMER_TENURE: "Längere Vertragsdauer als Verhandlungsgrundlage.",
      MISSING_COMPARISON_DATA: "Für einen Zielpreis fehlt ein Vergleichsangebot.",
      MISSING_CURRENT_COST: "Die aktuellen monatlichen Kosten fehlen.",
      MISSING_PROVIDER: "Der Anbieter fehlt.",
      MISSING_CANCELLATION_DEADLINE: "Die Kündigungsfrist fehlt.",
      NO_LEVERAGE_FOUND: "Kein belegter Ansatzpunkt gefunden.",
      WAIT_UNTIL_BEFORE_EXPIRY: "Vor Ablauf der Aktion erneut prüfen.",
      UNVERIFIED_CONTRACT_DATA: "Die Vertragsdaten sind noch nicht bestätigt.",
    },
    missing: {
      provider: "Anbieter",
      current_monthly_cost: "Monatliche Kosten",
      cancellation_deadline: "Kündigungsfrist",
      contract_end_date: "Vertragsende",
      comparison_offer: "Vergleichsangebot",
      contract_review: "Bestätigung der Vertragsdaten",
    },

    comparisonRequired: "Vergleichsdaten erforderlich",
    currentMonthly: "Aktuell pro Monat",
    targetMonthly: "Ziel pro Monat",
    potentialMonthlySaving: "Mögliche Ersparnis pro Monat",
    potentialAnnualSaving: "Mögliche Ersparnis pro Jahr",
    noSavingManufactured: "Ohne belegtes Vergleichsangebot zeigt HORIZON keine Ersparnis.",

    states: {
      CONTRACT: "Vertrag",
      ANALYSIS: "Analyse",
      OPPORTUNITY: "Möglichkeit",
      STRATEGY: "Strategie",
      AUTHORIZATION: "Vollmacht",
      NEGOTIATION: "Verhandlung",
      PROVIDER_RESPONSE: "Antwort des Anbieters",
      USER_REVIEW: "Deine Prüfung",
      USER_APPROVAL: "Deine Freigabe",
      CONFIRMED: "Bestätigt",
      BILL_VERIFICATION: "Rechnungsprüfung",
      VERIFIED_SAVING: "Geprüfte Ersparnis",
      MONITOR: "Beobachtung",
    },
    savingsStates: {
      POTENTIAL: "Möglich",
      OFFERED: "Angeboten",
      CONFIRMED: "Bestätigt",
      VERIFIED: "Geprüft",
    },
    verificationResults: {
      pending: "Offen",
      VERIFIED: "Geprüft",
      MISMATCH: "Abweichung",
      NOT_YET_EFFECTIVE: "Noch nicht wirksam",
    },

    preferencesTitle: "Deine Vorgaben",
    preferencesIntro:
      "Lege vorher fest, was bleiben muss und was du akzeptieren darfst. Ein Angebot, das eine harte Vorgabe verletzt, kann nicht angenommen werden.",
    preferencesSaved: "Vorgaben gespeichert.",
    preferencesSaveFailed: "Die Vorgaben konnten nicht gespeichert werden.",
    mustKeep: "Muss bleiben",
    mayAccept: "Darf akzeptiert werden",
    mustNeverAccept: "Darf nie akzeptiert werden",
    preferenceItems: {
      same_speed: "Gleiche Geschwindigkeit",
      same_data_volume: "Gleiches Datenvolumen",
      same_phone_number: "Bestehende Rufnummer",
      existing_hardware: "Vorhandene Hardware",
      existing_tv_option: "Vorhandene TV-Option",
      new_minimum_term: "Neue Mindestlaufzeit",
      provider_credit: "Gutschrift des Anbieters",
      temporary_promotion: "Zeitlich begrenzte Aktion",
      permanent_lower_fee: "Dauerhaft niedrigerer Preis",
      plan_upgrade: "Tarif-Upgrade",
      added_service: "Zusätzliche Leistung",
      longer_contract: "Längere Vertragslaufzeit",
      reduced_service: "Reduzierte Leistung",
      activation_fee: "Aktivierungsgebühr",
      hardware_charge: "Hardwarekosten",
    },
    maxExtension: "Maximale Vertragsverlängerung (Monate)",
    minSaving: "Mindestersparnis pro Monat (€)",
    allowPlanChange: "Tarifwechsel erlaubt",
    allowAddons: "Zusatzleistungen erlaubt",
    allowOneTimeCredit: "Einmalige Gutschrift erlaubt",
    allowTemporaryDiscount: "Zeitlich begrenzter Rabatt erlaubt",
    save: "Vorgaben speichern",

    dossierTitle: "Verhandlungsdossier",
    dossierIntro:
      "Das Dossier fasst nur belegte Angaben zusammen. Fehlende Angaben werden benannt, nicht ergänzt.",
    primaryAsk: "Hauptforderung",
    fallbackAsk: "Alternativforderung",
    walkAway: "Abbruchbedingung",
    switchAlternative: "Wechselalternative",
    packageTitle: "Verhandlungspaket",
    modeSelf: "Selbst durchführen",
    modeAssisted: "Mit Unterstützung",
    modeAutomated: "Automatisch",
    modeAutomatedDisabled:
      "Der automatische Modus ist nicht aktiviert. HORIZON sendet nichts an Anbieter und handelt nicht in deinem Namen.",
    selfIntro: "HORIZON bereitet Telefonskript, E-Mail und Checkliste vor. Du führst das Gespräch selbst.",
    assistedIntro:
      "HORIZON bereitet das Paket für eine VZG-Betreuung vor. Eine Vollmacht kann nötig sein und wird nicht vorausgesetzt.",
    noCredentials:
      "HORIZON fragt niemals nach Passwörtern, PINs, TANs oder Einmalcodes. Nutze nur Vertragsdaten und Dokumente.",

    assistedHandoffTitle: "Übergabe an VZG-Betreuung",
    assistedHandoffIntro:
      "HORIZON übergibt das vorbereitete Paket an die Betreuung. Es werden nur die notwendigen Angaben weitergegeben, keine Zugangsdaten.",
    assistedQueueStatus: "Status der Betreuung",
    assistedStatuses: {
      QUEUED: "In der Warteschlange",
      IN_PROGRESS: "In Bearbeitung",
      AWAITING_CUSTOMER: "Rückfrage an dich",
      AWAITING_PROVIDER: "Warten auf den Anbieter",
      COMPLETED: "Abgeschlossen",
      CANCELLED: "Abgebrochen",
    },
    assistedStart: "An Betreuung übergeben",
    assistedStarting: "Wird übergeben …",
    assistedQueued: "Das Paket liegt jetzt bei der Betreuung.",
    assistedQueueFailed: "Die Übergabe ist fehlgeschlagen. Es wurde nichts gesendet.",
    assistedAuthorizationRequired:
      "Ohne erteilte Vollmacht wird nichts übergeben. Erteile zuerst die Vollmacht.",
    assistedNotConfigured: "Die Betreuungsschnittstelle ist nicht eingerichtet.",
    assistedCancel: "Übergabe abbrechen",
    assistedCancelled: "Die Übergabe wurde abgebrochen.",
    assistedCancelFailed: "Der Abbruch ist fehlgeschlagen.",

    offerTitle: "Angebot des Anbieters",
    offerIntro:
      "Füge die Antwort des Anbieters ein oder lade sie hoch. HORIZON liest nur, was ausdrücklich dasteht.",
    offerSourceLabel: "Quelle",
    pasteOffer: "Antwort hier einfügen",
    submitOffer: "Antwort auswerten",
    offerSaved: "Antwort gespeichert.",
    offerSaveFailed: "Die Antwort konnte nicht gespeichert werden.",
    old: "Bisher",
    providerOffer: "Angebot des Anbieters",
    approvedAlternative: "Freigegebene Alternative",
    effectTitle: "Auswirkung",
    monthlySaving: "Ersparnis pro Monat",
    twelveMonthSaving: "Ersparnis in 12 Monaten",
    additionalBinding: "Zusätzliche Bindung",
    activationFee: "Aktivierungsgebühr",
    hardwareFee: "Hardwarekosten",
    oneTimeCredit: "Einmalige Gutschrift",
    temporaryDiscount: "Zeitlich begrenzter Rabatt",
    postPromotionUnknown: "Preis nach der Aktion ist nicht angegeben.",
    acceptOffer: "Angebot annehmen",
    counterOffer: "Gegenangebot",
    rejectOffer: "Ablehnen",
    compareSwitch: "Wechsel vergleichen",
    acceptBlockedPreferences: "Annahme blockiert: Das Angebot verletzt eine harte Vorgabe.",
    acceptBlockedHash: "Annahme blockiert: Der Inhalt des Angebots hat sich geändert.",
    decisionRecorded: "Entscheidung gespeichert.",
    decisionFailed: "Die Entscheidung konnte nicht gespeichert werden.",

    verificationTitle: "Rechnungsprüfung",
    verificationIntro:
      "Eine Ersparnis gilt erst als geprüft, wenn eine spätere Rechnung die niedrigeren Kosten belegt.",
    verificationDue: "Fällig",
    submitBill: "Rechnung prüfen",
    billSaved: "Rechnung geprüft.",
    billFailed: "Die Rechnung konnte nicht geprüft werden.",
    verifiedSaving: "Geprüfte Ersparnis",
    verifiedMonthly: "Geprüft pro Monat",
    verifiedAnnual: "Geprüft pro Jahr",
    notVerifiedYet: "Noch nicht geprüft.",

    legalNote:
      "HORIZON kann analysieren, ob dein Vertrag Optimierungsoptionen haben könnte. Es gibt keine Zusage, dass deine Rechnung sinkt.",
    assistedLegalNote:
      "Eine Vollmacht wird nicht von jedem Anbieter akzeptiert. Ob sie nötig ist, wird im Einzelfall geprüft.",
    affiliateNote:
      "Ein Partnerangebot wird erst gezeigt, wenn du deinen Vertrag, die Alternative und den Preisunterschied gesehen hast.",
    capitalNote:
      "Nur geprüfte Ersparnisse können später in HORIZON Capital einfließen. Capital ist in diesem Schritt nicht aktiv.",
  },
  bg: {
    optimizeAction: "Оптимизирай договора",
    entryIntro:
      "HORIZON може да анализира дали договорът ти има възможности за оптимизация. Нищо не се обещава и нищо не се прави без твоето одобрение.",
    disabledNote: "Оптимизацията на договори в момента не е активирана.",
    notEligible: "Този договор в момента не може да бъде оптимизиран.",
    notEligibleRegulated:
      "Застраховките и регулираните финансови продукти още не са отворени и не се договарят тук.",
    ineligibleCategory: "Тази категория още не е активирана за оптимизация.",

    centerTitle: "Център за оптимизация",
    centerIntro:
      "HORIZON преглежда договора ти по въведените данни и предлага следващата разумна стъпка.",
    analyze: "Анализирай договора",
    analyzing: "Анализът тече …",
    analysisFailed: "Анализът не можа да бъде създаден.",
    stateLabel: "Състояние",
    decisionLabel: "Препоръчана стъпка",
    confidence: "База от данни",
    nextReview: "Следваща проверка",

    actions: {
      NEGOTIATE: "Преговаряй",
      SWITCH: "Смени",
      CANCEL: "Прекрати",
      WAIT: "Изчакай",
      NO_ACTION: "Няма нужда от стъпка",
    },
    reasons: {
      PRICE_ABOVE_APPROVED_ALTERNATIVE: "Твоята цена е над одобрена алтернативна оферта.",
      PRICE_ABOVE_ALTERNATIVE: "Твоята цена е над въведена алтернативна оферта.",
      APPROVED_ALTERNATIVE_AVAILABLE: "Има одобрена алтернативна оферта.",
      CANCELLATION_WINDOW_OPEN: "Прозорецът за прекратяване е отворен.",
      CONTRACT_ENDED: "Срокът на договора е изтекъл.",
      PROMOTION_ACTIVE: "В момента има активна промоция.",
      PROMOTION_EXPIRING_SOON: "Промоцията изтича скоро.",
      DOCUMENTED_PRICE_INCREASE: "Има документирано увеличение на цената.",
      CUSTOMER_TENURE: "По-дълъг стаж по договора като основа за преговори.",
      MISSING_COMPARISON_DATA: "Липсва сравнителна оферта за целева цена.",
      MISSING_CURRENT_COST: "Липсват текущите месечни разходи.",
      MISSING_PROVIDER: "Липсва доставчик.",
      MISSING_CANCELLATION_DEADLINE: "Липсва срокът за прекратяване.",
      NO_LEVERAGE_FOUND: "Не е намерена доказана основа.",
      WAIT_UNTIL_BEFORE_EXPIRY: "Провери отново преди изтичане на промоцията.",
      UNVERIFIED_CONTRACT_DATA: "Данните по договора още не са потвърдени.",
    },
    missing: {
      provider: "Доставчик",
      current_monthly_cost: "Месечни разходи",
      cancellation_deadline: "Срок за прекратяване",
      contract_end_date: "Край на договора",
      comparison_offer: "Сравнителна оферта",
      contract_review: "Потвърждение на данните по договора",
    },

    comparisonRequired: "Нужни са сравнителни данни",
    currentMonthly: "Текущо на месец",
    targetMonthly: "Цел на месец",
    potentialMonthlySaving: "Възможна икономия на месец",
    potentialAnnualSaving: "Възможна икономия на година",
    noSavingManufactured: "Без доказана сравнителна оферта HORIZON не показва икономия.",

    states: {
      CONTRACT: "Договор",
      ANALYSIS: "Анализ",
      OPPORTUNITY: "Възможност",
      STRATEGY: "Стратегия",
      AUTHORIZATION: "Пълномощно",
      NEGOTIATION: "Преговори",
      PROVIDER_RESPONSE: "Отговор от доставчика",
      USER_REVIEW: "Твоя проверка",
      USER_APPROVAL: "Твоето одобрение",
      CONFIRMED: "Потвърдено",
      BILL_VERIFICATION: "Проверка на фактура",
      VERIFIED_SAVING: "Проверена икономия",
      MONITOR: "Наблюдение",
    },
    savingsStates: {
      POTENTIAL: "Възможна",
      OFFERED: "Предложена",
      CONFIRMED: "Потвърдена",
      VERIFIED: "Проверена",
    },
    verificationResults: {
      pending: "Отворена",
      VERIFIED: "Проверена",
      MISMATCH: "Разлика",
      NOT_YET_EFFECTIVE: "Още не е в сила",
    },

    preferencesTitle: "Твоите условия",
    preferencesIntro:
      "Определи предварително какво трябва да остане и какво може да приемеш. Оферта, която нарушава твърдо условие, не може да бъде приета.",
    preferencesSaved: "Условията са запазени.",
    preferencesSaveFailed: "Условията не можаха да бъдат запазени.",
    mustKeep: "Трябва да остане",
    mayAccept: "Може да се приеме",
    mustNeverAccept: "Никога не се приема",
    preferenceItems: {
      same_speed: "Същата скорост",
      same_data_volume: "Същият обем данни",
      same_phone_number: "Същият телефонен номер",
      existing_hardware: "Наличен хардуер",
      existing_tv_option: "Налична TV опция",
      new_minimum_term: "Нов минимален срок",
      provider_credit: "Кредит от доставчика",
      temporary_promotion: "Временна промоция",
      permanent_lower_fee: "Трайно по-ниска такса",
      plan_upgrade: "Ъпгрейд на тарифа",
      added_service: "Добавена услуга",
      longer_contract: "По-дълъг договор",
      reduced_service: "Намалена услуга",
      activation_fee: "Такса активиране",
      hardware_charge: "Такса хардуер",
    },
    maxExtension: "Максимално удължаване (месеци)",
    minSaving: "Минимална икономия на месец (€)",
    allowPlanChange: "Смяна на тарифа е позволена",
    allowAddons: "Допълнителни услуги са позволени",
    allowOneTimeCredit: "Еднократен кредит е позволен",
    allowTemporaryDiscount: "Временна отстъпка е позволена",
    save: "Запази условията",

    dossierTitle: "Досие за преговори",
    dossierIntro:
      "Досието обобщава само доказани данни. Липсващите данни се посочват, не се добавят.",
    primaryAsk: "Основно искане",
    fallbackAsk: "Алтернативно искане",
    walkAway: "Условие за отказ",
    switchAlternative: "Алтернатива за смяна",
    packageTitle: "Пакет за преговори",
    modeSelf: "Сам",
    modeAssisted: "С подкрепа",
    modeAutomated: "Автоматично",
    modeAutomatedDisabled:
      "Автоматичният режим не е активиран. HORIZON не изпраща нищо до доставчици и не действа от твое име.",
    selfIntro: "HORIZON подготвя скрипт за телефон, имейл и списък. Ти водиш разговора сам.",
    assistedIntro:
      "HORIZON подготвя пакета за екип на VZG. Може да е нужно пълномощно и то не се предполага.",
    noCredentials:
      "HORIZON никога не иска пароли, PIN, TAN или еднократни кодове. Използвай само данни по договора и документи.",

    assistedHandoffTitle: "Предаване към екип на VZG",
    assistedHandoffIntro:
      "HORIZON предава подготвения пакет на екипа. Предават се само необходимите данни, без достъпи.",
    assistedQueueStatus: "Статус на обработката",
    assistedStatuses: {
      QUEUED: "В опашка",
      IN_PROGRESS: "В обработка",
      AWAITING_CUSTOMER: "Има въпрос към теб",
      AWAITING_PROVIDER: "Чакаме доставчика",
      COMPLETED: "Завършено",
      CANCELLED: "Прекратено",
    },
    assistedStart: "Предай на екипа",
    assistedStarting: "Предава се …",
    assistedQueued: "Пакетът вече е при екипа.",
    assistedQueueFailed: "Предаването не успя. Нищо не беше изпратено.",
    assistedAuthorizationRequired:
      "Без дадено пълномощно нищо не се предава. Първо дай пълномощно.",
    assistedNotConfigured: "Интерфейсът за екипа не е настроен.",
    assistedCancel: "Прекрати предаването",
    assistedCancelled: "Предаването е прекратено.",
    assistedCancelFailed: "Прекратяването не успя.",

    offerTitle: "Оферта от доставчика",
    offerIntro:
      "Постави отговора на доставчика или го качи. HORIZON чете само това, което изрично е написано.",
    offerSourceLabel: "Източник",
    pasteOffer: "Постави отговора тук",
    submitOffer: "Обработи отговора",
    offerSaved: "Отговорът е запазен.",
    offerSaveFailed: "Отговорът не можа да бъде запазен.",
    old: "Досега",
    providerOffer: "Оферта на доставчика",
    approvedAlternative: "Одобрена алтернатива",
    effectTitle: "Ефект",
    monthlySaving: "Икономия на месец",
    twelveMonthSaving: "Икономия за 12 месеца",
    additionalBinding: "Допълнителна обвързаност",
    activationFee: "Такса активиране",
    hardwareFee: "Разходи за хардуер",
    oneTimeCredit: "Еднократен кредит",
    temporaryDiscount: "Временна отстъпка",
    postPromotionUnknown: "Цената след промоцията не е посочена.",
    acceptOffer: "Приеми офертата",
    counterOffer: "Контраоферта",
    rejectOffer: "Откажи",
    compareSwitch: "Сравни смяна",
    acceptBlockedPreferences: "Приемането е блокирано: офертата нарушава твърдо условие.",
    acceptBlockedHash: "Приемането е блокирано: съдържанието на офертата се е променило.",
    decisionRecorded: "Решението е запазено.",
    decisionFailed: "Решението не можа да бъде запазено.",

    verificationTitle: "Проверка на фактура",
    verificationIntro:
      "Една икономия е проверена едва когато по-късна фактура докаже по-ниските разходи.",
    verificationDue: "Срок",
    submitBill: "Провери фактура",
    billSaved: "Фактурата е проверена.",
    billFailed: "Фактурата не можа да бъде проверена.",
    verifiedSaving: "Проверена икономия",
    verifiedMonthly: "Проверено на месец",
    verifiedAnnual: "Проверено на година",
    notVerifiedYet: "Още не е проверена.",

    legalNote:
      "HORIZON може да анализира дали договорът ти има възможности за оптимизация. Няма обещание, че фактурата ти ще намалее.",
    assistedLegalNote:
      "Пълномощно не се приема от всеки доставчик. Дали е нужно, се преценява за всеки случай.",
    affiliateNote:
      "Партньорска оферта се показва едва след като видиш договора си, алтернативата и разликата в цената.",
    capitalNote:
      "Само проверени икономии могат по-късно да влязат в HORIZON Capital. Capital не е активен в тази стъпка.",
  },
}

export function getNegotiationCopy(locale: Locale): NegotiationCopy {
  return negotiationCopy[locale]
}
