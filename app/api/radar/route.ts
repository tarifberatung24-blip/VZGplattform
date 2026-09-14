import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { getKintexRadarSignals } from "@/lib/kintex-radar"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "RADAR_NOT_AUTHENTICATED" }, { status: 401 })
    const householdId = await ensureHousehold(supabase)
    const { data: contracts, error } = await supabase.from("contracts")
      .select("id,title,category,monthly_amount,status,end_date,cancellation_deadline,review_status")
      .eq("household_id", householdId)
    if (error) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    const signals = getKintexRadarSignals(contracts ?? [])
    const rows = signals.map((signal) => {
      const separator = signal.id.lastIndexOf("-")
      const contractId = separator > 0 ? signal.id.slice(0, separator) : signal.id
      return {
        household_id: householdId,
        contract_id: contractId,
        signal_key: signal.id.slice(separator + 1),
        title: signal.title,
        detail: signal.detail,
        tone: signal.tone,
        rule_version: "v1",
        observed_at: new Date().toISOString(),
        resolved_at: null,
      }
    })
    if (rows.length) {
      const { error: historyError } = await supabase.from("contract_radar_history").upsert(rows, { onConflict: "contract_id,signal_key,rule_version" })
      if (historyError) return NextResponse.json({ code: "RADAR_HISTORY_SAVE_FAILED" }, { status: 502 })
    }
    const { data: history } = await supabase.from("contract_radar_history")
      .select("id,contract_id,signal_key,title,detail,tone,rule_version,observed_at,resolved_at")
      .eq("household_id", householdId)
      .order("observed_at", { ascending: false })
      .limit(50)
    return NextResponse.json({ signals, history: history ?? [] })
  } catch {
    return NextResponse.json({ code: "RADAR_FAILED" }, { status: 502 })
  }
}
