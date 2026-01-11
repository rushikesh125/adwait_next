'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/AccommodationScreens/Login';

export default function LoginPage() {
  const { user, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && user) {
      if (user.role === 'admin') {
        router.push('/data-entry');
      } else if (user.role === 'agent') {
        router.push('/agent-dashboard');
      }
    }
  }, [user, initialized, router]);

  return <Login />;
}