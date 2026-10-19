import "server-only"

import { createClient } from "@/lib/supabase/server"
import { createJourneyDb } from "@/lib/journey/db"
import { forumOfficialTopics, type ForumComment, type ForumOfficialTopic, type ForumPost } from "./contract"

type DbPost = {
  id: string
  author_type: "member" | "official"
  category: "community" | "feedback" | "announcement"
  official_topic: string | null
  title: string
  body: string
  is_pinned: boolean
  is_locked: boolean
  created_at: string
}

type DbComment = {
  id: string
  post_id: string
  body: string
  created_at: string
}

function isOfficialTopic(value: string | null): value is ForumOfficialTopic {
  return value !== null && (forumOfficialTopics as readonly string[]).includes(value)
}

/**
 * Returns only safe forum presentation data. The database never grants the member-facing client
 * access to `author_id` / `user_id`, and this mapping maintains that boundary at the RSC layer.
 */
export async function loadForum(): Promise<{ posts: ForumPost[]; comments: ForumComment[] }> {
  const supabase = await createClient()
  const { data: postsData, error: postsError } = await supabase
    .from("forum_posts")
    .select("id,author_type,category,official_topic,title,body,is_pinned,is_locked,created_at")
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)

  if (postsError || !postsData?.length) return { posts: [], comments: [] }
  const postRows = postsData as DbPost[]
  const postIds = postRows.map((post) => post.id)

  const [{ data: commentsData }, { data: mineData }, reactionResult] = await Promise.all([
    supabase
      .from("forum_comments")
      .select("id,post_id,body,created_at")
      .in("post_id", postIds)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("forum_post_reactions")
      .select("post_id")
      .in("post_id", postIds),
    loadReactionCounts(postIds),
  ])

  const comments = ((commentsData ?? []) as DbComment[]).map((comment) => ({
    id: comment.id,
    postId: comment.post_id,
    body: comment.body,
    createdAt: comment.created_at,
  }))
  const commentCounts = new Map<string, number>()
  for (const comment of comments) {
    commentCounts.set(comment.postId, (commentCounts.get(comment.postId) ?? 0) + 1)
  }
  const mine = new Set(((mineData ?? []) as Array<{ post_id: string }>).map((reaction) => reaction.post_id))

  return {
    comments,
    posts: postRows.map((post) => ({
      id: post.id,
      authorType: post.author_type,
      category: post.category,
      officialTopic: isOfficialTopic(post.official_topic) ? post.official_topic : null,
      title: post.title,
      body: post.body,
      isPinned: post.is_pinned,
      isLocked: post.is_locked,
      createdAt: post.created_at,
      commentCount: commentCounts.get(post.id) ?? 0,
      helpfulCount: reactionResult.get(post.id) ?? 0,
      reacted: mine.has(post.id),
    })),
  }
}

async function loadReactionCounts(postIds: readonly string[]): Promise<Map<string, number>> {
  const db = createJourneyDb()
  if (!db || postIds.length === 0) return new Map()

  const { data, error } = await db
    .from("forum_post_reactions")
    .select("post_id")
    .in("post_id", postIds)
  if (error) return new Map()

  const counts = new Map<string, number>()
  for (const reaction of (data ?? []) as Array<{ post_id: string }>) {
    counts.set(reaction.post_id, (counts.get(reaction.post_id) ?? 0) + 1)
  }
  return counts
}
