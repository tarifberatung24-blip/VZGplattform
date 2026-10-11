import { describe, expect, it, vi } from "vitest"
import { recordAffiliateClick } from "./analytics"

function clientWith(results: Array<{ error: { code: string } | null }>) {
  const insert = vi.fn()
  for (const result of results) insert.mockResolvedValueOnce(result)
  return { client: { from: () => ({ insert }) } as never, insert }
}

describe("recordAffiliateClick attribution", () => {
  it("stores the click id, user and Optimize session", async () => {
    const { client, insert } = clientWith([{ error: null }])
    expect(await recordAffiliateClick(client, { id: "c1", offerId: "energy", userId: "u1", optimizeSessionId: "s1" })).toBe(true)
    expect(insert.mock.calls[0][0]).toMatchObject({ id: "c1", offer_id: "energy", user_id: "u1", optimize_session_id: "s1" })
  })

  it("leaves attribution columns out of anonymous clicks", async () => {
    const { client, insert } = clientWith([{ error: null }])
    await recordAffiliateClick(client, { offerId: "kfz" })
    expect(insert.mock.calls[0][0]).not.toHaveProperty("user_id")
    expect(insert.mock.calls[0][0]).not.toHaveProperty("optimize_session_id")
  })

  it("still counts the click before the attribution migration is applied", async () => {
    const { client, insert } = clientWith([{ error: { code: "PGRST204" } }, { error: null }])
    expect(await recordAffiliateClick(client, { id: "c1", offerId: "energy", userId: "u1" })).toBe(true)
    expect(insert).toHaveBeenCalledTimes(2)
    expect(insert.mock.calls[1][0]).not.toHaveProperty("user_id")
  })

  it("does not retry other failures", async () => {
    const { client, insert } = clientWith([{ error: { code: "23505" } }])
    expect(await recordAffiliateClick(client, { offerId: "energy", userId: "u1" })).toBe(false)
    expect(insert).toHaveBeenCalledTimes(1)
  })
})
