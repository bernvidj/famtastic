// Shared utility — fire-and-forget achievement unlock
import { supabase } from '../supabaseClient';

export async function unlockAchievement(familyId, memberId, achievementId) {
  if (!familyId || !memberId || !achievementId) return false;
  const { data } = await supabase.rpc('unlock_achievement', {
    p_family_id:      familyId,
    p_member_id:      memberId,
    p_achievement_id: achievementId,
  });
  return data === true;
}
