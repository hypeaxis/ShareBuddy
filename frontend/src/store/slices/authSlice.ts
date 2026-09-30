/**
 * Authentication Redux slice for ShareBuddy
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginForm, RegisterForm } from '../../types';
import { authService, tokenService } from '../../services/authService';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginForm, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      if (!response.data) {
        throw new Error('Không có dữ liệu phản hồi');
      }
      
      const { user, token } = response.data;
      
      // Store token and user in localStorage
      tokenService.setToken(token);
      tokenService.setUser(user);
      
      return { user, token };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Đăng nhập thất bại');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterForm, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      if (!response.data) {
        throw new Error('Không có dữ liệu phản hồi');
      }
      
      const { user, token } = response.data;
      
      // Store token and user in localStorage
      tokenService.setToken(token);
      tokenService.setUser(user);
      
      return { user, token };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Đăng ký thất bại');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      tokenService.clearAll();
      return null;
    } catch (error: any) {
      // Clear local storage even if server request fails
      tokenService.clearAll();
      return null;
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if we already have fresh user data (fetched within last 5 seconds)
      const state = getState() as any;
      const lastFetch = state.auth.lastUserFetch;
      const now = Date.now();
      
      if (
        lastFetch &&
        (now - lastFetch) < 5000 &&
        state.auth.user
      ) {
        return state.auth.user;
      }
      
      console.log('🔄 Fetching user data from server...');
      const response = await authService.getProfile();
      // Backend now returns data directly without nested user object
      return response.data;
    } catch (error: any) {
      // If token is invalid, clear storage
      tokenService.clearAll();
      return rejectWithValue(error.message || 'Không thể lấy thông tin người dùng');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(userData);
      if (!response.data) {
        throw new Error('Không có dữ liệu phản hồi');
      }
      
      const updatedUser = response.data;
      
      // Update user in localStorage
      tokenService.setUser(updatedUser);
      
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Cập nhật thông tin thất bại');
    }
  }
);

// Auth slice
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  lastUserFetch: number | null; // Timestamp of last user fetch
}

const initialState: AuthState = {
  user: tokenService.getUser(),
  token: tokenService.getToken(),
  isLoading: false,
  error: null,
  isAuthenticated: tokenService.isAuthenticated(),
  lastUserFetch: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    initializeAuth: (state) => {
      state.user = tokenService.getUser();
      state.token = tokenService.getToken();
      state.isAuthenticated = tokenService.isAuthenticated();
    },
    updateCredits: (state, action: PayloadAction<number>) => {
    if (state.user) {
      state.user.credits = action.payload;
      tokenService.setUser(state.user); // sync localStorage
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Get current user
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
          state.lastUserFetch = Date.now(); // Update timestamp
          // Save user to localStorage
          tokenService.setUser(action.payload);
        }
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.lastUserFetch = null;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setLoading, initializeAuth, updateCredits } = authSlice.actions;
export default authSlice.reducer;