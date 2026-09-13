import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';

export default function ConfirmLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [clicked, setClicked] = useState(false);
  const [error, setError] = useState('');

  // NEW mechanism: token_hash + type, verified directly via JS (no
  // followable link to the raw Supabase endpoint, so scanners/crawlers
  // that only fetch/follow links cannot consume the token).
  const tokenHash = searchParams.get('token_hash') || '';
  const otpType = searchParams.get('otp_type') || '';
  const hasTokenHash = !!(tokenHash && otpType);

  // OLD mechanism (still used by the Invite email template): a full
  // confirmation URL embedded in our own query string.
  const rawSearch = window.location.search;
  const marker = 'confirmation_url=';
  const idx = rawSearch.indexOf(marker);
  const confirmationUrl = idx >= 0 ? decodeURIComponent(rawSearch.substring(idx + marker.length)) : '';
  const hasConfirmationUrl = !!confirmationUrl;

  const handleConfirm = async () => {
    setClicked(true);
    setError('');

    if (hasTokenHash) {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Client not ready');
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as any
        });
        if (verifyError) throw verifyError;

        if (otpType === 'recovery') {
          navigate('/?reset_password=true');
        } else {
          navigate('/set-password');
        }
      } catch (err: any) {
        setError('Yeh link expire ho chuka hai ya pehle hi use ho chuka hai. Kripya dobara try karein.');
        setClicked(false);
      }
      return;
    }

    if (hasConfirmationUrl) {
      window.location.href = confirmationUrl;
      return;
    }

    setError('Yeh link invalid hai.');
    setClicked(false);
  };

  const hasValidLink = hasTokenHash || hasConfirmationUrl;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <CardTitle className="text-2xl font-bold">Confirm Your Request</CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            Security ke liye, kripya neeche button dabakar confirm karein.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center text-red-600 text-sm mb-4">{error}</div>
          )}
          {hasValidLink ? (
            <Button onClick={handleConfirm} disabled={clicked} className="w-full h-12 text-base font-bold">
              {clicked ? 'Verifying...' : 'Confirm & Continue'}
            </Button>
          ) : (
            !error && (
              <div className="text-center text-red-600 text-sm">
                Yeh link invalid hai. Kripya dobara try karein ya support se sampark karein.
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
