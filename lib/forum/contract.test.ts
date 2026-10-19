import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  forumAnnouncementSchema,
  forumCommentSchema,
  forumPostSchema,
  forumReportSchema,
} from "./contract"

const sql = readFileSync("supabase/migrations/20261019100000_forum.sql", "utf8").toLowerCase()

describe("forum input contract", () => {
  it("accepts only member discussion and feedback posts", () => {
    expect(forumPostSchema.safeParse({ category: "community", title: "Полезен въпрос", body: "Това е безопасен тест." }).success).toBe(true)
    expect(forumPostSchema.safeParse({ category: "announcement", title: "Не", body: "Тест" }).success).toBe(false)
  })

  it("keeps text bounds and trims user input", () => {
    const parsed = forumPostSchema.parse({ category: "feedback", title: "  Добра идея  ", body: "  Текст  " })
    expect(parsed.title).toBe("Добра идея")
    expect(parsed.body).toBe("Текст")
    expect(forumCommentSchema.safeParse({ postId: "not-a-uuid", body: "Тест" }).success).toBe(false)
  })

  it("requires a precise report target and a reason", () => {
    expect(forumReportSchema.safeParse({ targetType: "post", targetId: "83b58f63-9c7c-4b18-8daa-dd886c7bc57d", reason: "Не е по темата" }).success).toBe(true)
    expect(forumReportSchema.safeParse({ targetType: "post", targetId: "83b58f63-9c7c-4b18-8daa-dd886c7bc57d", reason: "x" }).success).toBe(false)
  })

  it("reserves official notices for explicit admin topics", () => {
    expect(forumAnnouncementSchema.safeParse({ topic: "law", title: "Нова информация", body: "Проверена информация", pinned: false }).success).toBe(true)
    expect(forumAnnouncementSchema.safeParse({ topic: "unknown", title: "Нова информация", body: "Проверена информация", pinned: false }).success).toBe(false)
  })
})

describe("forum database contract", () => {
  it("creates all four public tables with RLS", () => {
    for (const table of ["forum_posts", "forum_comments", "forum_post_reactions", "forum_reports"]) {
      expect(sql).toContain(`create table if not exists public.${table}`)
      expect(sql).toContain(`alter table public.${table} enable row level security`)
      expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated`)
    }
  })

  it("keeps author and reaction member identifiers out of authenticated reads", () => {
    expect(sql).toContain("grant select (id, author_type, category, official_topic, title, body, status, is_pinned, is_locked, created_at)")
    expect(sql).not.toContain("grant select on table public.forum_posts to authenticated")
    expect(sql).toContain("grant select (post_id, reaction) on public.forum_post_reactions to authenticated")
  })

  it("enforces authorship and prevents member-created official notices", () => {
    expect(sql).toContain("and author_type = 'member'")
    expect(sql).toContain("and category in ('community', 'feedback')")
    expect(sql).toContain("forum_posts_author_category_check")
    expect(sql).toContain("forum_reports_one_target_check")
  })
})
