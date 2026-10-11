import type { Config } from "@puckeditor/core"

type Blocks = {
  Heading: { text: string; level: "h1" | "h2" | "h3"; align: "left" | "center" | "right" }
  Text: { text: string; align: "left" | "center" | "right" }
  Button: { label: string; href: string }
  Image: { src: string; alt: string }
  Spacer: { height: number }
}

export const puckConfig: Config<Blocks> = {
  components: {
    Heading: {
      fields: {
        text: { type: "text" },
        level: { type: "radio", options: [{ label: "H1", value: "h1" }, { label: "H2", value: "h2" }, { label: "H3", value: "h3" }] },
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
      },
      defaultProps: { text: "Заглавие", level: "h2", align: "left" },
      render: ({ text, level: Tag, align }) => (
        <Tag style={{ textAlign: align, fontWeight: 700, fontSize: Tag === "h1" ? "2.25rem" : Tag === "h2" ? "1.75rem" : "1.25rem", margin: "0.5rem 0" }}>{text}</Tag>
      ),
    },
    Text: {
      fields: {
        text: { type: "textarea" },
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
      },
      defaultProps: { text: "Вашият текст тук.", align: "left" },
      render: ({ text, align }) => <p style={{ textAlign: align, lineHeight: 1.6, margin: "0.5rem 0" }}>{text}</p>,
    },
    Button: {
      fields: { label: { type: "text" }, href: { type: "text" } },
      defaultProps: { label: "Бутон", href: "#" },
      render: ({ label, href }) => (
        <a href={href} style={{ display: "inline-block", padding: "0.6rem 1.2rem", borderRadius: 8, background: "#111", color: "#fff", textDecoration: "none" }}>{label}</a>
      ),
    },
    Image: {
      fields: { src: { type: "text" }, alt: { type: "text" } },
      defaultProps: { src: "", alt: "" },
      render: ({ src, alt }) =>
        src ? <img src={src} alt={alt} style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }} /> : <div style={{ padding: "2rem", border: "1px dashed #999", textAlign: "center" }}>Добавете URL на изображение</div>,
    },
    Spacer: {
      fields: { height: { type: "number", min: 8, max: 240 } },
      defaultProps: { height: 32 },
      render: ({ height }) => <div style={{ height }} aria-hidden />,
    },
  },
}
