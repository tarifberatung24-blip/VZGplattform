import "server-only"

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"
const GMAIL_SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
const GMAIL_SCOPE = "openid email https://www.googleapis.com/auth/gmail.send"

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`missing_${name}`)
  return value
}

export function googleOAuthConfig() {
  return {
    clientId: required("HORIZON_GOOGLE_CLIENT_ID"),
    clientSecret: required("HORIZON_GOOGLE_CLIENT_SECRET"),
    redirectUri: required("HORIZON_GOOGLE_REDIRECT_URI"),
  }
}

function encryptionKey(): Buffer {
  const raw = required("HORIZON_EMAIL_TOKEN_ENCRYPTION_KEY")
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) throw new Error("invalid_HORIZON_EMAIL_TOKEN_ENCRYPTION_KEY")
  return key
}

export function sealToken(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function openToken(value: string): string {
  const [ivText, tagText, ciphertextText] = value.split(".")
  if (!ivText || !tagText || !ciphertextText) throw new Error("invalid_sealed_token")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"))
  decipher.setAuthTag(Buffer.from(tagText, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8")
}

export function oauthStateHash(state: string): string {
  return createHash("sha256").update(`${state}:${required("HORIZON_EMAIL_TOKEN_ENCRYPTION_KEY")}`).digest("hex")
}

export function googleConsentUrl(state: string): string {
  const config = googleOAuthConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPE,
    state,
  })
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

export async function exchangeGoogleCode(code: string) {
  const config = googleOAuthConfig()
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }),
  })
  if (!response.ok) throw new Error("google_token_exchange_failed")
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string }>
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const config = googleOAuthConfig()
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token" }),
  })
  if (!response.ok) throw new Error("google_token_refresh_failed")
  return response.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function googleAccount(accessToken: string): Promise<string> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error("google_profile_failed")
  const data = await response.json() as { email?: string }
  if (!data.email) throw new Error("google_profile_missing_email")
  return data.email
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url")
}

export async function sendGmail(accessToken: string, message: { to: string; from: string; subject: string; body: string; attachments: readonly { filename: string; contentType: string; bytes: Uint8Array }[] }) {
  const boundary = `=_HORIZON_${randomBytes(12).toString("hex")}`
  const lines = [`From: ${message.from}`, `To: ${message.to}`, `Subject: ${message.subject}`, "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${boundary}"`, "", `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", message.body]
  for (const attachment of message.attachments) {
    lines.push(`--${boundary}`, `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`, `Content-Disposition: attachment; filename="${attachment.filename}"`, "Content-Transfer-Encoding: base64", "", Buffer.from(attachment.bytes).toString("base64").replace(/(.{76})/g, "$1\r\n"))
  }
  lines.push(`--${boundary}--`, "")
  const response = await fetch(GMAIL_SEND_ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: base64Url(lines.join("\r\n")) }),
  })
  if (!response.ok) throw new Error("gmail_send_failed")
  return response.json() as Promise<{ id?: string; threadId?: string }>
}
