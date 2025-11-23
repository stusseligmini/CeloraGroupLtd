'use client';

import React, { useState, useEffect } from 'react';
import { getWalletConnectClient } from '@/lib/walletconnect/client';
import { logger } from '@/lib/logger';

export default function WalletConnectManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [pendingProposal, setPendingProposal] = useState<any>(null);
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeWalletConnect();
  }, []);

  const initializeWalletConnect = async () => {
    try {
      const client = getWalletConnectClient();
      await client.initialize();

      // Load existing sessions
      const activeSessions = client.getActiveSessions();
      setSessions(activeSessions);
      setIsConnected(Object.keys(activeSessions).length > 0);

      // Set up event listeners
      client.onSessionProposal((proposal) => {
        logger.info('Session proposal received', { proposalId: proposal?.id });
        setPendingProposal(proposal);
      });

      client.onSessionDelete((session) => {
        logger.info('Session deleted', { topic: session?.topic });
        const updatedSessions = client.getActiveSessions();
        setSessions(updatedSessions);
        setIsConnected(Object.keys(updatedSessions).length > 0);
      });
    } catch (error) {
      logger.error('Failed to initialize WalletConnect', error instanceof Error ? error : undefined);
    }
  };

  const handlePair = async () => {
    if (!uri) {
      alert('Please enter a WalletConnect URI');
      return;
    }

    setLoading(true);
    try {
      const client = getWalletConnectClient();
      await client.pair(uri);
      setUri('');
      alert('Pairing initiated. Approve the connection request.');
    } catch (error) {
      logger.error('Failed to pair', error instanceof Error ? error : undefined);
      alert('Failed to pair with dApp');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSession = async () => {
    if (!pendingProposal) return;

    setLoading(true);
    try {
      const client = getWalletConnectClient();
      
      // Get user's wallet addresses
      // This should come from your wallet state
      const accounts = ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']; // Example

      await client.approveSession(pendingProposal, accounts);
      
      // Refresh sessions
      const updatedSessions = client.getActiveSessions();
      setSessions(updatedSessions);
      setIsConnected(true);
      setPendingProposal(null);
      
      alert('Session approved!');
    } catch (error) {
      logger.error('Failed to approve session', error instanceof Error ? error : undefined);
      alert('Failed to approve session');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSession = async () => {
    if (!pendingProposal) return;

    setLoading(true);
    try {
      const client = getWalletConnectClient();
      await client.rejectSession(pendingProposal);
      setPendingProposal(null);
      alert('Session rejected');
    } catch (error) {
      logger.error('Failed to reject session', error instanceof Error ? error : undefined);
      alert('Failed to reject session');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (topic: string) => {
    setLoading(true);
    try {
      const client = getWalletConnectClient();
      await client.disconnectSession(topic);
      
      const updatedSessions = client.getActiveSessions();
      setSessions(updatedSessions);
      setIsConnected(Object.keys(updatedSessions).length > 0);
      
      alert('Session disconnected');
    } catch (error) {
      logger.error('Failed to disconnect', error instanceof Error ? error : undefined, { topic });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">WalletConnect</h2>

      {/* Connection Input */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Connect to dApp</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="Paste WalletConnect URI (wc:...)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            onClick={handlePair}
            disabled={loading || !uri}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Pending Proposal */}
      {pendingProposal && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-900">Connection Request</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">dApp:</span> {pendingProposal.params.proposer.metadata.name}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">URL:</span> {pendingProposal.params.proposer.metadata.url}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Description:</span> {pendingProposal.params.proposer.metadata.description}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApproveSession}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={handleRejectSession}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        {Object.keys(sessions).length === 0 ? (
          <p className="text-gray-500">No active sessions</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(sessions).map(([topic, session]) => (
              <div key={topic} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{session.peer.metadata.name}</p>
                    <p className="text-sm text-gray-600">{session.peer.metadata.url}</p>
                    <p className="text-xs text-gray-500 mt-2">Topic: {topic.substring(0, 16)}...</p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(topic)}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

