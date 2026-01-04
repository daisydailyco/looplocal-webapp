// ParaSosh Extension Authentication Module
// Shared between popup and background scripts

const API_BASE = 'https://web-production-5630.up.railway.app';

class ExtensionAuth {
  constructor() {
    this.session = null;
    this.user = null;
  }

  // Login with email and password
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success && data.session) {
        // Store session in chrome.storage.sync (syncs across devices)
        await chrome.storage.sync.set({
          looplocal_session: data.session,
          looplocal_user: data.user
        });

        this.session = data.session;
        this.user = data.user;

        console.log('[Auth] Login successful:', data.user.email);

        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Login failed'
        };
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  // Logout
  async logout() {
    try {
      // Get current session
      const { looplocal_session } = await chrome.storage.sync.get(['looplocal_session']);

      if (looplocal_session && looplocal_session.access_token) {
        // Call backend logout
        await fetch(`${API_BASE}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${looplocal_session.access_token}`
          }
        });
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      // Clear local session regardless of backend response
      await chrome.storage.sync.remove(['looplocal_session', 'looplocal_user']);
      this.session = null;
      this.user = null;

      console.log('[Auth] Logged out');
    }
  }

  // Get current session
  async getSession() {
    if (this.session) {
      return this.session;
    }

    const { looplocal_session } = await chrome.storage.sync.get(['looplocal_session']);
    this.session = looplocal_session || null;
    return this.session;
  }

  // Get current user
  async getUser() {
    if (this.user) {
      return this.user;
    }

    const { looplocal_user } = await chrome.storage.sync.get(['looplocal_user']);
    this.user = looplocal_user || null;
    return this.user;
  }

  // Check if user is logged in
  async isLoggedIn() {
    const session = await this.getSession();
    return !!(session && session.access_token);
  }

  // Verify session with backend
  async verifySession() {
    try {
      const session = await this.getSession();

      if (!session || !session.access_token) {
        return { valid: false };
      }

      const response = await fetch(`${API_BASE}/v1/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (data.valid && data.user) {
        // Update stored user info
        await chrome.storage.sync.set({
          looplocal_user: data.user
        });

        this.user = data.user;

        return {
          valid: true,
          user: data.user
        };
      } else {
        // Session invalid, clear it
        await this.logout();
        return { valid: false };
      }
    } catch (error) {
      console.error('[Auth] Session verification error:', error);
      return { valid: false };
    }
  }

  // Get auth headers for API calls
  async getAuthHeaders() {
    const session = await this.getSession();

    if (session && session.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    }

    return {
      'Content-Type': 'application/json'
    };
  }
}

// Create singleton instance
const extAuth = new ExtensionAuth();
