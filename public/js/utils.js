// Utility functions for frontend
class ApiClient {
  constructor() {
    this.baseUrl = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error.message);
      throw error;
    }
  }

  async get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  async post(endpoint, data, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers
    });
  }

  async put(endpoint, data, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers
    });
  }

  async delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

// Global API client instance
window.apiClient = new ApiClient();

// Common UI utilities
class UIUtils {
  static showError(element, message) {
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  }

  static hideError(element) {
    if (element) {
      element.textContent = '';
      element.style.display = 'none';
    }
  }

  static showLoading(button, loadingText = 'Yükleniyor...') {
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
    }
  }

  static hideLoading(button) {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Gönder';
    }
  }

  static validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  static validateRequired(value, minLength = 1) {
    return value && value.trim().length >= minLength;
  }
}

// Make UIUtils globally available
window.UIUtils = UIUtils;
