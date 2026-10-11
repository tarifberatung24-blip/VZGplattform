const LINK = "font-medium text-primary underline underline-offset-2"

/** The sentence next to the terms checkbox, with links to the documents. Links open in a new tab so the form keeps its state. */
export function TermsLabel({ locale }: { locale: "bg" | "de" }) {
  const link = (path: string, text: string) => (
    <a href={`/${locale}/${path}`} target="_blank" rel="noopener noreferrer" className={LINK}>{text}</a>
  )
  if (locale === "de") {
    return (
      <>
        Ich akzeptiere die {link("agb", "AGB") } und habe die {link("datenschutz", "Datenschutzerklärung")}, die {link("widerruf", "Widerrufsbelehrung")} und den {link("affiliate-hinweis", "Partnerhinweis")} gelesen.
      </>
    )
  }
  return (
    <>
      Приемам {link("agb", "Общите условия")} и прочетох {link("datenschutz", "Политиката за поверителност")}, {link("widerruf", "Информацията за право на отказ")} и {link("affiliate-hinweis", "Партньорската прозрачност")}.
    </>
  )
}
