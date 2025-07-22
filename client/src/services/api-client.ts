import axios from 'axios';
import { Agent, DashboardStats } from '@/types';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dashboard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Agent management
  async getAgents(): Promise<{ agents: Agent[]; timestamp: string }> {
    const response = await api.get('/events/agents');
    return response.data;
  },

  // Authentication
  async getDashboardToken(): Promise<{ token: string; message: string }> {
    const response = await api.post('/auth/dashboard/token');
    return response.data;
  },

  async getAuthStatus(): Promise<{ message: string; timestamp: string; version: string }> {
    const response = await api.get('/auth/status');
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await api.get('/auth/status');
      return true;
    } catch {
      return false;
    }
  },

  // Statistics (Phase 2 will get this from the server)
  async getDashboardStats(): Promise<DashboardStats> {
    // For Phase 1, return mock stats
    // In Phase 2, this will be a real API endpoint
    const agents = await this.getAgents();
    return {
      totalAgents: agents.agents.length,
      activeAgents: agents.agents.filter(a => a.status === 'active').length,
      totalEvents: 0, // Will be tracked in Phase 2
      eventsToday: 0, // Will be tracked in Phase 2
    };
  }
};

export default api;