import React from 'react';
import { User } from '../types.ts';
import LoginView from './LoginView.tsx';

interface LoginViewBMProps {
  onLoginSuccess: (user: User, token: string) => void;
  initialError?: string | null;
  redirectPath?: string;
}

/**
 * Bahasa Melayu entry point. The screen itself lives in `LoginView`; keeping
 * this wrapper means existing imports and the `/bm` route stay unchanged.
 */
export default function LoginViewBM({ onLoginSuccess, initialError = null, redirectPath = '/bm' }: LoginViewBMProps) {
  return (
    <LoginView
      onLoginSuccess={onLoginSuccess}
      initialError={initialError}
      redirectPath={redirectPath}
      lang="bm"
    />
  );
}
