import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Service role client - bypasses RLS for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Create a client with user's JWT for RLS
export function createUserClient(accessToken: string) {
    return createClient(supabaseUrl, supabaseServiceKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    })
}
