import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { updateSessionMock } = vi.hoisted(() => ({ updateSessionMock: vi.fn() }))

vi.mock("./lib/supabase/proxy", () => ({
  updateSession: updateSessionMock,
}))

import { proxy } from "./proxy"

describe("localized workspace routes", () => {
  beforeEach(() => {
    updateSessionMock.mockReset()
    updateSessionMock.mockResolvedValue(NextResponse.next())
  })

  it.each(["/bg/forum", "/de/forum", "/bg/admin/forum"])("passes %s through the proxy", async (path) => {
    const response = await proxy(new NextRequest(`https://horizon.test${path}`))

    expect(response.status).toBe(200)
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
  })
})
