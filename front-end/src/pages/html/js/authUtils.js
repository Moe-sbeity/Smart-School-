/**
 * Authentication Utility for Smart School System
 * Handles token management, user session, and route protection
 */

const API_URL = "http://localhost:5001/api";

// Token management
const AuthUtils = {
  /**
   * Get the stored token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Get the stored user
   * @returns {object|null}
   */
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Store authentication data
   * @param {string} token 
   * @param {object} user 
   */
  setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Clear authentication data
   */
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  },

  /**
   * Get user role
   * @returns {string|null}
   */
  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  /**
   * Check if user has specific role
   * @param {string|string[]} roles 
   * @returns {boolean}
   */
  hasRole(roles) {
    const userRole = this.getRole();
    if (!userRole) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(userRole);
    }
    return userRole === roles;
  },

  /**
   * Get authorization headers
   * @returns {object}
   */
  getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  },

  /**
   * Make authenticated API call
   * @param {string} endpoint 
   * @param {string} method 
   * @param {object|null} body 
   * @returns {Promise<object>}
   */
  async apiCall(endpoint, method = 'GET', body = null) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle unauthorized - redirect to login
      if (response.status === 401 || response.status === 403) {
        this.clearAuth();
        window.location.href = '/login.html';
        throw new Error('Session expired. Please login again.');
      }
      
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.apiCall('/users/logout', 'POST');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
      window.location.href = '/login.html';
    }
  },

  /**
   * Verify token with server
   * @returns {Promise<boolean>}
   */
  async verifyToken() {
    try {
      await this.apiCall('/users/checkAuth');
      return true;
    } catch (error) {
      return false;
    }
  }
};

/**
 * Route Protection
 * Call this at the top of protected pages
 */
const ProtectRoute = {
  /**
   * Require authentication
   * Redirects to login if not authenticated
   */
  async requireAuth() {
    if (!AuthUtils.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }

    // Verify token with server
    const isValid = await AuthUtils.verifyToken();
    if (!isValid) {
      AuthUtils.clearAuth();
      window.location.href = '/login.html';
      return false;
    }

    return true;
  },

  /**
   * Require specific role
   * @param {string|string[]} allowedRoles 
   */
  async requireRole(allowedRoles) {
    const isAuth = await this.requireAuth();
    if (!isAuth) return false;

    if (!AuthUtils.hasRole(allowedRoles)) {
      if (typeof Toast !== 'undefined') {
        Toast.error('Access denied. You do not have permission to view this page.');
      }
      this.redirectToDashboard();
      return false;
    }

    return true;
  },

  /**
   * Redirect to role-specific dashboard
   */
  redirectToDashboard() {
    const role = AuthUtils.getRole();
    const dashboards = {
      admin: '/Admin/admin-dashboard.html',
      student: '/Student/student-dashboard.html',
      teacher: '/Teacher/teacher-dashboard.html',
      parent: '/Parent/parent-dashboard.html'
    };
    
    window.location.href = dashboards[role] || '/login.html';
  },

  /**
   * Redirect if already authenticated (for login page)
   */
  redirectIfAuthenticated() {
    if (AuthUtils.isAuthenticated()) {
      this.redirectToDashboard();
      return true;
    }
    return false;
  }
};

/**
 * Display user info in dashboard
 */
const DisplayUserInfo = {
  /**
   * Update user name display
   * @param {string} elementId 
   */
  setUserName(elementId = 'userName') {
    const user = AuthUtils.getUser();
    const element = document.getElementById(elementId);
    if (element && user) {
      element.textContent = user.name;
    }
  },

  /**
   * Set user avatar initials
   * @param {string} elementId 
   */
  setUserAvatar(elementId = 'userAvatar') {
    const user = AuthUtils.getUser();
    const element = document.getElementById(elementId);
    if (element && user) {
      element.textContent = user.name.charAt(0).toUpperCase();
    }
  },

  /**
   * Set class grade display (for students)
   * @param {string} gradeElementId 
   * @param {string} sectionElementId 
   */
  setClassInfo(gradeElementId = 'classGrade', sectionElementId = 'classSection') {
    const user = AuthUtils.getUser();
    const gradeEl = document.getElementById(gradeElementId);
    const sectionEl = document.getElementById(sectionElementId);
    
    if (gradeEl && user?.classGrade) {
      gradeEl.textContent = user.classGrade.toUpperCase();
    }
    if (sectionEl && user?.classSection) {
      sectionEl.textContent = `Section ${user.classSection}`;
    }
  },

  /**
   * Initialize all user displays
   */
  init() {
    this.setUserName();
    this.setUserAvatar();
    this.setClassInfo();
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthUtils, ProtectRoute, DisplayUserInfo };
}
