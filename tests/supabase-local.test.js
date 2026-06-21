import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

if (!anonKey || !serviceKey) {
  throw new Error('Set SUPABASE_TEST_ANON_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY to the local Supabase keys.')
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const password = `Local-test-${runId}!`
const identities = {
  ownerA: { email: `owner-a-${runId}@example.test`, fullName: 'RLS Owner A' },
  ownerB: { email: `owner-b-${runId}@example.test`, fullName: 'RLS Owner B' },
  admin: { email: `admin-${runId}@example.test`, fullName: 'RLS Admin' },
}

const users = {}
const clients = {}
let applicationId
let ownerDocumentPath
let submittedApplicationId
let submittedDocumentPath
let correctedDocumentPath

async function createIdentity(name, role = 'owner') {
  const identity = identities[name]
  const { data, error } = await service.auth.admin.createUser({
    email: identity.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: identity.fullName },
  })
  if (error) throw error

  users[name] = data.user
  if (role === 'admin') {
    const { error: roleError } = await service.from('profiles').update({ role: 'admin', initials: 'RA' }).eq('id', data.user.id)
    if (roleError) throw roleError
  }

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email: identity.email, password })
  if (signInError) throw signInError
  clients[name] = client
}

beforeAll(async () => {
  await createIdentity('ownerA')
  await createIdentity('ownerB')
  await createIdentity('admin', 'admin')

  const { data, error } = await clients.ownerA.from('applications').insert({
    owner_id: users.ownerA.id,
    owner_full_name: identities.ownerA.fullName,
    business_name: 'Owner A Test Store',
    nature_of_business: 'Retail',
    ownership_type: 'Sole Proprietorship',
    application_type: 'New',
    contact_number: '09170000000',
    business_address: 'Barangay Napindan, Taguig City',
  }).select('id').single()
  if (error) throw error
  applicationId = data.id

  ownerDocumentPath = `${users.ownerA.id}/${applicationId}/proof.txt`
  const { error: uploadError } = await clients.ownerA.storage.from('application-docs').upload(
    ownerDocumentPath,
    new Blob(['RLS owner A document'], { type: 'text/plain' }),
  )
  // The bucket intentionally permits only PDF/JPEG/PNG, so use a tiny PNG payload.
  if (uploadError) {
    ownerDocumentPath = `${users.ownerA.id}/${applicationId}/proof.png`
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })
    const { error: pngError } = await clients.ownerA.storage.from('application-docs').upload(ownerDocumentPath, png)
    if (pngError) throw pngError
  }

  const { error: documentError } = await clients.ownerA.from('application_documents').insert({
    application_id: applicationId,
    owner_id: users.ownerA.id,
    storage_path: ownerDocumentPath,
    file_name: 'proof.png',
    mime_type: 'image/png',
    file_size: 8,
  })
  if (documentError) throw documentError
}, 30_000)

afterAll(async () => {
  if (ownerDocumentPath) await service.storage.from('application-docs').remove([ownerDocumentPath])
  if (submittedDocumentPath) await service.storage.from('application-docs').remove([submittedDocumentPath])
  if (correctedDocumentPath) await service.storage.from('application-docs').remove([correctedDocumentPath])
  if (applicationId) await service.from('applications').delete().eq('id', applicationId)
  if (submittedApplicationId) await service.from('applications').delete().eq('id', submittedApplicationId)
  for (const user of Object.values(users)) await service.auth.admin.deleteUser(user.id)
})

