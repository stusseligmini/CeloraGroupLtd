"use client";
import React, { useState } from 'react';
import { normalizeMnemonic, isLikelyValidMnemonic, deriveAddressPlaceholder } from '../../lib/seed';

export default function WalletImport() {
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setMnemonicInput(text);
    const normalized = normalizeMnemonic(text);
    setWords(normalized);
    const ok = isLikelyValidMnemonic(normalized);
    setValid(ok);
    setDerivedAddress(ok ? deriveAddressPlaceholder(normalized) : null);
    setError(null);
  }

  async function onImport() {
    const normalized = normalizeMnemonic(mnemonicInput);
    if (!isLikelyValidMnemonic(normalized)) {
      setError('Seed phrase looks invalid. Expect 12–24 simple words.');
      return;
    }
    // TODO: Replace with secure import (derive keypair, store encrypted)
    alert(`Imported wallet for address: ${deriveAddressPlaceholder(normalized)}`);
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Import Wallet</h1>
      <p className="text-sm text-gray-600">Paste your 12–24 word seed phrase to restore your wallet. Avoid pasting from untrusted sources.</p>
      <textarea
        value={mnemonicInput}
        onChange={onChange}
        rows={4}
        className="w-full border rounded p-2"
        placeholder="seed phrase words separated by spaces"
      />
      <div className="text-sm">
        <div>Words detected: {words.length}</div>
        <div>Format valid: {valid === null ? '-' : valid ? 'Yes' : 'No'}</div>
        {derivedAddress && (
          <div className="mt-1">Derived address (placeholder): <span className="font-mono">{derivedAddress}</span></div>
        )}
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        onClick={onImport}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={!valid}
      >
        Import Wallet
      </button>
      <div className="text-xs text-gray-500">
        Tip: Keep your seed offline and never share it.
      </div>
    </div>
  );
}