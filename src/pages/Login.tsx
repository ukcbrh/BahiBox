import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Store, ShieldCheck } from "lucide-react";

;


export default function Login() {
  useDocumentTitle("BahiBox | Login");
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPricingLink, setShowPricingLink] = useState(false);

  const {
    signInWithGoogle,
    signInWithEmail,
    user,
    loading,
    isSuperAdmin,
    availableRoles,
    currentRole,
    selectRole,
    logout,
  } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    const checkRoles = async () => {
      if (!loading && user) {
        if (isSuperAdmin) {
          navigate("/superadmin");
        } else if (currentRole) {
          import("../lib/supabase").then(async ({ getSupabaseClient }) => {
            const supabase = getSupabaseClient();
            if (supabase && user) {
              const roleInfo = availableRoles.find(
                (r) => r.role_name === currentRole,
              );
              if (roleInfo && roleInfo.tenant_id) {
                const { data: tenant, error: tenantErr } = await supabase
                  .from("tenants")
                  .select("service_mode")
                  .eq("id", roleInfo.tenant_id)
                  .single();
                
                const { data: provider, error: providerErr } = await supabase
                  .from("service_providers")
                  .select("provider_type")
                  .eq("user_id", user.id)
                  .eq("tenant_id", roleInfo.tenant_id)
                  .maybeSingle();
                
                if (
                  tenant?.service_mode === "individual" &&
                  provider?.provider_type?.toLowerCase() === "rider"
                ) {
                  if (isMounted) navigate("/rider-app");
                } else {
                  if (isMounted) navigate("/merchant-dashboard");
                }
              } else {
                if (isMounted) navigate("/merchant-dashboard");
              }
            } else {
              if (isMounted) navigate("/merchant-dashboard");
            }
          }).catch(console.error);
        } else if (availableRoles.length === 0) {
          // Debounce: Supabase ka auth-state kabhi-kabhi momentarily 
          // khali availableRoles ke saath fire hota hai (race-condition), 
          // usse turant-logout na ho isliye 500ms wait karte hain — agar 
          // isi beech fresh-data aa gaya (currentRole set ho gaya), toh 
          // cleanup is timer ko cancel kar dega, logout kabhi hoga hi nahi
          logoutTimer = setTimeout(() => {
            import("../lib/supabase").then(async ({ getSupabaseClient }) => {
              const supabase = getSupabaseClient();
              if (supabase && isMounted) {
                const { data: consumer } = await supabase.from("consumer_profiles").select("*").eq("user_id", user.id).maybeSingle();
                if (!isMounted) {
                  return;
                }
                await logout();
                if (isMounted) {
                  if (consumer) {
                    setError("This is the Merchant/Partner login portal. Customers should log in via the Customer App.");
                    setShowPricingLink(false);
                  } else {
                    setError("You don't have an active subscription yet. Please choose a plan and subscribe first to create your business account.");
                    setShowPricingLink(true);
                  }
                }
              }
            });
          }, 500);
        } else if (availableRoles.length === 1 && !currentRole) {
          selectRole(availableRoles[0]);
        } else {
        }
      }
    };
    checkRoles();
    return () => {
      isMounted = false;
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [
    user,
    loading,
    isSuperAdmin,
    currentRole,
    availableRoles,
    navigate,
    logout,
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setIsLoggingIn(true);
      let loginEmail = identifier;
      // If it's a User ID without @ symbol, append a domain to make it an email for Firebase Auth
      if (!identifier.includes("@")) {
        loginEmail = `${identifier}@staff.bahibox.local`;
      }
      await signInWithEmail(loginEmail, password);
    } catch (err: any) {
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError("Please enter your email to reset password.");
      return;
    }
    if (!identifier.includes("@")) {
      setError("Password reset is only supported for email accounts.");
      return;
    }
    try {
      setError("");
      setIsLoggingIn(true);
      const { getSupabaseClient } = await import("../lib/supabase");
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          identifier,
          {
            redirectTo: `${window.location.origin}?reset_password=true`,
          },
        );
        if (resetError) throw resetError;
        setError("Check your email for a reset link!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setIsLoggingIn(true);
      await signInWithGoogle();
    } catch (err: any) {
      if (
        err?.message?.includes("OAuth secret") ||
        err?.message?.includes("Unsupported provider")
      ) {
        setError(
          "Google Sign-In requires configuring Google OAuth Client ID and Secret in your Supabase Dashboard under Authentication > Providers.",
        );
      } else {
        setError("Failed to sign in with Google: " + err.message);
      }
      setIsLoggingIn(false);
    }
  };

  if (
    user &&
    !loading &&
    !isSuperAdmin &&
    !currentRole &&
    availableRoles.length > 0
  ) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 flex flex-col justify-center items-center p-4">

        <div
          className="mb-8 flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img
            src="/logolight.png"
            alt="BahiBox Logo"
            className="h-28 md:h-36 dark:hidden object-contain"
          />
          <img
            src="/logodark.png"
            alt="BahiBox Logo"
            className="h-28 md:h-36 hidden dark:block object-contain"
          />
        </div>
        <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Select Business
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              You have access to multiple businesses. Please choose one to
              continue.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {availableRoles.map((role, idx) => (
                <button
                  key={idx}
                  onClick={() => selectRole(role)}
                  className="flex items-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg group-hover:bg-blue-100 mr-4 transition-colors">
                    <Store className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-900">
                        {role.tenant_name || "Unnamed Business"}
                      </h4>
                      {role.status === "suspended" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                          SUSPENDED
                        </span>
                      )}
                      {role.status === "deleted" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          DELETED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-blue-700 capitalize">
                      Role: {role.role_name} • {role.business_type}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <Button
                variant="ghost"
                onClick={logout}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel & Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 flex flex-col justify-center items-center p-4">

      <div
        className="mb-8 flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <img
          src="/logolight.png"
          alt="BahiBox Logo"
          className="h-28 md:h-36 dark:hidden object-contain"
        />
        <img
          src="/logodark.png"
          alt="BahiBox Logo"
          className="h-28 md:h-36 hidden dark:block object-contain"
        />
      </div>
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            BahiBox Login
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Sign in to your account
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm space-y-2">
              <p>{error}</p>
              {showPricingLink && (
                <Button type="button" size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate('/pricing')}>
                  View Plans & Subscribe
                </Button>
              )}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email Address or User ID
              </label>
              <Input
                type="text"
                placeholder="Enter email or User ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isLoggingIn || loading}
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn || loading}
          >
            Sign in with Google
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full mt-2"
            onClick={() => navigate("/")}
          >
            Back to Home Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
