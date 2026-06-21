import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_LOCAL_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY

const hostname = new URL(url).hostname
if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) {
  throw new Error(`Refusing to seed non-local Supabase URL: ${url}`)
}
if (!serviceKey) {
  throw new Error('Set SUPABASE_LOCAL_SERVICE_ROLE_KEY to the Secret key printed by `supabase status`.')
}

const password = process.env.SUPABASE_SEED_PASSWORD || 'LocalDev123!'
const accounts = [
  { email: 'admin@ilovetaguig.local', fullName: 'Local Barangay Admin', role: 'admin', initials: 'LBA' },
  { email: 'owner.a@ilovetaguig.local', fullName: 'Local Owner A', role: 'owner', initials: null },
  { email: 'owner.b@ilovetaguig.local', fullName: 'Local Owner B', role: 'owner', initials: null },
]

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: existingData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (listError) throw listError

for (const account of accounts) {
  let user = existingData.users.find(({ email }) => email === account.email)

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    })
    if (error) throw error
    user = data.user
  }

  const { error: profileError } = await supabase.from('profiles').update({
    full_name: account.fullName,
    role: account.role,
    initials: account.initials,
  }).eq('id', user.id)
  if (profileError) throw profileError
}

console.log(`Seeded ${accounts.length} local accounts at ${url}`)
console.table(accounts.map(({ email, fullName, role }) => ({ email, password, fullName, role })))
