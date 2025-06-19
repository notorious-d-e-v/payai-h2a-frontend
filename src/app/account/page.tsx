'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Copy, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';

interface Token {
  id: string;
  name: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  displayName?: string;
  avatarUrl?: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [isRevokingToken, setIsRevokingToken] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  const fetchUserProfile = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (authUser) {
        const userMeta = authUser.user_metadata || {};
        const displayName = userMeta.full_name || userMeta.name || '';
        const avatarUrl = userMeta.avatar_url || userMeta.profile_image_url || '';
        setUser({
          id: authUser.id,
          email: authUser.email!,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || authUser.created_at,
          displayName,
          avatarUrl,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load user profile');
    }
  }, [supabase]);

  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch('/api/tokens');
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const data = await response.json();
      setTokens(data);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load access tokens');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchTokens();
  }, [fetchUserProfile, fetchTokens]);

  const createToken = useCallback(async () => {
    if (!newTokenName.trim()) {
      toast.error('Please enter a token name');
      return;
    }

    setIsCreatingToken(true);
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName }),
      });

      if (!response.ok) throw new Error('Failed to create token');
      const data = await response.json();
      setNewTokenValue(data.token);
      setNewTokenName('');
      await fetchTokens();
      toast.success('Token created successfully');
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Failed to create token');
    } finally {
      setIsCreatingToken(false);
    }
  }, [newTokenName, fetchTokens]);

  const revokeToken = useCallback(
    async (tokenId: string) => {
      setIsRevokingToken(true);
      try {
        const response = await fetch(`/api/tokens/${tokenId}/revoke`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to revoke token');
        await fetchTokens();
        toast.success('Token revoked successfully');
      } catch (error) {
        console.error('Error revoking token:', error);
        toast.error('Failed to revoke token');
      } finally {
        setIsRevokingToken(false);
      }
    },
    [fetchTokens]
  );

  const copyToClipboard = useCallback((text: string, feedback?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(feedback || 'Copied to clipboard');
  }, []);

  const handleSyncProfile = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/account', { method: 'PUT' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sync profile');
      }
      const data = await response.json();
      setUser(prev =>
        prev ? { ...prev, displayName: data.displayName, avatarUrl: data.avatarUrl } : prev
      );
      toast.success('Profile synced with Twitter!');
    } catch (error: any) {
      setSyncError(error.message || 'Failed to sync profile');
      toast.error(error.message || 'Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  }, []);

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 space-y-6">
          {/* Profile Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-32 mb-2" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-48" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
          {/* Tokens Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-40 mb-2" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-56" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 space-y-6">
        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync Profile With Twitter Button */}
            <Button
              onClick={handleSyncProfile}
              disabled={syncing}
              className="w-full sm:w-auto"
              aria-busy={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Profile With Twitter'}
            </Button>
            {syncError && (
              <div className="text-red-600 text-sm" role="alert">
                {syncError}
              </div>
            )}
            <div>
              <Label>Email</Label>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <div>
              <Label>Account Created</Label>
              <p className="text-sm text-gray-600">
                {user?.created_at && format(new Date(user.created_at), 'PPP')}
              </p>
            </div>
            <div>
              <Label>Last Sign In</Label>
              <p className="text-sm text-gray-600">
                {user?.last_sign_in_at && format(new Date(user.last_sign_in_at), 'PPP')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Access Tokens Section */}
        <Card>
          <CardHeader>
            <CardTitle>Access Tokens</CardTitle>
            <CardDescription>Manage your API access tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create New Token */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter token name"
                value={newTokenName}
                onChange={e => setNewTokenName(e.target.value)}
              />
              <Button onClick={createToken} disabled={isCreatingToken}>
                Create Token
              </Button>
            </div>

            {/* New Token Display Dialog */}
            <Dialog open={!!newTokenValue} onOpenChange={() => setNewTokenValue(null)}>
              <DialogContent className="max-w-xs sm:max-w-lg w-full">
                <DialogHeader>
                  <DialogTitle>Access Token Created</DialogTitle>
                  <DialogDescription>
                    Make sure to <b>copy your token now</b>. You won&apos;t be able to see it again
                    after you close this window.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="flex-1 p-2 bg-gray-100 rounded break-all whitespace-pre-wrap text-xs">
                    {newTokenValue}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      newTokenValue && copyToClipboard(newTokenValue, 'Token copied to clipboard')
                    }
                    className="self-end sm:self-center"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Token List */}
            <div className="space-y-4">
              {tokens.map(token => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium mb-2">{token.name}</h3>
                    <p className="text-sm text-gray-600">
                      Created: {format(new Date(token.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires: {format(new Date(token.expires_at), 'yyyy-MM-dd HH:mm:ss')}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" disabled={isRevokingToken}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Token</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke this token? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revokeToken(token.id)}>
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {tokens.length === 0 && (
                <p className="text-center text-gray-600">No access tokens found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
