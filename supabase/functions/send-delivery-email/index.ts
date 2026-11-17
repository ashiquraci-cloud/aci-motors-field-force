import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { file_id } = await req.json()
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: file } = await supa.from('files').select('*').eq('id', file_id).single()
    if (!file) return new Response('no file', { status: 404 })
    // Send once per file
    if (file.email_sent_at) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { 'Content-Type': 'application/json' } })
    }
    const { data: prof } = await supa.from('profiles').select('name,email').eq('id', file.officer_id).single()
    if (!prof?.email) return new Response('no officer email', { status: 400 })

    const subject = `File ${file.code} completed and delivered`
    const body = `Dear ${prof.name || 'Officer'}, your file ${file.code} has been completed and delivered to you. Please log in and tap 'Mark as Paper Received' once you receive the paper file. – ACI Motors Ltd.`

    let status = 'sent'
    let err = ''
    for (let i = 0; i < 2; i++) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: Deno.env.get('FROM_EMAIL'), to: [prof.email], subject, text: body })
      })
      if (r.ok) break
      err = await r.text()
      status = i === 1 ? 'failed' : 'retrying'
    }
    await supa.from('email_log').insert({
      file_id, recipient: prof.email, subject,
      status: status === 'sent' ? 'sent' : 'failed',
      attempts: err ? 2 : 1, last_error: err || ''
    })
    if (status === 'sent') await supa.from('files').update({ email_sent_at: new Date().toISOString() }).eq('id', file_id)
    return new Response(JSON.stringify({ status }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
