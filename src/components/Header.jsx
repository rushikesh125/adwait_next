'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => logout();
  
  const handleHomeClick = () => {
    if (user?.role === 'admin') router.push('/data-entry');
    else if (user?.role === 'agent') router.push('/agent-dashboard');
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="header-title" onClick={handleHomeClick}>
          Adwait Tours
        </h1>

        <nav className={`header-nav ${drawerOpen ? 'open' : ''}`}>
          <button onClick={handleHomeClick}>Home</button>
          <button onClick={handleLogout}>Logout</button>
          <button onClick={handleProfileClick}>Profile</button>
        </nav>

        <div
          className="hamburger"
          onClick={() => setDrawerOpen((prev) => !prev)}
        >
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>
      </div>
    </header>
  );
}