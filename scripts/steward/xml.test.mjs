#!/usr/bin/env node
/**
 * Tests for the dependency-free feed parser (scripts/steward/xml.mjs).
 *
 * A government feed that changes shape must degrade one report section, not
 * abort the run, so the important cases here are the malformed ones: truncated
 * XML, unknown entities, a date in an unexpected format. The parser's contract
 * is that it returns what it could read and never throws.
 *
 * Usage: node --test scripts/steward/xml.test.mjs
 */

import assert from "node:assert/strict"
import test from "node:test"

import { decodeEntities, normalizeDate, parseFeed, stripTags } from "./xml.mjs"

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:meta="http://recht.bund.de/rss/meta">
  <channel>
    <title>Bundesgesetzblatt Teil I und Teil II</title>
    <link>https://www.recht.bund.de</link>
    <item>
      <title>Gesetz zur Änderung des Preisangabenrechts</title>
      <link>https://www.recht.bund.de/eli/bund/bgbl-1/2026/314</link>
      <pubDate>2026-10-22</pubDate>
      <description>Kurze Beschreibung</description>
      <meta:typ>Gesetz</meta:typ>
    </item>
    <item>
      <title>Verordnung über die Berufsausbildung</title>
      <link>https://www.recht.bund.de/eli/bund/bgbl-1/2026/311</link>
      <pubDate>Thu, 22 Oct 2026 00:00:00 GMT</pubDate>
      <description><![CDATA[Text mit <b>Markup</b> und &amp; Zeichen]]></description>
    </item>
  </channel>
</rss>`

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Beispiel Feed</title>
  <entry>
    <title>Erster Eintrag</title>
    <link href="https://example.test/1"/>
    <updated>2026-10-30T10:00:00Z</updated>
    <summary>Zusammenfassung</summary>
    <category term="law"/>
  </entry>
</feed>`

test("parses an RSS 2.0 channel into items", () => {
  const feed = parseFeed(RSS)

  assert.equal(feed.format, "rss")
  assert.equal(feed.title, "Bundesgesetzblatt Teil I und Teil II")
  assert.equal(feed.items.length, 2)
  assert.equal(feed.items[0].title, "Gesetz zur Änderung des Preisangabenrechts")
  assert.equal(feed.items[0].link, "https://www.recht.bund.de/eli/bund/bgbl-1/2026/314")
})

test("parses an Atom feed into items", () => {
  const feed = parseFeed(ATOM)

  assert.equal(feed.format, "atom")
  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0].title, "Erster Eintrag")
  assert.equal(feed.items[0].link, "https://example.test/1")
  assert.equal(feed.items[0].category, "law")
})

test("decodes CDATA and entities in a description", () => {
  const feed = parseFeed(RSS)
  assert.equal(feed.items[1].summary, "Text mit Markup und & Zeichen")
})

test("returns an empty result for empty, malformed or unrelated input instead of throwing", () => {
  for (const input of ["", "   ", "not xml at all", "<html><body>hello</body></html>", null, undefined]) {
    const feed = parseFeed(input)
    assert.equal(feed.format, "unknown")
    assert.deepEqual(feed.items, [])
  }
})

test("recovers items from a truncated document", () => {
  // A feed cut off mid-document still yields the items it did include.
  const truncated = RSS.slice(0, RSS.indexOf("<item>") + 400)
  const feed = parseFeed(truncated)

  assert.equal(feed.format, "rss")
  assert.ok(feed.items.length >= 1, "at least the first item should survive truncation")
})

test("drops an item with no title, because every section depends on the title", () => {
  const feed = parseFeed(`<rss><channel>
    <item><link>https://x.test/1</link></item>
    <item><title>Kept</title><link>https://x.test/2</link></item>
  </channel></rss>`)

  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0].title, "Kept")
})

test("decodes named and numeric entities", () => {
  assert.equal(decodeEntities("a &amp; b &lt; c &gt; d"), "a & b < c > d")
  assert.equal(decodeEntities("&auml; &ouml; &uuml; &szlig;"), "ä ö ü ß")
  assert.equal(decodeEntities("&#65;&#x42;"), "AB")
  assert.equal(decodeEntities("&unknownentity;"), "&unknownentity;")
})

test("strips tags and collapses whitespace without losing text", () => {
  assert.equal(stripTags("<p>Hallo   <b>Welt</b></p>"), "Hallo Welt")
  assert.equal(stripTags("<script>evil()</script>Sichtbar"), "Sichtbar")
})

test("normalizes ISO, RFC 822 and German date formats", () => {
  assert.equal(normalizeDate("2026-10-30"), "2026-10-30T00:00:00.000Z")
  assert.equal(normalizeDate("Thu, 22 Oct 2026 00:00:00 GMT"), "2026-10-22T00:00:00.000Z")
  assert.equal(normalizeDate("22.10.2026"), "2026-10-22T00:00:00.000Z")
})

test("returns null for an unparseable or missing date rather than an invalid Date", () => {
  for (const input of ["", "kein Datum", null, undefined, "32.13.2026"]) {
    assert.equal(normalizeDate(input), null)
  }
})
