import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MFAFactor {
  id: string;
  factor_type: 'totp' | 'phone';
  friendly_name?: string;
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

export const useMFA = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  // List enrolled MFA factors
  const listFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error listing MFA factors:', error);
      return null;
    }
  };

  // Enroll TOTP (start enrollment)
  const enrollTOTP = async (friendlyName: string = 'Authenticator App') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      });
      
      if (error) throw error;
      
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      
      return { success: true, data };
    } catch (error: any) {
      toast({
        title: 'Erro ao configurar 2FA',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Verify TOTP enrollment
  const verifyTOTPEnrollment = async (code: string) => {
    if (!factorId) {
      toast({
        title: 'Erro',
        description: 'Nenhum fator para verificar',
        variant: 'destructive',
      });
      return { success: false };
    }

    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) throw error;

      // Clear enrollment state
      setQrCode(null);
      setSecret(null);
      setFactorId(null);

      toast({
        title: '2FA ativado!',
        description: 'Autenticação de dois fatores configurada com sucesso.',
      });

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Unenroll a factor (disable 2FA)
  const unenrollFactor = async (factorIdToRemove: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorIdToRemove,
      });

      if (error) throw error;

      toast({
        title: '2FA desativado',
        description: 'Autenticação de dois fatores foi removida.',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao desativar 2FA',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Challenge and verify (during login)
  const challengeAndVerify = async (factorIdToVerify: string, code: string) => {
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorIdToVerify,
      });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorIdToVerify,
        challengeId: challengeData.id,
        code,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Get current AAL (Authenticator Assurance Level)
  const getAAL = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting AAL:', error);
      return null;
    }
  };

  // Cancel enrollment
  const cancelEnrollment = () => {
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
  };

  return {
    loading,
    qrCode,
    secret,
    factorId,
    enrollTOTP,
    verifyTOTPEnrollment,
    unenrollFactor,
    listFactors,
    challengeAndVerify,
    getAAL,
    cancelEnrollment,
  };
};
