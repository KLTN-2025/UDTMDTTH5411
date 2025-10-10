// API service cho authentication
import { config } from '../config';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface Profile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  address?: Address;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: 'admin' | 'shop' | 'customer';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  profile?: Profile;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'shop' | 'customer';
  profile?: Profile;
}

export interface AdminRegisterRequest extends Omit<RegisterRequest, 'role'> {
  role: 'admin';
}

export interface ShopRegisterRequest extends Omit<RegisterRequest, 'role'> {
  role: 'shop';
  shopInfo?: Record<string, any>;
}

export interface CustomerRegisterRequest extends Omit<RegisterRequest, 'role'> {
  role: 'customer';
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: 'admin' | 'shop' | 'customer';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  profile?: Profile;
  createdAt?: string;
  updatedAt?: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = config.API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Thêm token nếu có
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Đăng nhập thất bại');
    }

    return await response.json();
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async registerAdmin(adminData: AdminRegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register/admin', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  }

  async registerShop(shopData: ShopRegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register/shop', {
      method: 'POST',
      body: JSON.stringify(shopData),
    });
  }

  async registerCustomer(customerData: CustomerRegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register/customer', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/users');
  }

  async getUserById(userId: string): Promise<User> {
    return this.request<User>(`/auth/users/${userId}`);
  }

  async updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<{message: string}> {
    return this.request<{message: string}>(`/auth/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ new_status: status }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  // Utility methods
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  storeAuthData(loginResponse: LoginResponse): void {
    localStorage.setItem('access_token', loginResponse.access_token);
    localStorage.setItem('user', JSON.stringify(loginResponse.user));
  }
}

export const apiService = new ApiService();
export default apiService;
