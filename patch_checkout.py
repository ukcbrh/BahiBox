import sys

with open('src/pages/Checkout.tsx', 'r') as f:
    content = f.read()

target = """        let finalAuthError = authError;
        if (authError && authError.message.includes('registered')) {
           const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
               email: formData.email,
               password: formData.password
           });
           if (!signInError && signInData.user) {
               currentUserId = signInData.user.id;
               finalAuthError = null;
               isNewUser = false;
           } else {
               finalAuthError = signInError || { message: "Account already exists but could not log in.", name: "AuthError" } as any;
           }
        } else if (!authError) {"""

new_code = """        let finalAuthError = authError;
        if (authError && authError.message.includes('registered')) {
           alert('An account with this email already exists. Please log in first from the Login page, then subscribe to this plan from your Merchant Dashboard.');
           setIsProcessing(false);
           navigate('/login');
           return;
        } else if (!authError) {"""

if target in content:
    content = content.replace(target, new_code)
    with open('src/pages/Checkout.tsx', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
