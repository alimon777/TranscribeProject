// src/components/AppBar.js

import React, { useState } from 'react'; // Removed useEffect
import { Link, useLocation } from 'react-router-dom';
import {
  UploadCloud,
  Clock,
  FolderKanban,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppBar() {
  const location = useLocation();
  
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const navItems = [
    { path: '/upload', label: 'Upload', Icon: UploadCloud },
    { path: '/pending-reviews', label: 'Pending', Icon: Clock },
    { path: '/repository', label: 'Repository', Icon: FolderKanban },
    { path: '/admin', label: 'Admin', Icon: Settings },
  ];

  // MODIFIED: This function now handles everything: updating the DOM, localStorage, and state.
  const handleThemeSwitch = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    const htmlElement = document.documentElement;

    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    setCurrentTheme(newTheme);
  };

  const handleLogout = () => {
    console.log('Logout action triggered');
    alert('Logout clicked!');
  };

  return (
    <header className="bg-card py-3 px-4 md:px-6 sticky top-0 z-50 border-b">
      <div className="max-w-full mx-auto flex justify-between items-center px-6">
        <Link
          to="/"
          className="text-lg md:text-xl font-semibold text-primary no-underline"
        >
          Intelligent Processor
        </Link>
        <nav className="flex gap-1 sm:gap-2 items-center">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={
                location.pathname === item.path ? 'secondary' : 'ghost'
              }
              size="sm"
              asChild
            >
              <Link to={item.path} className="flex items-center">
                <item.Icon className="h-4 w-4 md:mr-1.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="cursor-pointer">
                <User className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal py-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleThemeSwitch} className="cursor-pointer">
                {currentTheme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Switch to {currentTheme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}