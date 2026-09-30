/**
 * Document Redux slice for ShareBuddy
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Document, DocumentSearchParams } from '../../types';
import { documentService } from '../../services/documentService';

// Async thunks
export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (params: DocumentSearchParams | undefined, { rejectWithValue }) => {
    try {
      const response = await documentService.getDocuments(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách tài liệu');
    }
  }
);

export const fetchDocumentById = createAsyncThunk(
  'documents/fetchDocumentById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await documentService.getDocumentById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải tài liệu');
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'documents/uploadDocument',
  async (
    { data, file, onProgress }: {
      data: any;
      file: File;
      onProgress?: (progress: number) => void;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await documentService.uploadDocument(data, file, onProgress);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải lên tài liệu');
    }
  }
);

export const searchDocuments = createAsyncThunk(
  'documents/searchDocuments',
  async (
    { query, filters }: { query: string; filters?: Partial<DocumentSearchParams> },
    { rejectWithValue }
  ) => {
    try {
      const response = await documentService.searchDocuments(query, filters);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tìm kiếm tài liệu');
    }
  }
);

export const toggleBookmark = createAsyncThunk(
  'documents/toggleBookmark',
  async (
    { documentId, isBookmarked }: { documentId: string; isBookmarked: boolean },
    { rejectWithValue }
  ) => {
    try {
      if (isBookmarked) {
        await documentService.removeBookmark(documentId);
        return { documentId, isBookmarked: false };
      } else {
        await documentService.bookmarkDocument(documentId);
        return { documentId, isBookmarked: true };
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật bookmark');
    }
  }
);

export const fetchPopularDocuments = createAsyncThunk(
  'documents/fetchPopularDocuments',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      const response = await documentService.getPopularDocuments(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải tài liệu phổ biến');
    }
  }
);

export const fetchRecentDocuments = createAsyncThunk(
  'documents/fetchRecentDocuments',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      const response = await documentService.getRecentDocuments(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải tài liệu mới nhất');
    }
  }
);

export const fetchBookmarkedDocuments = createAsyncThunk(
  'documents/fetchBookmarkedDocuments',
  async (params: DocumentSearchParams | undefined, { rejectWithValue }) => {
    try {
      const response = await documentService.getBookmarkedDocuments(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải tài liệu đã lưu');
    }
  }
);

// Document slice
interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  popularDocuments: Document[];
  recentDocuments: Document[];
  bookmarkedDocuments: Document[];
  searchResults: Document[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchParams: DocumentSearchParams | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  categories: string[];
  subjects: string[];
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  popularDocuments: [],
  recentDocuments: [],
  bookmarkedDocuments: [],
  searchResults: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false,
  },
  searchParams: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
  categories: [],
  subjects: [],
};

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDocument: (state) => {
      state.currentDocument = null;
    },
    setSearchParams: (state, action: PayloadAction<DocumentSearchParams>) => {
      state.searchParams = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    updateDocumentInList: (state, action: PayloadAction<Document>) => {
      const index = state.documents.findIndex(doc => doc.id === action.payload.id);
      if (index !== -1) {
        state.documents[index] = action.payload;
      }
    },
    removeDocumentFromList: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter(doc => doc.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch documents
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.documents = action.payload.items || [];
          state.pagination = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.totalPages || 1,
            totalItems: action.payload.totalItems || 0,
            hasNext: action.payload.hasNext || false,
            hasPrev: action.payload.hasPrev || false,
          };
        }
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch document by ID
    builder
      .addCase(fetchDocumentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocumentById.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        if (payload && payload.document) {
          state.currentDocument = payload.document;
        } else {
          state.currentDocument = null;
        }
      })
      .addCase(fetchDocumentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload document
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.isUploading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
      });

    // Search documents
    builder
      .addCase(searchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.searchResults = action.payload.items || [];
          state.pagination = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.totalPages || 1,
            totalItems: action.payload.totalItems || 0,
            hasNext: action.payload.hasNext || false,
            hasPrev: action.payload.hasPrev || false,
          };
        }
      })
      .addCase(searchDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Toggle bookmark
    builder
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        if (action.payload) {
          const { documentId, isBookmarked } = action.payload;
          
          // Update current document
          if (state.currentDocument && state.currentDocument.id === documentId) {
            if (state.currentDocument.userInteraction) {
              state.currentDocument.userInteraction.isBookmarked = isBookmarked;
            } else {
              // Create userInteraction object if it doesn't exist
              state.currentDocument.userInteraction = {
                isBookmarked,
                // FIXED: Use undefined instead of null to match typical TS interface for optional property
                userRating: undefined,
                canDownload: false
              };
            }
          }
          
          // Update documents list
          const docIndex = state.documents.findIndex(doc => doc.id === documentId);
          if (docIndex !== -1) {
             if (state.documents[docIndex].userInteraction) {
                state.documents[docIndex].userInteraction!.isBookmarked = isBookmarked;
             }
          }
        }
      });

    // Fetch popular documents
    builder
      .addCase(fetchPopularDocuments.fulfilled, (state, action) => {
        if (action.payload) {
          state.popularDocuments = action.payload;
        }
      });

    // Fetch recent documents
    builder
      .addCase(fetchRecentDocuments.fulfilled, (state, action) => {
        if (action.payload) {
          state.recentDocuments = action.payload;
        }
      });

    // Fetch bookmarked documents
    builder
      .addCase(fetchBookmarkedDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkedDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.bookmarkedDocuments = action.payload.items || [];
          state.pagination = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.totalPages || 1,
            totalItems: action.payload.totalItems || 0,
            hasNext: action.payload.hasNext || false,
            hasPrev: action.payload.hasPrev || false,
          };
        }
      })
      .addCase(fetchBookmarkedDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentDocument,
  setSearchParams,
  clearSearchResults,
  setUploadProgress,
  updateDocumentInList,
  removeDocumentFromList,
} = documentSlice.actions;

export default documentSlice.reducer;