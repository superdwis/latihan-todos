import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type LynkPayload = {
  data?: {
    message_data?: {
      refId?: unknown
      totals?: {
        grandTotal?: unknown
      }
    }
    message_id?: unknown
  }
  refId?: unknown
  grandTotal?: unknown
  message_id?: unknown
}

function isValidSignature(refId: string, amount: string, messageId: string, received: string, merchantKey: string) {
  if (!/^[a-f\d]{64}$/i.test(received)) return false

  const expected = createHash('sha256')
    .update(amount + refId + messageId + merchantKey)
    .digest()
  const actual = Buffer.from(received, 'hex')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function POST(request: Request) {
  const signature = request.headers.get('x-lynk-signature')
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const merchantKey = process.env.LYNK_MERCHANT_KEY
  if (!supabaseUrl || !serviceRoleKey || !merchantKey) {
    console.error('Lynk webhook environment variables are not configured')
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 500 })
  }

  let body: LynkPayload
  try {
    body = await request.json() as LynkPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const refIdValue = body.data?.message_data?.refId ?? body.refId
  const amountValue = body.data?.message_data?.totals?.grandTotal ?? body.grandTotal
  const messageIdValue = body.data?.message_id ?? body.message_id

  if (refIdValue == null || amountValue == null || messageIdValue == null) {
    return NextResponse.json({ error: 'Missing refId, grandTotal, or message_id' }, { status: 400 })
  }

  const refId = String(refIdValue)
  const amount = String(amountValue)
  const messageId = String(messageIdValue)
  if (!refId || !amount || !messageId || !Number.isFinite(Number(amount))) {
    return NextResponse.json({ error: 'Invalid webhook fields' }, { status: 400 })
  }

  if (!isValidSignature(refId, amount, messageId, signature, merchantKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await supabase.from('lynk_orders').insert({
    message_id: messageId,
    ref_id: refId,
    amount: Number(amount),
    raw_payload: body,
  })

  if (error && error.code !== '23505') {
    console.error('Failed to store Lynk webhook:', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...(error ? { duplicate: true } : {}) })
}