import { apiRequest } from './api'; // Adjust path if your api.ts is in services/api.ts
import { ApiResponse } from '../types';

export const questionService = {
  // Get questions for a specific document
  getQuestionsByDocumentId: async (documentId: string, page = 1, limit = 5) => {
    return apiRequest('GET', `/documents/${documentId}/questions`, null, {
      params: { page, limit }
    });
  },

  // Get a single question details
  getQuestionById: async (questionId: string) => {
    return apiRequest('GET', `/questions/${questionId}`);
  },

  // Create a new question
  createQuestion: async (documentId: string, title: string, content: string) => {
    return apiRequest('POST', '/questions', {
      documentId,
      title,
      content
    });
  },

  // Create an answer
  createAnswer: async (questionId: string, content: string) => {
    return apiRequest('POST', '/questions/answer', {
      questionId,
      content
    });
  },

  // Vote on a question
  voteQuestion: async (questionId: string, voteType: 1 | -1) => {
    return apiRequest('POST', `/questions/${questionId}/vote`, {
      voteType
    });
  },

  // Vote on an answer
  voteAnswer: async (answerId: string, voteType: 1 | -1) => {
    return apiRequest('POST', `/questions/answer/${answerId}/vote`, {
      voteType
    });
  },

  // Accept an answer
  acceptAnswer: async (answerId: string) => {
    return apiRequest('POST', `/questions/answer/${answerId}/accept`, {});
  }
};