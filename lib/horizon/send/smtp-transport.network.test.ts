import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import net from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import tls from "node:tls"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * P11 — the SMTP transport over a real network connection.
 *
 * Until now the transport was proven only by a manual run against a live server.
 * This test starts a small SMTP server inside the test process, on 127.0.0.1,
 * that speaks real SMTP with a real STARTTLS upgrade, and sends through the
 * production `createSmtpProvider` with the real nodemailer client.
 *
 * Certificate verification stays ON. The test certificate is trusted by adding
 * its CA to the client the provider builds; the provider's own options are
 * captured first and asserted not to disable TLS or verification. A separate case
 * leaves the CA out and proves that an untrusted server receives nothing.
 *
 * All addresses and content are synthetic.
 */

vi.mock("server-only", () => ({}))

const shared = vi.hoisted(() => ({
  ca: null as string | null,
  trustTestCa: true,
  capturedOptions: [] as Record<string, unknown>[],
}))

vi.mock("nodemailer", async (importOriginal) => {
  const actual = (await importOriginal()) as { default: { createTransport: (options: unknown) => unknown } }
  return {
    default: {
      ...actual.default,
      createTransport: (options: Record<string, unknown>) => {
        shared.capturedOptions.push({ ...options })
        const tlsOptions = shared.trustTestCa && shared.ca ? { tls: { ca: shared.ca } } : {}
        return actual.default.createTransport({ ...options, ...tlsOptions })
      },
    },
  }
})

import { createSmtpProvider } from "./smtp-provider"
import type { OutboundEmail } from "./provider"

type ServerMode = {
  offerStartTls: boolean
  rejectRecipient: boolean
}

type Transcript = {
  commands: string[]
  tlsBeforeAuth: boolean
  data: string | null
  connections: number
}

let certDir: string
let key: string
let cert: string
let server: net.Server
let port: number
const mode: ServerMode = { offerStartTls: true, rejectRecipient: false }
let transcript: Transcript

function freshTranscript(): Transcript {
  return { commands: [], tlsBeforeAuth: false, data: null, connections: 0 }
}

/** A minimal ESMTP server: enough of RFC 5321 + STARTTLS + AUTH PLAIN for nodemailer. */
function startServer(): Promise<number> {
  server = net.createServer((raw) => {
    transcript.connections += 1
    let socket: net.Socket | tls.TLSSocket = raw
    let secure = false
    let buffer = ""
    let inData = false

    const reply = (line: string) => socket.write(`${line}\r\n`)

    const ehlo = () => {
      const lines = ["250-test.invalid"]
      if (mode.offerStartTls && !secure) lines.push("250-STARTTLS")
      if (secure) lines.push("250-AUTH PLAIN")
      lines.push("250 8BITMIME")
      socket.write(`${lines.join("\r\n")}\r\n`)
    }

    const handle = (chunk: Buffer) => {
      buffer += chunk.toString("utf8")
      for (;;) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n")
          if (end === -1) return
          transcript.data = buffer.slice(0, end)
          buffer = buffer.slice(end + 5)
          inData = false
          reply("250 2.0.0 queued")
          continue
        }
        const lineEnd = buffer.indexOf("\r\n")
        if (lineEnd === -1) return
        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + 2)
        const verb = line.split(" ")[0].toUpperCase()
        transcript.commands.push(verb === "AUTH" ? "AUTH" : line)

        if (verb === "EHLO" || verb === "HELO") ehlo()
        else if (verb === "STARTTLS" && mode.offerStartTls && !secure) {
          reply("220 2.0.0 ready to start TLS")
          raw.removeListener("data", handle)
          const upgraded = new tls.TLSSocket(raw, { isServer: true, key, cert })
          upgraded.on("data", handle)
          upgraded.on("error", () => undefined)
          socket = upgraded
          secure = true
        } else if (verb === "AUTH") {
          transcript.tlsBeforeAuth = secure
          reply("235 2.7.0 authenticated")
        } else if (verb === "MAIL") reply("250 2.1.0 ok")
        else if (verb === "RCPT") reply(mode.rejectRecipient ? "550 5.1.1 no such user" : "250 2.1.5 ok")
        else if (verb === "DATA") {
          inData = true
          reply("354 end with <CRLF>.<CRLF>")
        } else if (verb === "RSET" || verb === "NOOP") reply("250 ok")
        else if (verb === "QUIT") {
          reply("221 bye")
          socket.end()
        } else reply("502 not implemented")
      }
    }

    raw.on("data", handle)
    raw.on("error", () => undefined)
    reply("220 test.invalid ESMTP")
  })

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as net.AddressInfo).port))
  })
}

