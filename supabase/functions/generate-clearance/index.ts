import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts } from 'npm:pdf-lib@1.17.1'
import { templateBytes } from './template.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Authentication required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Function is not configured' }, 500)

  try {
    const { applicationId, remarks = '', checklist = {} } = await request.json()
    if (!applicationId) return json({ error: 'applicationId is required' }, 400)

    // User-scoped RPCs provide the authorization boundary and lock the row.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const { data: clearance, error: prepareError } = await userClient.rpc('prepare_clearance', {
      application_id: applicationId,
      admin_remarks: remarks,
      checklist,
    })
    if (prepareError) return json({ error: prepareError.message }, 403)

    const pdf = await PDFDocument.load(templateBytes)
    const form = pdf.getForm()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const issued = new Date(clearance.approved_at)
    const dateParts = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila', day: 'numeric', month: 'long', year: 'numeric',
    }).formatToParts(issued)
    const part = (type: string) => dateParts.find((item) => item.type === type)?.value ?? ''

    const values: Record<string, string> = {
      owner_full_name: clearance.owner_full_name,
      business_name: clearance.business_name,
      business_address: clearance.business_address,
      reference_no: clearance.reference_no,
      ownership_type: clearance.ownership_type,
      status: clearance.application_type,
      issued_day: part('day'),
      issued_month: part('month'),
      validity_date: new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric',
      }).format(new Date(`${clearance.validity_date}T00:00:00+08:00`)),
      approved_by: clearance.approved_by_name,
      clerk_initial: clearance.clerk_initial,
    }
    for (const [name, value] of Object.entries(values)) form.getTextField(name).setText(value)
    form.updateFieldAppearances(font)
    form.flatten()

    const path = `${applicationId}/${clearance.reference_no}.pdf`
    const bytes = await pdf.save()
    const { error: uploadError } = await adminClient.storage.from('generated-clearances').upload(path, bytes, {
      contentType: 'application/pdf', upsert: true,
    })
    if (uploadError) return json({ error: `PDF storage failed: ${uploadError.message}`, retryable: true }, 500)

    const { error: finalizeError } = await userClient.rpc('finalize_clearance', {
      application_id: applicationId,
      clearance_path: path,
    })
    if (finalizeError) return json({ error: finalizeError.message, retryable: true }, 409)

    return json({ applicationId, referenceNo: clearance.reference_no, status: 'Proceed to Barangay Hall' })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Clearance generation failed', retryable: true }, 500)
  }
})
