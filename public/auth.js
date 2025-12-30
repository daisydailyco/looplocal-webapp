// LoopLocal Authentication Helper
const API_BASE = 'https://web-production-5630.up.railway.app';

// Session storage keys
const SESSION_KEY = 'looplocal_session';
const USER_KEY = 'looplocal_user';

// ===== API Functions =====

async function signup(email, password) {
  try {
    const response = await fetch(`${API_BASE}/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log('Signup response:', JSON.stringify(data, null, 2)); // Debug log - show full structure

    if (data.success && data.user) {
      // Save session if available (will be null if email confirmation required)
      if (data.session) {
        saveSession(data.session);
      }
      saveUser(data.user);
      return {
        success: true,
        user: data.user,
        needsEmailConfirmation: !data.session // Flag if email confirmation is needed
      };
    } else {
      console.error('Signup failed - data.success:', data.success, 'data.error:', data.error); // Debug log
      return { success: false, error: data.error || 'Signup failed' };
    }
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success && data.session) {
      saveSession(data.session);
      saveUser(data.user);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

async function logout() {
  try {
    const session = getSession();
    if (session && session.access_token) {
      await fetch(`${API_BASE}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear local session
    clearSession();
  }
}

async function verifySession() {
  try {
    const session = getSession();
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

    if (data.valid) {
      return { valid: true, user: data.user };
    } else {
      clearSession();
      return { valid: false };
    }
  } catch (error) {
    console.error('Verify session error:', error);
    clearSession();
    return { valid: false };
  }
}

async function getCurrentUser() {
  const verification = await verifySession();
  if (verification.valid) {
    return verification.user;
  }
  return null;
}

// ===== Local Storage Functions =====

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

function getSession() {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
}

function getUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

function isLoggedIn() {
  const session = getSession();
  return session && session.access_token;
}

// ===== Helper Functions =====

function redirectToLogin() {
  window.location.href = '/login.html';
}

function redirectToDashboard() {
  window.location.href = '/dashboard.html';
}

function redirectToHome() {
  window.location.href = '/index.html';
}
