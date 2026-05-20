// ============================================
// FamTastic — useChildData hook
// Fetches data via RPC for child sessions (no RLS)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: fmtDate(monday),
    end: fmtDate(sunday),
  };
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useChildData(familyId, memberId, isChild) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isChild || !familyId || !memberId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { start, end } = getWeekBounds();

    const { data: result, error } = await supabase.rpc('get_child_dashboard', {
      p_family_id: familyId,
      p_member_id: memberId,
      p_week_start: start,
      p_week_end: end,
    });

    if (!error && result) {
      setData(result);
    }
    setLoading(false);
  }, [familyId, memberId, isChild]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, reload: load };
}
