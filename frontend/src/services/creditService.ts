/**
 * Credit API services for ShareBuddy
 */

import { apiRequest } from './api';
import { ApiResponse } from '../types';

export interface CreditTransaction {
  id: string;
  amount: number;
  transactionType: 'earn' | 'download' | 'purchase' | 'bonus' | 'penalty' | 'transfer';
  description: string;
  createdAt: string;
  relatedDocumentId?: string;
  documentTitle?: string;
  thumbnailUrl?: string;
}

export interface CreditStats {
  totalEarned: number;
  totalSpent: number;
  earnCount: number;
  spendCount: number;
}

export interface TransactionHistoryResponse {
  transactions: any[];
  statistics: CreditStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const creditService = {
  // Get user's credit balance
  getCreditBalance: async (): Promise<ApiResponse<{ balance: number }>> => {
    return apiRequest('GET', 'credits/balance');
  },

  // Get credit transaction history
  getTransactionHistory: async (
    page?: number,
    limit?: number,
    type?: string
  ): Promise<ApiResponse<TransactionHistoryResponse>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (type) params.append('type', type);

    const query = params.toString();
    const url = query ? `credits/transactions?${query}` : 'credits/transactions';

    return apiRequest('GET', url);
  },
  
  // Transfer credits to another user
  transferCredits: async (
    targetUserId: string,
    amount: number,
    note?: string
  ): Promise<ApiResponse> => {
    return apiRequest('POST', 'credits/transfer', { targetUserId, amount, note });
  }
};
