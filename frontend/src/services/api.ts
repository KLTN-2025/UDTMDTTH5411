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
  shopName?: string;
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

// FashionCLIP API interfaces
export interface FashionCLIPSearchResult {
  _id: string;
  id?: string; // Add id field for compatibility with Ecommerce backend
  name: string;
  description?: string;
  price: number;
  sale_price?: number;
  images: string[];
  shop_id: string;
  shop_name?: string;
  category_id: string;
  category_name?: string;
  similarity_score: number;
  distance: number;
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

  // FashionCLIP API methods
  async searchSimilarProducts(imageFile: File): Promise<FashionCLIPSearchResult[]> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch('http://localhost:8001/api/v1/search/similar', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Không thể tìm kiếm sản phẩm tương tự';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  async searchSimilarProductsByText(textQuery: string): Promise<FashionCLIPSearchResult[]> {
    const response = await fetch('http://localhost:8001/api/v1/search/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: textQuery }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.message || 'Không thể tìm kiếm sản phẩm tương tự';
      throw new Error(String(errorMessage));
    }

    return await response.json();
  }

  async getFashionCLIPStats(): Promise<{
    index_loaded: boolean;
    num_products: number;
    dimension: number;
    database: string;
    collection: string;
    image_field: string;
  }> {
    const response = await fetch('http://localhost:8001/api/v1/stats');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.message || 'Không thể lấy thống kê FashionCLIP';
      throw new Error(String(errorMessage));
    }

    return await response.json();
  }

  async buildFashionCLIPIndex(force: boolean = false): Promise<{
    success: boolean;
    message: string;
    stats: any;
    timestamp: string;
  }> {
    const response = await fetch('http://localhost:8001/api/v1/admin/build-index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.message || 'Không thể build index FashionCLIP';
      throw new Error(String(errorMessage));
    }

    return await response.json();
  }

  // Chatbot API methods
  async sendChatMessage(message: string, conversationId?: string, productContext?: any): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    conversation_id?: string;
  }> {
    return this.request('/chatbot/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        product_context: productContext
      }),
    });
  }

  async getProductRecommendations(preferences: string, budget?: string, size?: string): Promise<{
    success: boolean;
    recommendations: string;
    timestamp: string;
  }> {
    return this.request('/chatbot/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        preferences,
        budget,
        size
      }),
    });
  }

  async handleFAQ(question: string): Promise<{
    success: boolean;
    message: string;
    type: string;
    timestamp: string;
  }> {
    return this.request('/chatbot/faq', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // Messages API methods
  async sendMessage(data: {
    sender_id: string;
    receiver_id: string;
    content: string;
    shop_id?: string;
    product_id?: string;
  }): Promise<{
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    shop_id?: string;
    product_id?: string;
    created_at: string;
    read: boolean;
  }> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversations(): Promise<Array<{
    conversation_id: string;
    other_user_id: string;
    other_user_name: string;
    other_user_role: string;
    last_message?: string;
    last_message_time?: string;
    unread_count: number;
    product_id?: string;
    product_name?: string;
  }>> {
    return this.request('/messages/conversations', {
      method: 'GET',
    });
  }

  async getMessages(otherUserId: string, limit: number = 50, skip: number = 0): Promise<Array<{
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    shop_id?: string;
    product_id?: string;
    created_at: string;
    read: boolean;
  }>> {
    return this.request(`/messages/conversation/${otherUserId}?limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });
  }

  async markAsRead(messageId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/messages/${messageId}/read`, {
      method: 'PUT',
    });
  }

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return this.request('/messages/unread-count', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
