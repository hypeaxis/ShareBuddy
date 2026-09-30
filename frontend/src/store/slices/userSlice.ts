/**
 * User Redux slice for ShareBuddy
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User, PaginatedResponse } from '../../types';
import { userService } from '../../services/userService';

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userService.getUserProfile(userId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải thông tin người dùng');
    }
  }
);

export const followUser = createAsyncThunk(
  'user/followUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      await userService.followUser(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể theo dõi người dùng');
    }
  }
);

export const unfollowUser = createAsyncThunk(
  'user/unfollowUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      await userService.unfollowUser(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể bỏ theo dõi người dùng');
    }
  }
);

export const fetchUserFollowers = createAsyncThunk(
  'user/fetchUserFollowers',
  async (
    { userId, page, limit }: { userId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await userService.getUserFollowers(userId, page, limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách người theo dõi');
    }
  }
);

export const fetchUserFollowing = createAsyncThunk(
  'user/fetchUserFollowing',
  async (
    { userId, page, limit }: { userId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await userService.getUserFollowing(userId, page, limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách đang theo dõi');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'user/searchUsers',
  async (
    { query, page, limit }: { query: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await userService.searchUsers(query, page, limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tìm kiếm người dùng');
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  'user/fetchUserStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userService.getUserStats(userId);
      return { userId, stats: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải thống kê người dùng');
    }
  }
);

export const fetchRecommendedUsers = createAsyncThunk(
  'user/fetchRecommendedUsers',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      const response = await userService.getRecommendedUsers(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách gợi ý');
    }
  }
);

// User slice
interface UserState {
  currentProfile: User | null;
  userProfiles: { [userId: string]: User };
  userStats: { [userId: string]: any };
  followers: User[];
  following: User[];
  searchResults: User[];
  recommendedUsers: User[];
  followingUserIds: string[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    followers: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
    following: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
    searchResults: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
}

const initialState: UserState = {
  currentProfile: null,
  userProfiles: {},
  userStats: {},
  followers: [],
  following: [],
  searchResults: [],
  recommendedUsers: [],
  followingUserIds: [],
  isLoading: false,
  error: null,
  pagination: {
    followers: { currentPage: 1, totalPages: 1, totalItems: 0 },
    following: { currentPage: 1, totalPages: 1, totalItems: 0 },
    searchResults: { currentPage: 1, totalPages: 1, totalItems: 0 },
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentProfile: (state) => {
      state.currentProfile = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    setFollowingUserIds: (state, action) => {
      state.followingUserIds = action.payload;
    },
    addToFollowing: (state, action) => {
      if (!state.followingUserIds.includes(action.payload)) {
        state.followingUserIds.push(action.payload);
      }
    },
    removeFromFollowing: (state, action) => {
      state.followingUserIds = state.followingUserIds.filter(
        id => id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    // Fetch user profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.currentProfile = action.payload;
          state.userProfiles[action.payload.id] = action.payload;
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Follow user
    builder
      .addCase(followUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.followingUserIds.push(action.payload);
        }
      });

    // Unfollow user
    builder
      .addCase(unfollowUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.followingUserIds = state.followingUserIds.filter(
            id => id !== action.payload
          );
        }
      });

    // Fetch user followers
    builder
      .addCase(fetchUserFollowers.fulfilled, (state, action) => {
        if (action.payload) {
          state.followers = action.payload.items || [];
          state.pagination.followers = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.totalPages || 1,
            totalItems: action.payload.totalItems || 0,
          };
        }
      });

    // Fetch user following
    builder
      .addCase(fetchUserFollowing.fulfilled, (state, action) => {
        if (action.payload) {
          state.following = action.payload.items || [];
          state.pagination.following = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.totalPages || 1,
            totalItems: action.payload.totalItems || 0,
          };
        }
      });

    // Search users
    builder
      .addCase(searchUsers.fulfilled, (state, action) => {
        if (action.payload) {
          state.searchResults = action.payload.items || [];
          state.pagination.searchResults = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.totalPages || 1,
            totalItems: action.payload.totalItems || 0,
          };
        }
      });

    // Fetch user stats
    builder
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        if (action.payload) {
          state.userStats[action.payload.userId] = action.payload.stats;
        }
      });

    // Fetch recommended users
    builder
      .addCase(fetchRecommendedUsers.fulfilled, (state, action) => {
        if (action.payload) {
          state.recommendedUsers = action.payload;
        }
      });
  },
});

export const {
  clearError,
  clearCurrentProfile,
  clearSearchResults,
  setFollowingUserIds,
  addToFollowing,
  removeFromFollowing,
} = userSlice.actions;

export default userSlice.reducer;