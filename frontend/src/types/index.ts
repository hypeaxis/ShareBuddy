/**
 * TypeScript types and interfaces for ShareBuddy application
 * UPDATED: Consistent UserSimple usage and Search Params
 */

// User related types
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  bio?: string;
  university?: string;
  major?: string;
  role: 'user' | 'moderator' | 'admin';
  credits: number;
  isVerifiedAuthor: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
  stats?: {
    documentCount: number;
    followingCount: number;
    followerCount: number;
    avgRating?: string;
  };
  isFollowing?: boolean;
}

// Helper interface for user info embedded in other objects
export interface UserSimple {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerifiedAuthor?: boolean;
  university?: string; 
  major?: string;
}

// Document related types
export interface Document {
  id: string;
  title: string;
  description: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  thumbnailUrl?: string;
  category?: string; // Optional, might be deprecated in favor of subject
  subject: string;
  university?: string;
  creditCost: number;
  downloadCount: number;
  viewCount?: number;
  status: 'pending' | 'approved' | 'rejected';
  avgRating?: string;
  ratingCount: number;
  questionCount?: number;
  commentCount?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  author: UserSimple; // CHANGED: Use UserSimple for consistency
  userInteraction?: {
    isBookmarked: boolean;
    userRating?: {
      rating: number;
      comment?: string;
    };
    canDownload: boolean;
  };
  moderation?: {
    jobId: string;
    status: string;
    score?: number;
    flags?: string[];
  };
}

// Rating related types
export interface Rating {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
  user: UserSimple;
  isLiked?: boolean;
  likeCount?: number;
}

export interface RatingStatistics {
  totalRatings: number;
  avgRating?: string;
  distribution: {
    [key: string]: number; // "1", "2", "3", "4", "5"
  };
}

// Response structures for Rating Service
export interface DocumentRatingsResponse {
  ratings: Rating[];
  statistics: RatingStatistics;
  pagination: Pagination;
}

export interface SingleRatingResponse {
  rating: Rating;
}

// Comment related types
export interface Comment {
  id: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  user: UserSimple;
  replies?: Comment[];
}

// Q&A related types
export interface Question {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  acceptedAnswerId?: string | null;
  voteCount: number;
  viewCount: number;
  answerCount: number;
  documentId?: string;
  documentTitle?: string;
  author: UserSimple;
  createdAt: string;
  updatedAt?: string;
}

export interface Answer {
  id: string;
  content: string;
  isAccepted: boolean;
  voteCount: number;
  questionId?: string;
  author: UserSimple;
  createdAt: string;
  updatedAt?: string;
}

export interface QuestionDetailResponse {
  question: Question;
  answers: Answer[];
}

// Credit related types
export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'download' | 'purchase' | 'bonus' | 'penalty' | 'transfer';
  description: string;
  createdAt: string;
  document?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

export interface CreditPackage {
  id?: string;
  credits: number;
  price: number;
  currency: string;
  popular: boolean;
  bonus?: number;
  discountPercent?: number;
}

// Social related types
export interface Notification {
  id: string;
  type: 'new_document' | 'new_follower' | 'new_comment' | 'new_rating' | 'document_approved' | 'document_moderation';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedDocument?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  relatedUser?: UserSimple;
}

// Pagination types
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Document upload response types
export interface DocumentUploadResponse {
  document: Document;
  moderation?: {
    jobId: string;
    status: string;
  } | null;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any[];
}

// Generic Paginated Response
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  university?: string;
  major?: string;
}

export interface UpdatePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DocumentUploadForm {
  title: string;
  description: string;
  subject: string;
  university?: string;
  creditCost: number;
  isPublic?: boolean;
  isPremium?: boolean;
  tags?: string | string[];
}

// UPDATED: Added verifiedAuthor and year
export interface DocumentSearchParams {
  search?: string;
  category?: string;
  subject?: string;
  minRating?: number;
  maxCreditCost?: number;
  verifiedAuthor?: boolean; // NEW
  year?: number; // NEW
  authorId?: string; // NEW: To filter by specific author
  sortBy?: 'newest' | 'oldest' | 'popular' | 'rating' | 'downloads';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  tags?: string[];
}

export interface ProfileUpdateForm {
  fullName: string;
  bio?: string;
  university?: string;
  major?: string;
}

// Redux State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  popularDocuments: Document[];
  recentDocuments: Document[];
  searchResults: Document[];
  pagination: Pagination;
  searchParams: DocumentSearchParams | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  categories: string[];
  subjects: string[];
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  unreadCount: number;
}

export interface RootState {
  auth: AuthState;
  documents: DocumentState;
  ui: UIState;
}

// Component Props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}