// Hook: loads unlocked achievements, tracks new-since-last-visit
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { unlockAchievement } from './unlock';
import { TOTAL_ACHIEVEMENTS } from './achievementDefs';

const VISIT_KEY = id => `famtastic_ach_visit_${id}`;

export function useAchievements(familyId, memberId) {
  const [unlocked,  setUnlocked]  = useState({});   // { achievement_id: unlocked_at }
  const [newCount,  setNewCount]  = useState(0);

  const load = useCallback(async () => {
    if (!memberId) return;
    const { data } = await supabase.rpc('get_member_achievements', { p_member_id: memberId });
    const map = {};
    (data || []).forEach(a => { map[a.achievement_id] = a.unlocked_at; });
    setUnlocked(map);

    const lastVisit = localStorage.getItem(VISIT_KEY(memberId)) || '1970-01-01T00:00:00Z';
    const fresh = (data || []).filter(a => a.unlocked_at > lastVisit).length;
    setNewCount(fresh);

    // Meta-achievements based on total unlocked count
    const total = (data || []).length;
    if (total >= 10)              unlockAchievement(familyId, memberId, 'achievements_10');
    if (total >= 25)              unlockAchievement(familyId, memberId, 'achievements_25');
    if (total >= TOTAL_ACHIEVEMENTS) unlockAchievement(familyId, memberId, 'achievements_all');
  }, [memberId, familyId]);

  useEffect(() => { load(); }, [load]);

  function markVisited() {
    if (!memberId) return;
    localStorage.setItem(VISIT_KEY(memberId), new Date().toISOString());
    setNewCount(0);
  }

  return { unlocked, newCount, reload: load, markVisited };
}