const message: OutboundEmail = {
  to: "kunde@example.invalid",
  subject: "Widerspruch gegen Bescheid",
  body: "Sehr geehrte Damen und Herren,\nsynthetischer Testinhalt.",
  attachments: [
    {
      storagePath: "user-1/case-1/draft.pdf",
      filename: "widerspruch.pdf",
      contentType: "application/pdf",
      sizeBytes: 8,
      sha256: "0".repeat(64),
      bytes: new TextEncoder().encode("%PDF-1.7"),
    },
  ],
}

const provider = () =>
  createSmtpProvider({
    ok: true,
    config: {
      host: "127.0.0.1",
      port,
      secure: false,
      auth: { user: "horizon", pass: "synthetic-test-password" },
      from: "horizon@test.invalid",
    },
  })

const mailCommands = () => transcript.commands.filter((command) => /^(MAIL|RCPT|DATA)/i.test(command))

beforeAll(async () => {
  certDir = mkdtempSync(join(tmpdir(), "horizon-smtp-"))
  execFileSync(
    "openssl",
    [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-keyout", join(certDir, "key.pem"),
      "-out", join(certDir, "cert.pem"),
      "-subj", "/CN=127.0.0.1",
      "-addext", "subjectAltName=IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  )
  key = readFileSync(join(certDir, "key.pem"), "utf8")
  cert = readFileSync(join(certDir, "cert.pem"), "utf8")
  shared.ca = cert
  port = await startServer()
}, 30_000)

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  rmSync(certDir, { recursive: true, force: true })
})

beforeEach(() => {
  transcript = freshTranscript()
  mode.offerStartTls = true
  mode.rejectRecipient = false
  shared.trustTestCa = true
  shared.capturedOptions = []
})

describe("SMTP transport over a real connection", () => {
  it("sends over STARTTLS with authentication, one recipient and the attachment", async () => {
    const result = await provider().send(message)

    expect(result.status).toBe("SENT")
    if (result.status !== "SENT") return
    expect(result.providerMessageId.length).toBeGreaterThan(0)
    expect(result.metadata).toEqual({ accepted: 1, rejected: 0, attachmentCount: 1 })

    // TLS was established before credentials were sent.
    expect(transcript.commands).toContain("STARTTLS")
    expect(transcript.tlsBeforeAuth).toBe(true)

    // Exactly the configured sender and the one confirmed recipient — no cc/bcc.
    expect(mailCommands()).toEqual([
      "MAIL FROM:<horizon@test.invalid>",
      "RCPT TO:<kunde@example.invalid>",
      "DATA",
    ])
    expect(transcript.data).toContain("Subject: Widerspruch gegen Bescheid")
    expect(transcript.data).toContain("synthetischer Testinhalt")
    expect(transcript.data).toContain('filename=widerspruch.pdf')
  })

  it("the provider itself requires STARTTLS and never weakens certificate checks", async () => {
    await provider().send(message)
    const options = shared.capturedOptions[0]
    expect(options.requireTLS).toBe(true)
    expect(options.secure).toBe(false)
    expect(options).not.toHaveProperty("tls")
    expect(options).not.toHaveProperty("ignoreTLS")
  })

  it("refuses a server that does not offer STARTTLS and transmits nothing", async () => {
    mode.offerStartTls = false
    const result = await provider().send(message)
    expect(result.status).toBe("FAILED")
    expect(transcript.commands).not.toContain("AUTH")
    expect(mailCommands()).toEqual([])
    expect(transcript.data).toBeNull()
  })

  it("refuses a server whose certificate is not trusted and transmits nothing", async () => {
    shared.trustTestCa = false
    const result = await provider().send(message)
    expect(result.status).toBe("FAILED")
    expect(transcript.tlsBeforeAuth).toBe(false)
    expect(transcript.commands).not.toContain("AUTH")
    expect(mailCommands()).toEqual([])
    expect(transcript.data).toBeNull()
  })

  it("reports a rejected recipient as FAILED/rejected, never as sent", async () => {
    mode.rejectRecipient = true
    const result = await provider().send(message)
    expect(result).toMatchObject({ status: "FAILED", classification: "rejected" })
    expect(transcript.data).toBeNull()
  })

  it("an unconfigured provider is UNAVAILABLE and opens no connection", async () => {
    const unconfigured = createSmtpProvider({ ok: false, missing: ["HORIZON_SMTP_HOST"], invalid: [] })
    const result = await unconfigured.send(message)
    expect(result).toEqual({ status: "UNAVAILABLE", reason: "smtp_not_configured" })
    expect(transcript.connections).toBe(0)
  })
})
