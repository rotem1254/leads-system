const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const url = process.env.SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY

let client = null
let warnedMissing = false

/**
 * מחזיר לקוח Supabase או null אם חסרים משתני סביבה — כדי שהשרת יוכל לעלות בלי DB.
 */
function getSupabase() {
  if (!url || !key) {
    if (!warnedMissing) {
      warnedMissing = true
      console.warn(
        '[config] חסרים SUPABASE_URL ומפתח Supabase (SERVICE_ROLE או ANON) ב-.env — נתיבי /api/leads יחזירו שגיאה עד שישלימו'
      )
    }
    return null
  }
  if (!client) {
    client = createClient(url, key)
  }
  return client
}

module.exports = { getSupabase }
