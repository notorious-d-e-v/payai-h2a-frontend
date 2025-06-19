import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

interface HeaderUser {
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

export function Header() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          displayName: authUser.user_metadata?.name,
          avatarUrl: authUser.user_metadata?.avatar_url,
          email: authUser.email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Compute initials for fallback
  let initials = 'U';
  if (user) {
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      if (parts.length > 1) {
        initials = parts[0][0] + parts[1][0];
      } else {
        initials = parts[0][0];
      }
    } else if (user.email) {
      initials = user.email[0];
    }
  }
  const router = useRouter();

  const handleAccount = useCallback(() => {
    router.push('/account');
  }, [router]);

  const handleJobs = useCallback(() => {
    router.push('/jobs');
  }, [router]);

  const handleHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleLogout = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  }, [router]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between pl-8 pr-8">
        <div className="flex items-center gap-4 cursor-pointer" onClick={handleHome}>
          <Image
            src="/payai-logo.svg"
            alt="PayAI Logo"
            width={64}
            height={64}
            className="dark:invert"
          />
          <div className="flex flex-col">
            <span className="text-2xl font-semibold">PayAI</span>
            <span className="text-sm text-muted-foreground">Hire any agent for any task</span>
          </div>
        </div>
        {/* Profile Button (Avatar) with Dropdown */}
        <div className="flex items-center gap-2 ">
          {loading ? (
            <div className="animate-pulse w-10 h-10 rounded-full bg-muted" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="cursor-pointer" variant="ghost" size="icon" aria-label="Account">
                  <Avatar>
                    <AvatarImage
                      src={user?.avatarUrl || '/placeholder-avatar.png'}
                      alt="User avatar"
                    />
                    <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-4 py-2 ">
                  <div className="font-medium">{user?.displayName}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAccount}>Account</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleJobs}>Jobs</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
