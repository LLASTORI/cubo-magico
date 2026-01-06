import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requester is a super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !requester) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if requester is super_admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)
      .single();

    if (roleData?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only super admins can delete users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, confirmEmail } = await req.json();

    if (!userId || !confirmEmail) {
      return new Response(JSON.stringify({ error: 'userId and confirmEmail are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Super admin ${requester.email} is deleting user ${userId}`);

    // Get user info before deletion for logging
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify email matches for safety
    if (targetUser.email?.toLowerCase() !== confirmEmail.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Email confirmation does not match' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent deleting yourself
    if (userId === requester.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the deletion attempt before proceeding
    await supabase.from('admin_audit_logs').insert({
      admin_id: requester.id,
      action: 'user_deletion_initiated',
      target_type: 'user',
      target_id: userId,
      details: {
        target_email: targetUser.email,
        target_name: targetUser.full_name,
        confirmed_email: confirmEmail,
      },
    });

    // Delete related data in order (respecting foreign keys)
    const deletionLog: string[] = [];

    // 1. Delete from project_invites (as inviter or invitee)
    const { error: invitesError } = await supabase
      .from('project_invites')
      .delete()
      .or(`invited_by.eq.${userId},email.eq.${targetUser.email}`);
    if (!invitesError) deletionLog.push('project_invites');

    // 2. Delete from project_members
    const { error: membersError } = await supabase
      .from('project_members')
      .delete()
      .eq('user_id', userId);
    if (!membersError) deletionLog.push('project_members');

    // 3. Delete from member_permissions
    const { error: permsError } = await supabase
      .from('member_permissions')
      .delete()
      .eq('user_id', userId);
    if (!permsError) deletionLog.push('member_permissions');

    // 4. Delete from subscriptions
    const { error: subsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
    if (!subsError) deletionLog.push('subscriptions');

    // 5. Delete from user_roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (!rolesError) deletionLog.push('user_roles');

    // 6. Delete from terms_acceptances
    const { error: termsError } = await supabase
      .from('terms_acceptances')
      .delete()
      .eq('user_id', userId);
    if (!termsError) deletionLog.push('terms_acceptances');

    // 7. Delete from user_activity_logs
    const { error: activityError } = await supabase
      .from('user_activity_logs')
      .delete()
      .eq('user_id', userId);
    if (!activityError) deletionLog.push('user_activity_logs');

    // 8. Delete from notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (!notifError) deletionLog.push('notifications');

    // 9. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (!profileError) deletionLog.push('profiles');

    // 10. Finally, delete from auth.users using admin API
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(JSON.stringify({ 
        error: 'Failed to delete auth user',
        details: authDeleteError.message,
        partialDeletion: deletionLog,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    deletionLog.push('auth.users');

    // Log successful deletion
    await supabase.from('admin_audit_logs').insert({
      admin_id: requester.id,
      action: 'user_deleted',
      target_type: 'user',
      target_id: userId,
      details: {
        target_email: targetUser.email,
        target_name: targetUser.full_name,
        deleted_from: deletionLog,
      },
    });

    console.log(`User ${targetUser.email} (${userId}) successfully deleted by ${requester.email}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `User ${targetUser.email} deleted successfully`,
      deleted_from: deletionLog,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
