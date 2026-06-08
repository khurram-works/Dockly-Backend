import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
  // service_role key gives full storage access
  // never expose this on the frontend — backend only
)

export default supabase