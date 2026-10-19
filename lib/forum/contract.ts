import { z } from "zod"

export const forumMemberCategories = ["community", "feedback"] as const
export const forumOfficialTopics = ["platform", "law", "promotion", "innovation"] as const

export type ForumMemberCategory = (typeof forumMemberCategories)[number]
export type ForumOfficialTopic = (typeof forumOfficialTopics)[number]

const cleanText = (value: string) => value.trim().replace(/\r\n/g, "\n")

export const forumPostSchema = z.object({
  category: z.enum(forumMemberCategories),
  title: z.string().transform(cleanText).pipe(z.string().min(3).max(140)),
  body: z.string().transform(cleanText).pipe(z.string().min(1).max(5000)),
})

export const forumCommentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().transform(cleanText).pipe(z.string().min(1).max(4000)),
})

export const forumReportSchema = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: z.string().uuid(),
  reason: z.string().transform(cleanText).pipe(z.string().min(3).max(500)),
})

export const forumAnnouncementSchema = z.object({
  topic: z.enum(forumOfficialTopics),
  title: z.string().transform(cleanText).pipe(z.string().min(3).max(140)),
  body: z.string().transform(cleanText).pipe(z.string().min(1).max(5000)),
  pinned: z.boolean(),
})

export type ForumPost = {
  id: string
  authorType: "member" | "official"
  category: "community" | "feedback" | "announcement"
  officialTopic: ForumOfficialTopic | null
  title: string
  body: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  commentCount: number
  helpfulCount: number
  reacted: boolean
}

export type ForumComment = {
  id: string
  postId: string
  body: string
  createdAt: string
}
