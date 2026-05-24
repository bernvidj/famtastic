// Fire-and-forget: call Edge Function to send push to other family members
import { supabase } from '../supabaseClient';

export async function sendPushToFamily({ familyId, excludeMemberId, title, body }) {
  try {
    await supabase.functions.invoke('send-push', {
      body: {
        family_id:         familyId,
        exclude_member_id: excludeMemberId,
        title,
        body,
      },
    });
  } catch (err) {
    // Push errors are non-fatal — app continues normally
    console.warn('sendPush failed:', err);
  }
}
