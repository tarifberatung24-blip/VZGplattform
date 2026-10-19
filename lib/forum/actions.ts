"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAdmin } from "@/lib/admin/access"
import { createJourneyDb } from "@/lib/journey/db"
import { isLocale } from "@/lib/i18n/dictionaries"
import { createClient } from "@/lib/supabase/server"
import {
  forumAnnouncementSchema,
  forumCommentSchema,
  forumPostSchema,
  forumReportSchema,
} from "./contract"

export type ForumActionState = { message: string | null; ok: boolean }

const uuidSchema = z.string().uuid()

function forumPath(locale: FormDataEntryValue | null): string | null {
  return typeof locale === "string" && isLocale(locale) ? `/${locale}/forum` : null
}

async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function createForumPost(
  _previous: ForumActionState,
  formData: FormData,
): Promise<ForumActionState> {
  const path = forumPath(formData.get("locale"))
  const parsed = forumPostSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
  })
  if (!path || !parsed.success) return { ok: false, message: "INVALID_POST" }

  const { supabase, user } = await currentUser()
  if (!user) return { ok: false, message: "UNAUTHORIZED" }
  const { error } = await supabase.from("forum_posts").insert({
    author_id: user.id,
    author_type: "member",
    category: parsed.data.category,
    official_topic: null,
    title: parsed.data.title,
    body: parsed.data.body,
    status: "published",
    is_pinned: false,
    is_locked: false,
  })
  if (error) return { ok: false, message: "POST_FAILED" }

  revalidatePath(path)
  return { ok: true, message: "POSTED" }
}

export async function createForumComment(formData: FormData) {
  const path = forumPath(formData.get("locale"))
  const parsed = forumCommentSchema.safeParse({ postId: formData.get("postId"), body: formData.get("body") })
  if (!path || !parsed.success) return

  const { supabase, user } = await currentUser()
  if (!user) return
  const { error } = await supabase.from("forum_comments").insert({
    post_id: parsed.data.postId,
    author_id: user.id,
    body: parsed.data.body,
    status: "published",
  })
  if (!error) revalidatePath(path)
}

export async function toggleForumReaction(formData: FormData) {
  const path = forumPath(formData.get("locale"))
  const postId = uuidSchema.safeParse(formData.get("postId"))
  if (!path || !postId.success) return

  const { supabase, user } = await currentUser()
  if (!user) return
  const { data: existing, error: readError } = await supabase
    .from("forum_post_reactions")
    .select("post_id")
    .eq("post_id", postId.data)
    .maybeSingle()
  if (readError) return

  const result = existing
    ? await supabase.from("forum_post_reactions").delete().eq("post_id", postId.data)
    : await supabase.from("forum_post_reactions").insert({ post_id: postId.data, user_id: user.id, reaction: "helpful" })
  if (!result.error) revalidatePath(path)
}

export async function reportForumContent(
  _previous: ForumActionState,
  formData: FormData,
): Promise<ForumActionState> {
  const path = forumPath(formData.get("locale"))
  const parsed = forumReportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
  })
  if (!path || !parsed.success) return { ok: false, message: "INVALID_REPORT" }

  const { supabase, user } = await currentUser()
  if (!user) return { ok: false, message: "UNAUTHORIZED" }
  const { error } = await supabase.from("forum_reports").insert({
    reporter_id: user.id,
    post_id: parsed.data.targetType === "post" ? parsed.data.targetId : null,
    comment_id: parsed.data.targetType === "comment" ? parsed.data.targetId : null,
    reason: parsed.data.reason,
    status: "open",
  })
  if (error) return { ok: false, message: "REPORT_FAILED" }
  revalidatePath(path)
  return { ok: true, message: "REPORTED" }
}

export async function createForumAnnouncement(
  _previous: ForumActionState,
  formData: FormData,
): Promise<ForumActionState> {
  const path = forumPath(formData.get("locale"))
  const parsed = forumAnnouncementSchema.safeParse({
    topic: formData.get("topic"),
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  })
  if (!path || !parsed.success) return { ok: false, message: "INVALID_POST" }

  const admin = await getAdmin()
  const db = createJourneyDb()
  if (!admin || !db) return { ok: false, message: "UNAUTHORIZED" }
  const { error } = await db.from("forum_posts").insert({
    author_id: admin.id,
    author_type: "official",
    category: "announcement",
    official_topic: parsed.data.topic,
    title: parsed.data.title,
    body: parsed.data.body,
    status: "published",
    is_pinned: parsed.data.pinned,
    is_locked: false,
  })
  if (error) return { ok: false, message: "POST_FAILED" }
  revalidatePath(path)
  return { ok: true, message: "POSTED" }
}

export async function moderateForumPost(formData: FormData) {
  const locale = formData.get("locale")
  const postId = uuidSchema.safeParse(formData.get("postId"))
  const status = formData.get("status")
  const locked = formData.get("locked")
  if (typeof locale !== "string" || !isLocale(locale) || !postId.success) return
  if (status !== "published" && status !== "hidden") return
  if (locked !== "true" && locked !== "false") return

  const admin = await getAdmin()
  const db = createJourneyDb()
  if (!admin || !db) return
  const { error } = await db
    .from("forum_posts")
    .update({ status, is_locked: locked === "true" })
    .eq("id", postId.data)
  if (!error) {
    revalidatePath(`/${locale}/forum`)
    revalidatePath(`/${locale}/admin/forum`)
  }
}
