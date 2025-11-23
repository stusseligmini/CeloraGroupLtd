/**
 * Virtual Cards Page
 * Manage virtual cards and hidden vaults
 */

import { Suspense } from 'react';
import { CardManagement } from '@/components/CardManagement';
import { HiddenVault } from '@/components/HiddenVault';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Virtual Cards | Celora',
  description: 'Manage your virtual cards and hidden vaults',
};

export default function CardsPage() {
  // Feature flag check
  const cardsEnabled = process.env.ENABLE_VIRTUAL_CARDS === 'true';
  
  if (!cardsEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Virtual Cards</CardTitle>
            <CardDescription>This feature is currently unavailable</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Virtual cards are not enabled for your account. Please contact support for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Virtual Cards</h1>
        <p className="text-muted-foreground">
          Create disposable cards, set spending limits, and manage your hidden vault
        </p>
      </div>

      <Suspense fallback={<CardsSkeleton />}>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Main card management section */}
          <div className="lg:col-span-2">
            <CardManagement />
          </div>

          {/* Hidden vault sidebar */}
          <div className="lg:col-span-1">
            {/* walletId will be dynamically loaded from user's default wallet */}
            <HiddenVault walletId="" />
          </div>
        </div>
      </Suspense>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
