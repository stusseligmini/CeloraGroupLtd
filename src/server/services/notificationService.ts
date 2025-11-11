import { randomUUID } from 'crypto';
import { NotificationItem } from '@/types/api';
import { callPlatformApi } from './platformClient';

function getFallbackNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: 'azure-welcome',
      title: 'Welcome to Celora on Azure',
      body: 'Your account is active. The Azure extension keeps you updated wherever you browse.',
      createdAt: new Date(now).toISOString(),
      read: false,
      severity: 'info',
    },
    {
      id: 'security-posture',
      title: 'Security posture stable',
      body: 'Key Vault and Redis cache rotations completed automatically.',
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      read: true,
      severity: 'info',
    },
  ];
}

type PlatformNotificationPayload = {
  notifications?: NotificationItem[];
};

type NotificationQuery = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
};

export async function fetchNotifications(
  userToken: string | null,
  query?: NotificationQuery
): Promise<NotificationItem[]> {
  // Build query string
  const queryParams = query
    ? new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : '';

  const path = queryParams ? `/notifications?${queryParams}` : '/notifications';

  const result = await callPlatformApi<PlatformNotificationPayload>(
    {
      path,
      method: 'GET',
      userToken,
    },
    async () => ({
      notifications: getFallbackNotifications(),
    })
  );

  if (!result?.notifications || !Array.isArray(result.notifications)) {
    return getFallbackNotifications();
  }

  return result.notifications.map((item) => ({
    id: item.id ?? randomUUID(),
    title: item.title ?? 'Account update',
    body: item.body ?? '',
    createdAt: item.createdAt ?? new Date().toISOString(),
    read: Boolean(item.read),
    severity: item.severity ?? 'info',
  }));
}

