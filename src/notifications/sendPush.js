// Fire-and-forget: call Edge Function to send push notifications
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
    console.warn('sendPush failed:', err);
  }
}

export async function sendPushToMember({ memberId, title, body }) {
  try {
    await supabase.functions.invoke('send-push', {
      body: { member_id: memberId, title, body },
    });
  } catch (err) {
    console.warn('sendPush failed:', err);
  }
}
