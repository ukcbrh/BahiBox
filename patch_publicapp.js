const fs = require('fs');
const file = 'src/pages/PublicApp.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const { user } = useAuth();',
  'const { user, logout } = useAuth();'
);

const checkNotMerchantEffect = `
  useEffect(() => {
    if (!user) return;
    const checkNotMerchant = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: consumerRole } = await supabase.from('consumer_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (!consumerRole) {
        const { data: merchantRole } = await supabase.from('user_tenant_roles').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
        if (merchantRole && merchantRole.length > 0) {
          await logout();
          toast.error("This account is registered as a merchant/partner account. Please use a different account to shop here.");
        }
      }
    };
    checkNotMerchant();
  }, [user, logout]);
`;

// Insert the effect after const { user, logout } = useAuth();
content = content.replace(
  'const { user, logout } = useAuth();',
  'const { user, logout } = useAuth();' + checkNotMerchantEffect
);

fs.writeFileSync(file, content);
