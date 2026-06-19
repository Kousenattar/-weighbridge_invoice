import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Layout({ darkMode, onToggleDark }: LayoutProps) {
  return (
    <div className={darkMode ? 'dark' : ''}>
      <Sidebar darkMode={darkMode} onToggleDark={onToggleDark} />
      <main className="main-content">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
        }}
      />
    </div>
  );
}
