import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const MISSING_ENV = !URL || !KEY

function makeQuery() {
  const res = Promise.resolve({ data: null, error: { message: 'Missing Supabase env vars' } })
  const q = {
    order: () => res,
    limit: () => res,
    eq: () => ({ maybeSingle: () => res, single: () => res }),
    maybeSingle: () => res,
    single: () => res
  }
  return q
}

function makeDummy() {
  return {
    from: () => ({
      select: () => makeQuery(),
      insert: () => Promise.resolve({ data: null, error: { message: 'Missing Supabase env vars' } }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Missing Supabase env vars' } }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
    }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ error: { message: 'Missing Supabase env vars' } }),
        createSignedUrl: async () => ({ data: {} })
      })
    },
    functions: { invoke: async () => ({ error: { message: 'Missing Supabase env vars' } }) }
  }
}

export const supabase = MISSING_ENV ? makeDummy() : createClient(URL, KEY)

export const DOC_TYPES = ['invoice', 'chalan', 'nid', 'chassis', 'tin']
export const DOC_LABEL = {
  invoice: 'Invoice / Temporary Invoice',
  chalan: 'Delivery Chalan',
  nid: 'Customer NID',
  chassis: 'Vehicle Chassis Number Picture',
  tin: 'TIN (Only required for Cash sale)'
}

export function requiredDocs(saleType) {
  return saleType === 'cash'
    ? ['invoice', 'chalan', 'nid', 'chassis', 'tin']
    : ['invoice', 'chalan', 'nid', 'chassis']
}