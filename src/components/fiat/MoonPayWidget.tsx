/**
 * MoonPay Widget Component
 * Embeddable widget for buying crypto with credit card
 * NO CUSTODY - crypto goes directly to user's wallet
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { getMoonPayWidgetUrl, MoonPayWidgetOptions, MoonPayConfig } from '@/lib/fiat/moonpay';

interface MoonPayWidgetProps {
  address: string;
  apiKey: string;
  environment?: 'sandbox' | 'production';
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  options?: Partial<MoonPayWidgetOptions>;
}

export function MoonPayWidget({
  address,
  apiKey,
  environment = 'production',
  onSuccess,
  onError,
  onClose,
  options = {},
}: MoonPayWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!address || !apiKey) {
      return;
    }

    const config: MoonPayConfig = {
      apiKey,
      environment,
    };

    const widgetOptions: MoonPayWidgetOptions = {
      address,
      defaultCryptoCurrency: 'sol',
      ...options,
    };

    const widgetUrl = getMoonPayWidgetUrl(config, widgetOptions);

    // Listen for MoonPay messages
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (!event.origin.includes('moonpay.com')) {
        return;
      }

      if (event.data.type === 'MOONPAY_TRANSACTION_UPDATED') {
        const { transaction } = event.data;
        
        if (transaction.status === 'completed') {
          onSuccess?.(transaction.cryptoTransactionHash);
        } else if (transaction.status === 'failed') {
          onError?.(new Error(transaction.failureReason || 'Transaction failed'));
        }
      } else if (event.data.type === 'MOONPAY_MODAL_CLOSED') {
        onClose?.();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [address, apiKey, environment, onSuccess, onError, onClose, options]);

  if (!address || !apiKey) {
    return (
      <div className="p-4 text-center text-gray-500">
        Address and API key required
      </div>
    );
  }

  const config: MoonPayConfig = {
    apiKey,
    environment,
  };

  const widgetOptions: MoonPayWidgetOptions = {
    address,
    defaultCryptoCurrency: 'sol',
    ...options,
  };

  const widgetUrl = getMoonPayWidgetUrl(config, widgetOptions);

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        src={widgetUrl}
        width="100%"
        height="100%"
        className="border-0 rounded-lg"
        allow="payment"
        title="MoonPay Widget"
      />
    </div>
  );
}

