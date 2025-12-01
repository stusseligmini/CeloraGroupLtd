'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, RefreshCcw, ArrowDownUp, Lock, Unlock } from 'lucide-react';
import { getSolanaAddress, loadEncryptedMnemonic, decryptMnemonic } from '@/lib/clientKeyManagement';
import { deriveSolanaWallet } from '@/lib/solana/solanaWallet';

interface JupiterSwapProps {
  walletId: string; // Local ID of encrypted mnemonic
  quoteApi?: string; // Override API path for quotes
  executeApi?: string; // Override API path for execution
  defaultFromMint?: string; // SOL by default
  defaultToMint?: string; // USDC by default
  className?: string;
}

interface QuoteData {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  route?: any;
  raw?: any; // Preserve raw quoteResponse for swap build
}

// Common Solana token mints (mainnet)
const TOKENS = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERZzW1Yw4qF9hQxNxqzqH7h1gW4P3AfkG', decimals: 6 },
];

export function JupiterSwap({
  walletId,
  quoteApi = '/api/swap/quote',
  executeApi = '/api/swap',
  defaultFromMint = TOKENS[0].mint,
  defaultToMint = TOKENS[1].mint,
  className,
}: JupiterSwapProps) {
  const [fromMint, setFromMint] = useState(defaultFromMint);
  const [toMint, setToMint] = useState(defaultToMint);
  const [amount, setAmount] = useState(''); // Human-readable
  const [slippageBps, setSlippageBps] = useState(50); // 0.5%
  const [password, setPassword] = useState('');
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [error, setError] = useState('');
  const [building, setBuilding] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [txSignature, setTxSignature] = useState('');

  useEffect(() => {
    const stored = loadEncryptedMnemonic(walletId);
    setNeedsUnlock(!!stored);
  }, [walletId]);

  const handleSwitch = () => {
    setFromMint(toMint);
    setToMint(fromMint);
    setQuote(null);
  };

  const fetchQuote = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Enter amount');
      return;
    }
    setLoadingQuote(true);
    setError('');
    setQuote(null);
    try {
      // Jupiter expects amount in smallest units (lamports etc.)
      const fromTokenInfo = TOKENS.find(t => t.mint === fromMint);
      if (!fromTokenInfo) throw new Error('Unsupported from token');
      const atomicAmount = BigInt(Math.floor(Number(amount) * 10 ** fromTokenInfo.decimals)).toString();

      const res = await fetch(quoteApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockchain: 'solana',
          fromToken: fromMint,
            toToken: toMint,
          amount: atomicAmount,
        }),
      });
      if (!res.ok) throw new Error('Quote failed');
      const data = await res.json();
      const q = data.data?.quote || data.quote || data?.quote; // depending on successResponse wrapper
      if (!q) throw new Error('Malformed quote');
      const outputAmountHuman = () => {
        const toInfo = TOKENS.find(t => t.mint === toMint);
        if (!toInfo) return q.outputAmount;
        return (Number(q.outputAmount) / 10 ** toInfo.decimals).toString();
      };
      setQuote({
        inputToken: q.inputToken,
        outputToken: q.outputToken,
        inputAmount: amount,
        outputAmount: outputAmountHuman(),
        priceImpact: q.priceImpact || q.priceImpactPct || 0,
        route: q.route,
        raw: q,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to fetch quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const performSwap = async () => {
    if (!quote) {
      setError('Get a quote first');
      return;
    }
    if (!password) {
      setError('Enter password to sign');
      return;
    }
    setBuilding(true);
    setError('');
    let mnemonic = ''; // P0 Security: explicit mnemonic cleanup
    try {
      // Decrypt mnemonic & derive keypair
      const encrypted = loadEncryptedMnemonic(walletId);
      if (!encrypted) throw new Error('Encrypted wallet not found');
      mnemonic = await decryptMnemonic(
        encrypted.encryptedMnemonic || (encrypted as any).encrypted || encrypted.encryptedMnemonic,
        password,
        encrypted.salt,
        encrypted.iv
      );
      const solWallet = deriveSolanaWallet(mnemonic, 0); // { publicKey, address, keypair }

      // Build Jupiter swap transaction client-side
      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote.raw,
          userPublicKey: solWallet.address,
          wrapAndUnwrapSol: true,
          slippageBps,
        }),
      });
      if (!swapRes.ok) throw new Error('Swap build failed');
      const swapJson = await swapRes.json();
      const swapTransactionBase64 = swapJson.swapTransaction;
      if (!swapTransactionBase64) throw new Error('Missing swapTransaction');

      // Deserialize & sign
      const { VersionedTransaction } = await import('@solana/web3.js');
      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransactionBase64, 'base64'));
      tx.sign([solWallet.keypair]);

      // Broadcast via backend (NON-CUSTODIAL signed tx)
      setBroadcasting(true);
      const executeRes = await fetch(executeApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          walletId,
          blockchain: 'solana',
          fromToken: fromMint,
          toToken: toMint,
          amount: quote.raw?.inAmount || quote.raw?.inputAmount || '0',
          quoteResponse: quote.raw,
          signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
        }),
      });
      if (!executeRes.ok) throw new Error('Broadcast failed');
      const execJson = await executeRes.json();
      const txHash = execJson.data?.txHash || execJson.txHash || execJson?.data?.data?.txHash;
      if (!txHash) throw new Error('Missing transaction hash');
      setTxSignature(txHash);
      setPassword('');
    } catch (e: any) {
      setError(e.message || 'Swap failed');
    } finally {
      // P0 Security: Explicit mnemonic cleanup
      if (mnemonic) {
        mnemonic = '';
      }
      setBuilding(false);
      setBroadcasting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Swap Tokens (Solana)</CardTitle>
        <CardDescription>Jupiter non-custodial swap – signed locally.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">From</label>
            <Select value={fromMint} onValueChange={v => { setFromMint(v); setQuote(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOKENS.map(t => <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">To</label>
            <Select value={toMint} onValueChange={v => { setToMint(v); setQuote(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOKENS.map(t => <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSwitch} className="flex items-center gap-1">
          <ArrowDownUp className="h-4 w-4" /> Switch
        </Button>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium">Amount ({TOKENS.find(t => t.mint === fromMint)?.symbol || 'From'})</label>
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="0.0" />
        </div>

        {/* Slippage */}
        <div>
          <label className="text-xs font-medium">Slippage (bps)</label>
          <Input value={slippageBps} onChange={e => setSlippageBps(Number(e.target.value))} type="number" min={1} max={500} />
          <p className="text-[10px] text-muted-foreground mt-1">50 bps = 0.5% tolerance</p>
        </div>

        {/* Quote action */}
        <Button onClick={fetchQuote} disabled={loadingQuote || !amount} className="w-full">
          {loadingQuote ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Fetching Quote...</> : <><RefreshCcw className="h-4 w-4 mr-2" /> Get Quote</>}
        </Button>

        {/* Quote details */}
        {quote && (
          <div className="rounded border p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Output</span><span>{quote.outputAmount} {TOKENS.find(t => t.mint === toMint)?.symbol}</span></div>
            <div className="flex justify-between"><span>Price Impact</span><span>{(quote.priceImpact * 100).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span>Route Steps</span><span>{Array.isArray(quote.route) ? quote.route.length : 1}</span></div>
          </div>
        )}

        {/* Password & swap */}
        {quote && (
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">{needsUnlock ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />} Password to Sign</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wallet password" autoComplete="current-password" />
            <Button disabled={building || broadcasting || !password} onClick={performSwap} className="w-full">
              {building || broadcasting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {building ? 'Building...' : 'Broadcasting...'} </> : 'Swap'}
            </Button>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 break-all">{error}</div>
        )}
        {txSignature && (
          <div className="text-xs text-green-600 break-all">Success: {txSignature}</div>
        )}

        <p className="text-[10px] text-muted-foreground">Non-custodial: transaction signed locally; server only broadcasts.</p>
      </CardContent>
    </Card>
  );
}
