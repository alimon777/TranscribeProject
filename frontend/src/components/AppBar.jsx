import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  UploadCloud,
  Clock,
  FolderKanban,
  Settings,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppBar() {
  const location = useLocation();
  const navItems = [
    { path: '/upload', label: 'Upload', Icon: UploadCloud },
    { path: '/pending-reviews', label: 'Pending', Icon: Clock },
    { path: '/repository', label: 'Repository', Icon: FolderKanban },
    { path: '/admin', label: 'Admin', Icon: Settings },
  ];

  return (
    <header className="bg-card py-3 px-4 md:px-6 border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="text-lg md:text-xl font-semibold text-primary no-underline"
        >
          Intelligent Processor
        </Link>
        <nav className="flex gap-2 items-center">
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
                <item.Icon className="h-4 w-4 mr-1.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5 text-muted-foreground" />
          </Button>
        </nav>
      </div>
    </header>
  );
}