describe('local Supabase RLS boundaries', () => {
  it('allows Owner A to read their application', async () => {
    const { data, error } = await clients.ownerA.from('applications').select('id').eq('id', applicationId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('hides Owner A application and document metadata from Owner B', async () => {
    const applicationResult = await clients.ownerB.from('applications').select('id').eq('id', applicationId)
    const documentResult = await clients.ownerB.from('application_documents').select('id').eq('application_id', applicationId)
    expect(applicationResult.error).toBeNull()
    expect(applicationResult.data).toEqual([])
    expect(documentResult.error).toBeNull()
    expect(documentResult.data).toEqual([])
  })

  it('prevents Owner B from updating or deleting Owner A application', async () => {
    const updateResult = await clients.ownerB.from('applications').update({ business_name: 'Tampered' }).eq('id', applicationId).select('id')
    const deleteResult = await clients.ownerB.from('applications').delete().eq('id', applicationId).select('id')
    expect(updateResult.error).toBeNull()
    expect(updateResult.data).toEqual([])
    expect(deleteResult.error).toBeNull()
    expect(deleteResult.data).toEqual([])
  })

  it('denies Owner B access to Owner A storage folder', async () => {
    const downloadResult = await clients.ownerB.storage.from('application-docs').download(ownerDocumentPath)
    const foreignUpload = `${users.ownerA.id}/${applicationId}/owner-b.png`
    const uploadResult = await clients.ownerB.storage.from('application-docs').upload(
      foreignUpload,
      new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    )
    expect(downloadResult.error).not.toBeNull()
    expect(uploadResult.error).not.toBeNull()
  })

  it('denies owners access to generated clearances and barangay settings', async () => {
    const clearanceResult = await clients.ownerA.storage.from('generated-clearances').list('')
    const settingsRead = await clients.ownerA.from('barangay_settings').select('*')
    const settingsUpdate = await clients.ownerA.from('barangay_settings').update({ validity_year: 2099 }).eq('id', true).select('id')
    expect(clearanceResult.error).toBeNull()
    expect(clearanceResult.data).toEqual([])
    expect(settingsRead.error).toBeNull()
    expect(settingsRead.data).toEqual([])
    expect(settingsUpdate.error).toBeNull()
    expect(settingsUpdate.data).toEqual([])
  })

  it('allows admins to read all applications and supporting documents', async () => {
    const applicationResult = await clients.admin.from('applications').select('id').eq('id', applicationId)
    const documentResult = await clients.admin.from('application_documents').select('id').eq('application_id', applicationId)
    const downloadResult = await clients.admin.storage.from('application-docs').download(ownerDocumentPath)
    expect(applicationResult.error).toBeNull()
    expect(applicationResult.data).toHaveLength(1)
    expect(documentResult.error).toBeNull()
    expect(documentResult.data).toHaveLength(1)
    expect(downloadResult.error).toBeNull()
  })

  it('submits an owner application and document metadata atomically', async () => {
    submittedApplicationId = crypto.randomUUID()
    submittedDocumentPath = `${users.ownerB.id}/${submittedApplicationId}/proof.png`
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })
    const uploadResult = await clients.ownerB.storage.from('application-docs').upload(submittedDocumentPath, png)
    expect(uploadResult.error).toBeNull()

    const submission = await clients.ownerB.rpc('submit_owner_application', {
      application_id: submittedApplicationId,
      owner_full_name: identities.ownerB.fullName,
      business_name: 'Owner B RPC Store',
      nature_of_business: 'Retail',
      ownership_type: 'Sole Proprietorship',
      application_type: 'New',
      contact_number: '09170000001',
      business_address: 'Barangay Napindan, Taguig City',
      documents: [{ storage_path: submittedDocumentPath, file_name: 'proof.png', mime_type: 'image/png', file_size: 8 }],
    })
    expect(submission.error).toBeNull()
    expect(submission.data).toBe(submittedApplicationId)

    const ownerRead = await clients.ownerB.from('applications').select('status').eq('id', submittedApplicationId).single()
    const metadataRead = await clients.ownerB.from('application_documents').select('storage_path').eq('application_id', submittedApplicationId).single()
    const otherOwnerRead = await clients.ownerA.from('applications').select('id').eq('id', submittedApplicationId)
    expect(ownerRead.data?.status).toBe('Pending Review')
    expect(metadataRead.data?.storage_path).toBe(submittedDocumentPath)
    expect(otherOwnerRead.data).toEqual([])
  })

  it('allows only the owner to atomically resubmit an Action Required document set', async () => {
    const adminUpdate = await clients.admin.from('applications').update({ status: 'Action Required', remarks: 'Upload a clearer registration copy.' }).eq('id', applicationId)
    expect(adminUpdate.error).toBeNull()

    correctedDocumentPath = `${users.ownerA.id}/${applicationId}/correction-proof.png`
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })
    const uploadResult = await clients.ownerA.storage.from('application-docs').upload(correctedDocumentPath, png)
    expect(uploadResult.error).toBeNull()

    const foreignAttempt = await clients.ownerB.rpc('resubmit_owner_application', {
      application_id: applicationId,
      documents: [{ storage_path: correctedDocumentPath, file_name: 'correction-proof.png', mime_type: 'image/png', file_size: 8 }],
    })
    expect(foreignAttempt.error).not.toBeNull()

    const correction = await clients.ownerA.rpc('resubmit_owner_application', {
      application_id: applicationId,
      documents: [{ storage_path: correctedDocumentPath, file_name: 'correction-proof.png', mime_type: 'image/png', file_size: 8 }],
    })
    expect(correction.error).toBeNull()
    expect(correction.data).toContain(ownerDocumentPath)

    const applicationRead = await clients.ownerA.from('applications').select('status, remarks').eq('id', applicationId).single()
    const documentsRead = await clients.ownerA.from('application_documents').select('storage_path').eq('application_id', applicationId)
    expect(applicationRead.data).toEqual({ status: 'Pending Review', remarks: 'Upload a clearer registration copy.' })
    expect(documentsRead.data).toEqual([{ storage_path: correctedDocumentPath }])
  })
})
