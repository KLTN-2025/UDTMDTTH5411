import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  apiService, 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AdminRegisterRequest,
  ShopRegisterRequest,
  CustomerRegisterRequest,
  LoginResponse 
} from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  registerAdmin: (adminData: AdminRegisterRequest) => Promise<void>;
  registerShop: (shopData: ShopRegisterRequest) => Promise<void>;
  registerCustomer: (customerData: CustomerRegisterRequest) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Khởi tạo authentication state từ localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        if (apiService.isAuthenticated()) {
          const storedUser = apiService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          }
          // Không fetch từ server ngay lập tức để tránh delay
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Nếu có lỗi, xóa token
        apiService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response: LoginResponse = await apiService.login(credentials);
      
      // Lưu token và user data
      apiService.storeAuthData(response);
      setUser(response.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng nhập thất bại';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.register(userData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng ký thất bại';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerAdmin = async (adminData: AdminRegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.registerAdmin(adminData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng ký admin thất bại';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerShop = async (shopData: ShopRegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.registerShop(shopData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng ký shop thất bại';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (customerData: CustomerRegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.registerCustomer(customerData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng ký customer thất bại';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    registerAdmin,
    registerShop,
    registerCustomer,
    logout,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
