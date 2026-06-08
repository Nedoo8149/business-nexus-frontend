import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';
import { loginUser as apiLogin, registerUser as apiRegister } from '../authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'business_nexus_user';
const TOKEN_KEY = 'token'; 
const RESET_TOKEN_KEY = 'business_nexus_reset_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiLogin({ email, password, role });
      const { user: loggedInUser, token } = data;
      
      // FIX: MongoDB ki _id ko frontend ki id k barabar kr diya
      const formattedUser = {
        ...loggedInUser,
        id: loggedInUser._id || loggedInUser.id, 
        name: loggedInUser.name || email.split('@')[0],
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser.name || email.split('@')[0])}&background=random`
      };
      
      setUser(formattedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      localStorage.setItem(TOKEN_KEY, token); 
      
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
      
      // FIX: MongoDB ki _id ko frontend ki id k barabar kr diya
      const formattedUser = {
        ...newUser,
        id: newUser._id || newUser.id,
        name: name,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      };
      
      setUser(formattedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      localStorage.setItem(TOKEN_KEY, token);
      
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (user && user.id === userId) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      }
      toast.success('Profile updated successfully');
    } catch (error) {
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