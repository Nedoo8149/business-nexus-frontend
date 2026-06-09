import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';
import { loginUser as apiLogin, registerUser as apiRegister } from '../authService';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'business_nexus_user';
const TOKEN_KEY = 'token'; 
const RESET_TOKEN_KEY = 'business_nexus_reset_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 AUTO-SYNC FUNCTION: Yeh chup chaap DB se asli tasveer layega
  const syncFreshUserData = async (userId: string, currentLocalUser: any) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`);
      if (res.ok) {
        const dbUser = await res.json();
        const freshUser = {
          ...currentLocalUser,
          ...dbUser, // DB se aanay wala data (including avatarUrl) puray kachre ko overwrite kar dega
          id: dbUser._id || dbUser.id,
          avatarUrl: dbUser.avatarUrl 
        };
        setUser(freshUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
      }
    } catch (error) {
      console.log("Background sync failed, using local data.");
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser); // Pehle UI dikhao taake website fast load ho

      // Background mein DB se fresh data fetch karlo (DP drop issue hamesha ke liye solved)
      if (parsedUser.id || parsedUser._id) {
        syncFreshUserData(parsedUser.id || parsedUser._id, parsedUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiLogin({ email, password, role });
      const { user: loggedInUser, token } = data;
      
      const userName = loggedInUser?.name || email.split('@')[0];
      
      const formattedUser = {
        ...loggedInUser,
        id: loggedInUser?._id || loggedInUser?.id || data.userId, 
        name: userName,
        avatarUrl: loggedInUser?.avatarUrl 
      };
      
      setUser(formattedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      if (token) localStorage.setItem(TOKEN_KEY, token); 

      // Login hote hi DB se verify karwa lo
      if (formattedUser.id) {
        syncFreshUserData(formattedUser.id, formattedUser);
      }
      
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Invalid credentials or server error';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiRegister({ email, password, role });
      const { user: newUser, token } = data;
      
      const formattedUser = {
        ...newUser,
        id: newUser._id || newUser.id,
        name: name,
        avatarUrl: newUser.avatarUrl 
      };
      
      setUser(formattedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      if (token) localStorage.setItem(TOKEN_KEY, token);
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Registration failed';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const resetToken = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(RESET_TOKEN_KEY, resetToken);
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const storedToken = localStorage.getItem(RESET_TOKEN_KEY);
      if (token !== storedToken) {
        throw new Error('Invalid or expired reset token');
      }
      localStorage.removeItem(RESET_TOKEN_KEY);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      if (user && user.id === userId) {
        const updatedUser = { 
          ...user, 
          ...updates,
          id: updates.id || user.id
        } as User;
        
        setUser(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        console.log("✅ Context & LocalStorage updated:", updatedUser);
      }
    } catch (error) {
      console.error("Failed to update profile in context:", error);
      toast.error((error as Error).message);
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};