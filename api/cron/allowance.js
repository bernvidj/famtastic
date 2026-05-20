// ============================================
// FamTastic — Cron: Weekly allowance payout
// Runs daily, pays out on each child's payday
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jwyivcakhwyapzllwndd.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized calls
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase.rpc('pay_weekly_allowance');

    if (error) {
      console.error('Allowance error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, result: data });
  } catch (err) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
