'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.push('/login');
    } else if (user.role === 'admin') {
      router.push('/data-entry');
    } else if (user.role === 'agent') {
      router.push('/agent-dashboard');
    }
  }, [user, loading, initialized, router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      Redirecting...
    </div>
  );
}