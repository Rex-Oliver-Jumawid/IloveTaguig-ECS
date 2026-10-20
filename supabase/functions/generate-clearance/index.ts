import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

const clean = (value: unknown) => String(value ?? '').replace(/\\s+/g, ' ').trim()

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Authentication required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) return json({ error: 'Function is not configured' }, 500)

  try {
    const { applicationId } = await request.json()
    if (typeof applicationId !== 'string' || !/^[a-f0-9-]{36}$/i.test(applicationId)) {
      return json({ error: 'A valid application ID is required' }, 400)
    }

    // The database enforces signed-in administrator access and Approved status.
    // This RPC is read-only. Do not write an issued document or change the application status.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: clearance, error } = await userClient.rpc('prepare_clearance', {
      application_id: applicationId,
    })
    if (error) return json({ error: error.message }, 403)

    const pdf = await PDFDocument.create()
    pdf.setTitle('Business Clearance Workflow - Classroom Demo')
    pdf.setSubject('An educational preview of the clearance application workflow')
    const page = pdf.addPage([595, 842])
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const dark = rgb(0.14, 0.19, 0.25)
    const muted = rgb(0.35, 0.41, 0.47)

    page.drawRectangle({ x: 0, y: 732, width: 595, height: 110, color: rgb(0.14, 0.23, 0.33) })
    page.drawText('CLASSROOM DEMONSTRATION', {
      x: 36, y: 792, size: 18, font: bold, color: rgb(1, 1, 1),
    })
    page.drawText('Business Clearance Application - PDF Preview', {
      x: 36, y: 764, size: 12, font: regular, color: rgb(0.9, 0.94, 0.97),
    })

    const fit = (text: string, width: number, size: number): string => {
      if (regular.widthOfTextAtSize(text, size) <= width) return text
      let shortened = text
      while (shortened.length > 0 && regular.widthOfTextAtSize(shortened + '...', size) > width) {
        shortened = shortened.slice(0, -1)
      }
      return shortened + '...'
    }

    const fields: Array<[string, string]> = [
      ['Applicant', clean(clearance.owner_full_name)],
      ['Business', clean(clearance.business_name)],
      ['Business address', clean(clearance.business_address)],
      ['Ownership type', clean(clearance.ownership_type)],
      ['Application type', clean(clearance.application_type)],
      ['Review reference', clean(clearance.reference_no)],
      ['Review date', new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric',
      }).format(new Date(clearance.approved_at))],
      ['Demo signatory', clean(clearance.approved_by_name)],
      ['Clerk initials', clean(clearance.clerk_initial)],
    ]

    let y = 690
    for (const [label, value] of fields) {
      page.drawText(label.toUpperCase(), { x: 40, y, size: 9, font: bold, color: muted })
      page.drawText(fit(value, 512, 13), { x: 40, y: y - 22, size: 13, font: regular, color: dark })
      y -= 61
    }

    page.drawLine({ start: { x: 40, y: 103 }, end: { x: 555, y: 103 }, thickness: 0.8, color: rgb(0.75, 0.78, 0.8) })
    page.drawText('ACADEMIC DEMO', { x: 40, y: 82, size: 10, font: bold, color: dark })
    page.drawText('Generated for a classroom presentation. No official clearance has been issued.', {
      x: 40, y: 60, size: 9, font: regular, color: muted,
    })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Business-Clearance-Classroom-Demo.pdf"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'PDF preview failed' }, 500)
  }
})
