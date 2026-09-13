import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { email, full_name, business_name, phone, address, module_name } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email aur naam zaroori hain' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Kya is-email-se-pehle-se-account-hai?
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (alreadyExists) {
      return res.status(409).json({ error: 'Is email se pehle se ek account hai. Kripya Login page se login karein.' });
    }

    const siteUrl = process.env.SITE_URL || 'https://www.bahibox.com';
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/set-password`,
      data: { full_name, role: 'merchant' }
    });

    if (inviteError) {
      return res.status(500).json({ error: inviteError.message });
    }

    const newUserId = inviteData.user.id;

    await supabaseAdmin.from('users').update({
      full_name, phone: phone || null, email
    }).eq('id', newUserId);

    const businessType = getBusinessTypeFromModule(module_name);
    const { data: newTenantId, error: bootstrapError } = await supabaseAdmin.rpc('bootstrap_merchant_tenant', {
      p_user_id: newUserId,
      p_business_name: business_name || `${full_name}'s Business`,
      p_business_type: businessType
    });

    if (bootstrapError) {
      console.error('Bootstrap error:', bootstrapError.message);
    } else if (newTenantId && address) {
      const { data: branches } = await supabaseAdmin.from('branches').select('id').eq('tenant_id', newTenantId).eq('is_main_branch', true);
      if (branches && branches.length > 0) {
        await supabaseAdmin.from('branches').update({ address }).eq('id', branches[0].id);
      }
    }

    res.json({ success: true, tenant_id: newTenantId, user_id: newUserId });
  } catch (err: any) {
    console.error('Error inviting merchant:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

function getBusinessTypeFromModule(moduleName: string): any {
  const map: Record<string, string> = {
    'Retail POS': 'retail',
    'Manufacturing ERP': 'manufacturing',
    'Hotel/Restaurant': 'hospitality',
    'Health Care': 'healthcare',
    'Education': 'education',
    'Transport Management': 'logistics',
    'Agri Management': 'agri',
    'Daily Services': 'services'
  };
  return map[moduleName] || 'retail';
}
