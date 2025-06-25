import React, { useState, useEffect } from 'react';
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
  const [currentTheme, setCurrentTheme] = useState('light');

  // Effect to set initial theme and observe changes
  useEffect(() => {
    const htmlElement = document.documentElement;

    // Set initial theme state
    const isInitiallyDark = htmlElement.classList.contains('dark');
    setCurrentTheme(isInitiallyDark ? 'dark' : 'light');

    // Observe future changes to the class attribute of the <html> element
    const observer = new MutationObserver(() => {
      setCurrentTheme(htmlElement.classList.contains('dark') ? 'dark' : 'light');
    });

    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const navItems = [
    { path: '/upload', label: 'Upload', Icon: UploadCloud },
    { path: '/pending-reviews', label: 'Pending', Icon: Clock },
    { path: '/repository', label: 'Repository', Icon: FolderKanban },
    { path: '/admin', label: 'Admin', Icon: Settings },
  ];

  const handleThemeSwitch = () => {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) {
      htmlElement.classList.remove('dark');
    } else {
      htmlElement.classList.add('dark');
    }
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
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal py-4"> {/* Remove default bolding if any from label itself */}
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