// Import auth module for service worker
importScripts('ext-auth.js');

class ParaSoshAPI {
  constructor() {
    this.API_BASE = 'https://web-production-5630.up.railway.app/v1';
    this.setupMessageHandlers();
    this.initializeAuth();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'SAVE_POST':
          this.handleSavePost(request.data).then(sendResponse);
          return true;
        
        case 'GET_SAVED_ITEMS':
          this.getSavedItems(request.filters).then(sendResponse);
          return true;
          
        case 'CHECK_AUTH':
          this.checkAuth().then(sendResponse);
          return true;
      }
    });
  }

  async initializeAuth() {
    // Clear any existing badge
    chrome.action.setBadgeText({ text: '' });

    const authToken = await chrome.storage.local.get(['authToken']);
    if (!authToken.authToken) {
      // Badge notifications disabled
      // chrome.action.setBadgeText({ text: '!' });
      // chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
    }
  }

  async handleSavePost(postData) {
  try {
    console.log('🔄 Saving post:', postData);

    // Check if user is authenticated
    const isAuthenticated = await extAuth.isLoggedIn();

    if (isAuthenticated) {
      // User is logged in - save to backend (which will call AI and store)
      console.log('✅ User authenticated - saving to backend');
      const result = await this.saveToBackend(postData);

      if (result.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: '🎉 Saved to ParaSosh!',
          message: 'Synced to your dashboard'
        });

        return result;
      } else {
        throw new Error('Backend save failed');
      }
    } else {
      // User not logged in - save locally
      console.log('⚠️ User not authenticated - saving locally');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '📍 Saved Locally',
        message: 'Log in to sync with dashboard'
      });

      return await this.saveLocally(postData);
    }

  } catch (error) {
    console.error('❌ Save failed:', error);

    // Fallback to local save if anything fails
    console.log('⚠️ Falling back to local save...');
    return await this.saveLocally(postData);
  }
}

  async saveToBackend(postData) {
    try {
      // Get auth headers
      const headers = await extAuth.getAuthHeaders();

      // Call POST /v1/user/saves (backend will do AI analysis automatically)
      const response = await fetch(`${this.API_BASE}/user/saves`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          platform: postData.platform,
          url: postData.url,
          content: postData.content || '',
          images: postData.images || [],
          author: postData.author || 'unknown',
          category: postData.category || null
        })
      });

      if (!response.ok) {
        throw new Error(`Backend save failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.item) {
        console.log('✅ Saved to backend:', result.item);

        // Also save locally for offline access
        await this.saveLocallyWithAI(postData, result.item);

        return {
          success: true,
          item: result.item
        };
      } else {
        throw new Error('Backend returned no item');
      }
    } catch (error) {
      console.error('Backend save error:', error);
      throw error;
    }
  }

async saveLocallyWithAI(postData, aiData) {
  const storage = await chrome.storage.local.get(['savedItems']);
  const savedItems = storage.savedItems || [];

  const newItem = {
    id: Date.now().toString(),
    ...postData,
    // Use user-provided data first, then AI-enhanced fields as fallback
    event_name: postData.event_name || aiData.event_name || this.extractTitle(postData.content),
    venue_name: postData.venue_name || aiData.venue_name || null,
    address: postData.address || aiData.address || null,
    event_date: postData.event_date || aiData.event_date || null,
    start_time: aiData.start_time,
    end_time: aiData.end_time,
    event_type: aiData.event_type,
    tags: aiData.suggested_tags || [],
    description: aiData.description,
    is_recurring: aiData.is_recurring,
    recurrence_pattern: aiData.recurrence_pattern,
    ai_processed: true,
    confidence_score: aiData.confidence_score,
    saved_at: new Date().toISOString()
  };

  savedItems.unshift(newItem);
  await chrome.storage.local.set({ savedItems: savedItems.slice(0, 100) });

  return { success: true, data: newItem };
}

  async saveLocally(postData) {
    const storage = await chrome.storage.local.get(['savedItems']);
    const savedItems = storage.savedItems || [];

    const newItem = {
      id: Date.now().toString(),
      ...postData,
      saved_at: new Date().toISOString(),
      // Use user-provided data first, then extract from content as fallback
      event_name: postData.event_name || this.extractTitle(postData.content),
      venue_name: postData.venue_name || null,
      tags: []
    };

    savedItems.unshift(newItem);

    await chrome.storage.local.set({
      savedItems: savedItems.slice(0, 100)
    });

    return { success: true, data: newItem };
  }

  extractTitle(content) {
    if (!content) return 'Saved Post';
    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence.substring(0, 50) + (firstSentence.length > 50 ? '...' : '');
  }

  async getSavedItems(filters = {}) {
    const storage = await chrome.storage.local.get(['savedItems']);
    return { items: storage.savedItems || [] };
  }

  async getSavedItemsCount() {
    const result = await this.getSavedItems();
    return result.items.length;
  }

  async checkAuth() {
    const user = await extAuth.getUser();
    return {
      user: user
    };
  }
}

new ParaSoshAPI();