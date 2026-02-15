import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isOnboardingDone, checkOnboardingFromDB } from '@/pages/OnboardingPage';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: error.message
        });
        navigate('/');
        return;
      }

      if (session) {
        toast({
          title: "E-Mail bestätigt!",
          description: "Ihr Konto wurde erfolgreich aktiviert.",
        });

        const userId = session.user.id;

        // Check onboarding status — redirect accordingly
        if (isOnboardingDone(userId)) {
          navigate('/dashboard', { replace: true });
        } else {
          const doneInDB = await checkOnboardingFromDB(userId);
          navigate(doneInDB ? '/dashboard' : '/onboarding', { replace: true });
        }
      } else {
        navigate('/');
      }
    };

    handleEmailConfirmation();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-bold">E-Mail wird bestätigt...</h2>
        <p className="text-muted-foreground">Einen Moment bitte.</p>
      </div>
    </div>
  );
}
