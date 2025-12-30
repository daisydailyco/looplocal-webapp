// popup.js - Complete with Share Functionality & Authentication
class LoopLocalPopup {
  constructor() {
    this.currentUser = null;
    this.savedItems = [];
    this.sortByDate = 'desc';
    this.filterCategory = null;
    this.viewMode = 'saves';
    this.previousView = 'saves';
    this.previewItem = null;
    this.editingItem = null;
    this.map = null;
    this.markers = [];
    this.radarInitialized = false;
    this.autocompleteInstance = null;
    this.selectedAddress = null;
    this.isAuthenticated = false;
    this.init();
  }

  async init() {
    try {
      this.initializeRadar();

      // Check authentication first
      this.isAuthenticated = await extAuth.isLoggedIn();

      if (!this.isAuthenticated) {
        // Show login screen
        this.showLoginScreen();
        return;
      }

      // Get user info
      this.currentUser = await extAuth.getUser();

      // Show dashboard
      await this.loadSavedItems();
      this.showDashboard();
      this.renderDashboard();
    } catch (error) {
      console.error('Popup init failed:', error);
      this.renderError(error.message);
    }
  }

  showLoginScreen() {
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';

    // Bind login form
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      // Show loading
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      loginError.style.display = 'none';

      try {
        const result = await extAuth.login(email, password);

        if (result.success) {
          // Login successful, reload popup
          window.location.reload();
        } else {
          // Show error
          loginError.textContent = result.error || 'Login failed';
          loginError.style.display = 'block';
          loginBtn.disabled = false;
          loginBtn.textContent = 'Log In';
        }
      } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'An error occurred. Please try again.';
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Log In';
      }
    });
  }

  showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('user-info').style.display = 'block';

    // Show user email
    if (this.currentUser && this.currentUser.email) {
      document.getElementById('user-email').textContent = this.currentUser.email;
    }

    // Bind logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';

      await extAuth.logout();

      // Reload popup to show login screen
      window.location.reload();
    });
  }

  initializeRadar() {
    if (window.Radar && !this.radarInitialized) {
      try {
        Radar.initialize('prj_live_pk_8c9d4c6a85d8b9e0aacb1b2f6f7ec0ead4cb799a');
        this.radarInitialized = true;
        console.log('Radar initialized in popup');
      } catch (error) {
        console.error('Failed to initialize Radar:', error);
      }
    }
  }

  async geocodeAddress(address) {
    if (!window.Radar || !this.radarInitialized) {
      console.error('Radar not initialized');
      return null;
    }

    try {
      console.log('🔍 Geocoding address:', address);

      // Use Radar's forward geocoding API
      const response = await Radar.geocode.forward({
        query: address
      });

      if (response && response.addresses && response.addresses.length > 0) {
        const result = response.addresses[0];
        console.log('📍 Geocode result:', result);

        // Coordinates might be in array format or separate properties
        const lat = result.coordinates?.[0] || result.latitude || null;
        const lng = result.coordinates?.[1] || result.longitude || null;

        return {
          latitude: lat,
          longitude: lng,
          address: result.formattedAddress || address,
          city: result.city || '',
          state: result.stateCode || '',
          postalCode: result.postalCode || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  initializeEditAutocomplete() {
    if (!window.Radar || !this.radarInitialized) {
      console.error('Radar not initialized yet');
      return;
    }

    const container = document.getElementById('edit-location-autocomplete');
    if (!container) {
      console.error('Autocomplete container not found');
      return;
    }

    try {
      // Clean up previous instance if exists
      if (this.autocompleteInstance) {
        try {
          this.autocompleteInstance.remove();
        } catch (e) {
          console.log('Previous autocomplete already removed');
        }
      }

      // Get current location value if exists (address only, not name)
      const currentLocation = this.editingItem?.address || '';

      // Reset selected address
      this.selectedAddress = null;

      // Initialize new autocomplete
      this.autocompleteInstance = Radar.ui.autocomplete({
        container: 'edit-location-autocomplete',
        width: '100%',
        responsive: true,
        placeholder: currentLocation || 'Search for full address...',
        near: '27.7676,-82.6403', // St. Petersburg, FL
        layers: ['place', 'address'],
        limit: 8,
        debounceMS: 300,
        minCharacters: 3,
        showMarkers: false,
        markerColor: '#42a746',
        onSelection: (address) => {
          // Radar returns coordinates as an array [lat, lng]
          const lat = address.coordinates?.[0] || address.latitude || null;
          const lng = address.coordinates?.[1] || address.longitude || null;

          this.selectedAddress = {
            ...address,
            latitude: lat,
            longitude: lng,
            formattedAddress: address.formattedAddress || address.addressLabel || ''
          };

          console.log('Location selected:', {
            name: address.placeLabel || address.formattedAddress,
            latitude: lat,
            longitude: lng,
            city: address.city,
            state: address.stateCode,
            postalCode: address.postalCode
          });
        },
        onError: (error) => {
          console.error('Autocomplete error:', error);
        }
      });

      console.log('Edit autocomplete initialized');
    } catch (error) {
      console.error('Failed to initialize edit autocomplete:', error);
    }
  }

  async checkAuth() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'CHECK_AUTH'
      }, (response) => {
        this.currentUser = response?.user || null;
        resolve();
      });
    });
  }

  async loadSavedItems() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'GET_SAVED_ITEMS',
        filters: {}
      }, (response) => {
        this.savedItems = response?.items || [];
        resolve();
      });
    });
  }

  getCategories() {
    const categories = new Set();
    this.savedItems.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories).sort();
  }

  getUncategorizedItems() {
    return this.savedItems.filter(item => !item.category);
  }

  sortItems(items) {
    let sorted = [...items];
    
    if (this.filterCategory === 'no-category') {
      sorted = sorted.filter(item => !item.category);
    } else if (this.filterCategory && this.filterCategory !== 'all') {
      sorted = sorted.filter(item => item.category === this.filterCategory);
    }
    
    sorted.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date) : new Date(a.saved_at);
      const dateB = b.event_date ? new Date(b.event_date) : new Date(b.saved_at);
      
      if (this.sortByDate) {
        return this.sortByDate === 'desc' ? dateB - dateA : dateA - dateB;
      }
      
      return dateB - dateA;
    });
    
    return sorted;
  }

  getSectionTitle() {
    if (this.filterCategory === 'no-category') {
      return 'No Category';
    } else if (this.filterCategory && this.filterCategory !== 'all') {
      return this.filterCategory;
    }
    return 'Saved Items';
  }

  showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'looplocal-confirm-overlay';
      overlay.innerHTML = `
        <div class="looplocal-confirm-modal">
          <div class="looplocal-confirm-title">Confirm</div>
          <div class="looplocal-confirm-message">${message}</div>
          <div class="looplocal-confirm-buttons">
            <button class="looplocal-confirm-btn looplocal-confirm-btn-cancel">Cancel</button>
            <button class="looplocal-confirm-btn looplocal-confirm-btn-confirm">Remove</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('.looplocal-confirm-btn-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      overlay.querySelector('.looplocal-confirm-btn-confirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  renderDashboard() {
    const content = document.getElementById('app-content');

    if (this.viewMode === 'edit') {
      content.innerHTML = this.renderEditView();
      this.bindDashboardEvents();
      // Initialize autocomplete after DOM is ready
      setTimeout(() => {
        this.initializeEditAutocomplete();
      }, 100);
      return;
    }

    if (this.viewMode === 'preview') {
      content.innerHTML = this.renderPreviewView();
      this.bindDashboardEvents();
      return;
    }

    if (this.viewMode === 'map') {
      content.innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px;">
          <button class="view-btn" data-view="saves" style="flex: 1; background: white; border: none; color: #000000; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
            📋 Saves
          </button>
          <button class="view-btn active" data-view="map" style="flex: 1; background: white; border: none; color: #000000; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            🧭 Directions
          </button>
        </div>
        ${this.renderMapView()}
      `;
      this.bindDashboardEvents();
      return;
    }

    content.innerHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px;">
        <button class="view-btn active" data-view="saves" style="flex: 1; background: white; border: none; color: #000000; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
          📋 Saves
        </button>
        <button class="view-btn" data-view="map" style="flex: 1; background: white; border: none; color: #000000; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
          🧭 Directions
        </button>
      </div>

      ${this.renderSavesView()}
    `;

    this.bindDashboardEvents();
  }

  renderSavesView() {
    const sortedItems = this.sortItems(this.savedItems);
    const categories = this.getCategories();
    const uncategorizedCount = this.getUncategorizedItems().length;
    const sectionTitle = this.getSectionTitle();

    // Check if we can share (viewing a specific category)
    const canShare = this.filterCategory && this.filterCategory !== 'all' && this.filterCategory !== 'no-category';

    // Get items missing locations (only for current category if filtering)
    const itemsNeedingLocation = canShare ? sortedItems.filter(item =>
      !item.latitude || !item.longitude
    ) : [];

    return `
      <div class="recent-saves">
        ${canShare ? `
          <!-- Category Name Centered -->
          <div style="text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
            ${sectionTitle}
          </div>

          <!-- Back Button (Left) & Share Button (Right) -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid white;">
            <button id="back-to-all-btn" style="background: white; border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
              ← Back
            </button>
            <button id="share-category-btn" style="background: rgba(66, 167, 70, 0.1); border: 1px solid rgba(66, 167, 70, 0.3); color: #42A746; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 4px;">
              <span>🔗</span>
              <span>Share</span>
            </button>
          </div>
        ` : `
          <!-- Section Title (No Category Selected) -->
          <div class="section-title" style="margin-bottom: 12px;">${sectionTitle}</div>
        `}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px;">
          <select id="category-filter" style="background: white; border: 1px solid #F0F0F0; color: #000000; padding: 6px 8px; border-radius: 6px; font-size: 11px; cursor: pointer;">
            <option value="" disabled ${!this.filterCategory ? 'selected' : ''}>Category</option>
            <option value="all" ${this.filterCategory === 'all' ? 'selected' : ''}>All Saves</option>
            ${uncategorizedCount > 0 ? `<option value="no-category" ${this.filterCategory === 'no-category' ? 'selected' : ''}>No Category (${uncategorizedCount})</option>` : ''}
            ${categories.map(cat => `
              <option value="${cat}" ${this.filterCategory === cat ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>

          <select id="date-sort" style="background: white; border: 1px solid #F0F0F0; color: #000000; padding: 6px 8px; border-radius: 6px; font-size: 11px; cursor: pointer;">
            <option value="" disabled ${!this.sortByDate ? 'selected' : ''}>Saved</option>
            <option value="desc" ${this.sortByDate === 'desc' ? 'selected' : ''}>Newest</option>
            <option value="asc" ${this.sortByDate === 'asc' ? 'selected' : ''}>Oldest</option>
          </select>
        </div>

        <!-- Add from Link Button -->
        <div style="margin-bottom: 12px;">
          <button id="add-from-link-btn" style="width: 100%; background: white; border: none; color: #000000; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <span>🔗</span>
            <span>Add from Link</span>
          </button>
        </div>

        <div id="recent-items">
          ${this.renderRecentItems(sortedItems)}
        </div>

        ${canShare && itemsNeedingLocation.length > 0 ? `
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #FF6B6B; text-align: center;">
              Items Missing Location
            </div>
            ${this.renderMissingLocationCards(itemsNeedingLocation)}
          </div>
        ` : ''}
      </div>

      <div class="actions">
        <button class="action-button" id="waitlist-btn">Join the App Waitlist!</button>
      </div>
    `;
  }

  renderPreviewView() {
    if (!this.previewItem) {
      this.viewMode = 'saves';
      return this.renderSavesView();
    }

    const hasCategory = this.previewItem.category;

    return `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <!-- Category Title - First Line -->
        ${hasCategory ? `
          <div style="text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
            ${this.previewItem.category}
          </div>
        ` : ''}

        <!-- Header with Back (Left) & View All (Right) - Second Line -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid white;">
          <button id="back-btn" style="background: white; border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
            ← Back
          </button>

          ${hasCategory ? `
            <button id="view-all-category-btn" style="background: white; border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
              View All
            </button>
          ` : `
            <button id="add-category-btn" style="background: rgba(0,0,0,0.1); border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
              + Add Category
            </button>
          `}
        </div>

        <!-- Item Details -->
        <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; position: relative;">
          ${hasCategory ? `
            <button id="edit-preview-btn" style="
              position: absolute;
              top: 8px;
              right: 8px;
              background: white;
              border: none;
              color: #000000;
              padding: 4px 8px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 600;
              transition: all 0.2s;
              min-width: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">+</button>
          ` : ''}
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 15px;">
            ${this.formatItemTitle(this.previewItem)}
          </div>
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">
            ${this.formatItemDetails(this.previewItem)}
          </div>
          ${this.previewItem.content ? `
            <div style="font-size: 12px; opacity: 0.7; line-height: 1.5; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
              ${this.previewItem.content.substring(0, 200)}${this.previewItem.content.length > 200 ? '...' : ''}
            </div>
          ` : ''}
        </div>

        <!-- Link Preview Action -->
        <div style="background: white; border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 13px; font-weight: 600; opacity: 0.9;">Link Preview</div>
          <button id="open-new-tab-btn" style="background: white; border: 1px solid rgba(0,0,0,0.1); color: #000000; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;">
            Open in Tab ↗
          </button>
        </div>
      </div>
    `;
  }

  renderEditView() {
    if (!this.editingItem) {
      this.viewMode = 'saves';
      return this.renderSavesView();
    }

    return `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid white;">
          <button id="cancel-edit-btn" style="background: white; border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
            Cancel
          </button>
          <div style="flex: 1; font-size: 15px; font-weight: 700; text-align: center;">Edit Item</div>
        </div>

        <!-- Edit Form -->
        <div style="flex: 1;">
          <div style="margin-bottom: 14px;">
            <label style="display: block; color: #000000; font-weight: 600; font-size: 12px; margin-bottom: 6px; opacity: 0.9;">Category</label>
            <select id="edit-category" style="width: 100%; padding: 10px; border: 1px solid #F0F0F0; border-radius: 6px; background: white; color: #000000; font-size: 13px; box-sizing: border-box; cursor: pointer;">
              <option value="">Select a category...</option>
              ${this.getCategories().map(cat => `
                <option value="${cat}" ${this.editingItem.category === cat ? 'selected' : ''}>${cat}</option>
              `).join('')}
              <option value="other" ${this.editingItem.category && !this.getCategories().includes(this.editingItem.category) ? 'selected' : ''}>Other (Create New)</option>
            </select>
          </div>

          <div id="edit-custom-category-container" style="display: ${this.editingItem.category && !this.getCategories().includes(this.editingItem.category) ? 'block' : 'none'}; margin-bottom: 14px;">
            <label style="display: block; color: #000000; font-weight: 600; font-size: 12px; margin-bottom: 6px; opacity: 0.9;">Custom Category Name</label>
            <input type="text" id="edit-custom-category" value="${this.editingItem.category && !this.getCategories().includes(this.editingItem.category) ? this.editingItem.category : ''}" placeholder="e.g., Brunch Spots, Coffee Shops..." style="width: 100%; padding: 10px; border: 1px solid #F0F0F0; border-radius: 6px; background: white; color: #000000; font-size: 13px; box-sizing: border-box;">
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; color: #000000; font-weight: 600; font-size: 12px; margin-bottom: 6px; opacity: 0.9;">Name</label>
            <input type="text" id="edit-name" value="${this.editingItem.venue_name || this.editingItem.event_name || ''}" placeholder="e.g., Bodega on Central, Red Mesa Cantina" style="width: 100%; padding: 10px; border: 1px solid #F0F0F0; border-radius: 6px; background: white; color: #000000; font-size: 13px; box-sizing: border-box;">
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; color: #000000; font-weight: 600; font-size: 12px; margin-bottom: 6px; opacity: 0.9;">Location</label>
            <div id="edit-location-autocomplete"></div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; color: #000000; font-weight: 600; font-size: 12px; margin-bottom: 6px; opacity: 0.9;">Date</label>
            <input type="date" id="edit-date" value="${this.editingItem.event_date || ''}" style="width: 100%; padding: 10px; border: 1px solid #F0F0F0; border-radius: 6px; background: white; color: #000000; font-size: 13px; box-sizing: border-box;">
          </div>

          <!-- Remove and Save Buttons (bottom row) -->
          <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
            <button id="remove-edit-btn" style="background: white; border: none; color: #000000; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
              Remove
            </button>
            <button id="save-edit-btn" style="background: #F0F0F0; border: none; color: #000000; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderMapView() {
    // Filter by category first, then by locations with coordinates
    let itemsToShow = this.savedItems;

    // Apply category filter
    if (this.filterCategory === 'no-category') {
      itemsToShow = itemsToShow.filter(item => !item.category);
    } else if (this.filterCategory && this.filterCategory !== 'all') {
      itemsToShow = itemsToShow.filter(item => item.category === this.filterCategory);
    }

    // Then filter for items with coordinates (needed for map)
    const locationsWithCoords = itemsToShow.filter(item =>
      item.latitude && item.longitude
    );

    // Count items without locations
    const itemsNeedingLocation = itemsToShow.filter(item =>
      !item.latitude || !item.longitude
    );

    // Check if we can share (viewing a specific category)
    const canShare = this.filterCategory && this.filterCategory !== 'all' && this.filterCategory !== 'no-category';
    const sectionTitle = this.getSectionTitle();

    if (locationsWithCoords.length === 0) {
      return `
        ${canShare ? `
          <!-- Category Name Centered -->
          <div style="text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
            ${sectionTitle}
          </div>

          <!-- Back Button (Left) & Share Button (Right) -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid white;">
            <button id="back-to-all-btn" style="background: white; border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
              ← Back
            </button>
            <button id="share-category-btn" style="background: rgba(66, 167, 70, 0.1); border: 1px solid rgba(66, 167, 70, 0.3); color: #42A746; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 4px;">
              <span>🔗</span>
              <span>Share</span>
            </button>
          </div>
        ` : ''}
        <div style="text-align: center; padding: 40px 20px; background: white; border-radius: 12px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 16px;">No Locations Yet</div>
          <div style="font-size: 13px; opacity: 0.8;">Save items with addresses to see them on the map</div>
        </div>
      `;
    }

    return `
      ${canShare ? `
        <!-- Category Name Centered -->
        <div style="text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
          ${sectionTitle}
        </div>

        <!-- Back Button (Left) & Share Button (Right) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid white;">
          <button id="back-to-all-btn" style="background: white; border: none; color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
            ← Back
          </button>
          <button id="share-category-btn" style="background: rgba(66, 167, 70, 0.3); border: 1px solid rgba(66, 167, 70, 0.5); color: #000000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 4px;">
            <span>🔗</span>
            <span>Share</span>
          </button>
        </div>
      ` : ''}

      <div style="text-align: center; font-size: 12px; opacity: 0.7; margin-bottom: 8px; line-height: 1.4;">
        Share your saves to see your list in map view
      </div>

      <div style="margin-bottom: 12px;">
        <button id="open-all-maps-btn" style="width: 100%; background: white; border: none; color: #000000; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s;">
          Open in Google Maps
        </button>
      </div>

      <div style="font-size: 12px; font-weight: 600; margin-bottom: 12px; opacity: 0.9; text-align: center;">
        ${locationsWithCoords.length} location${locationsWithCoords.length !== 1 ? 's' : ''} saved
        ${itemsNeedingLocation.length > 0 ? `<span style="color: #FF6B6B; margin-left: 8px;">• ${itemsNeedingLocation.length} need${itemsNeedingLocation.length === 1 ? 's' : ''} location</span>` : ''}
      </div>
      <div id="location-list">
        ${this.renderLocationCards(locationsWithCoords)}
      </div>

      ${itemsNeedingLocation.length > 0 ? `
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #FF6B6B; text-align: center;">
            Items Missing Location
          </div>
          ${this.renderMissingLocationCards(itemsNeedingLocation)}
        </div>
      ` : ''}
    `;
  }

  renderLocationCards(locations) {
    if (locations.length === 0) return '';

    return locations.map((item, index) => `
      <div class="location-card" data-item-id="${item.id}" data-location="${encodeURIComponent(item.address || '')}" style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; transition: all 0.2s; position: relative; cursor: pointer;">
        <div style="display: flex; gap: 12px; align-items: start;">
          <div style="background: rgba(0,0,0,0.1); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0;">
            ${index + 1}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px;">
              ${this.formatItemTitle(item)}
            </div>
            <div style="font-size: 11px; opacity: 0.8;">
              ${this.formatItemDetails(item)}
            </div>
          </div>
          <button class="edit-location-btn" data-item-id="${item.id}" style="background: white; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 11px; font-weight: 600; color: #000000; flex-shrink: 0; transition: all 0.2s;">
            Edit
          </button>
        </div>
      </div>
    `).join('');
  }

  renderMissingLocationCards(items) {
    if (items.length === 0) return '';

    return items.map(item => `
      <div class="missing-location-card" data-item-id="${item.id}" style="background: rgba(255, 107, 107, 0.05); border: 1px solid rgba(255, 107, 107, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 8px; transition: all 0.2s;">
        <div style="display: flex; gap: 12px; align-items: start;">
          <div style="background: rgba(255, 107, 107, 0.2); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; color: #FF6B6B;">
            !
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px;">
              ${this.formatItemTitle(item)}
            </div>
            <div style="font-size: 11px; opacity: 0.8;">
              ${this.formatItemDetails(item)}
            </div>
          </div>
          <button class="edit-location-btn" data-item-id="${item.id}" style="background: white; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 11px; font-weight: 600; color: #000000; flex-shrink: 0; transition: all 0.2s;">
            Add Location
          </button>
        </div>
      </div>
    `).join('');
  }



  renderRecentItems(items) {
    if (items.length === 0) {
      let message = 'No saves yet!';
      let subMessage = 'Visit Instagram and click Save to LoopLocal on posts';
      
      if (this.filterCategory === 'no-category') {
        message = 'No uncategorized items';
        subMessage = 'All your saves have categories! 🎉';
      } else if (this.filterCategory && this.filterCategory !== 'all') {
        message = `No items in "${this.filterCategory}"`;
        subMessage = 'Try selecting a different category';
      }
      
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📍</div>
          <div>${message}</div>
          <div style="font-size: 12px; margin-top: 8px;">
            ${subMessage}
          </div>
        </div>
      `;
    }

    return items.map(item => {
      const displayTitle = this.formatItemTitle(item);
      const displayDetails = this.formatItemDetails(item);

      return `
        <div class="save-item" data-item-id="${item.id}" style="position: relative;">
          <div class="save-item-content">
            <div class="save-item-title">${displayTitle}</div>
            <div class="save-item-details">${displayDetails}</div>
          </div>
          <button class="edit-btn" data-item-id="${item.id}" style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: white;
            border: none;
            color: #000000;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.2s;
            min-width: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">+</button>
        </div>
      `;
    }).join('');
  }

  formatItemTitle(item) {
    // Show Name as the title
    return item.venue_name || item.event_name || 'Saved Item';
  }

  formatItemDetails(item) {
    const parts = [];

    // Social (platform)
    if (item.platform) {
      parts.push(item.platform);
    }

    // @ (author)
    if (item.author) {
      const handle = item.author.startsWith('@') ? item.author : `@${item.author}`;
      parts.push(handle);
    }

    // Category
    if (item.category) {
      parts.push(item.category);
    }

    // Fallback to saved date if no details
    if (parts.length === 0) {
      parts.push(this.formatDate(item.saved_at));
    }

    return parts.join(' • ');
  }

  formatEventDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      const diffTime = itemDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays > 1 && diffDays <= 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return null;
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  async shareCategory() {
    try {
      // Get items in current category
      const categoryItems = this.savedItems.filter(item =>
        item.category === this.filterCategory
      );

      if (categoryItems.length === 0) {
        alert('No items to share in this category!');
        return;
      }

      // Show loading state
      const shareBtn = document.getElementById('share-category-btn');
      if (shareBtn) {
        shareBtn.innerHTML = '<span>⏳</span><span>Sharing...</span>';
        shareBtn.style.pointerEvents = 'none';
      }

      // Format items to match backend SavedItem model
      const formattedItems = categoryItems.map(item => ({
        id: item.id || Date.now().toString(),
        user_id: item.user_id || (this.currentUser?.id || 'local'),
        platform: item.platform || 'instagram',
        url: item.url || '',
        content: item.content || '',
        images: item.images || [],
        author: item.author || 'unknown',
        event_name: item.event_name || null,
        venue_name: item.venue_name || null,
        address: item.address || null,
        coordinates: item.coordinates || null,
        event_date: item.event_date || null,
        start_time: item.start_time || null,
        end_time: item.end_time || null,
        event_type: item.event_type || item.category || null,
        tags: item.tags || [],
        category: item.category || null,
        ai_processed: item.ai_processed || false,
        confidence_score: item.confidence_score || 0.0,
        saved_at: item.saved_at || new Date().toISOString()
      }));

      console.log('🚀 Sharing category:', this.filterCategory);
      console.log('📦 Items to share:', formattedItems.length);

      // Send to backend
      const response = await fetch('https://web-production-5630.up.railway.app/v1/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: this.filterCategory,
          items: formattedItems
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Failed to create share link: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(result.share_url);

      // Show success modal
      this.showShareSuccess(result.share_url);

    } catch (error) {
      console.error('Share failed:', error);
      alert(`Failed to create share link: ${error.message}\n\nPlease try again or check the console for more details.`);

      // Reset button
      const shareBtn = document.getElementById('share-category-btn');
      if (shareBtn) {
        shareBtn.innerHTML = '<span>🔗</span><span>Share</span>';
        shareBtn.style.pointerEvents = 'auto';
      }
    }
  }

  showShareSuccess(shareUrl) {
    const overlay = document.createElement('div');
    overlay.className = 'looplocal-confirm-overlay';
    overlay.innerHTML = `
      <div class="looplocal-confirm-modal">
        <div class="looplocal-confirm-title">🎉 Share Link Created!</div>
        <div class="looplocal-confirm-message" style="margin-bottom: 16px;">
          Link copied to clipboard!
        </div>
        <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 16px; word-break: break-all; font-size: 12px;">
          ${shareUrl}
        </div>
        <div class="looplocal-confirm-buttons">
          <button class="looplocal-confirm-btn looplocal-confirm-btn-cancel" id="close-share-modal">Close</button>
          <button class="looplocal-confirm-btn looplocal-confirm-btn-confirm" id="open-share-link">Open Link</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#close-share-modal').addEventListener('click', () => {
      overlay.remove();
      this.renderDashboard();
    });

    overlay.querySelector('#open-share-link').addEventListener('click', () => {
      chrome.tabs.create({ url: shareUrl });
      overlay.remove();
      this.renderDashboard();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.renderDashboard();
      }
    });
  }

  bindDashboardEvents() {
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.view;
        this.renderDashboard();
      });
      
      btn.addEventListener('mouseenter', (e) => {
        if (!btn.classList.contains('active')) {
          e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }
      });
      btn.addEventListener('mouseleave', (e) => {
        if (!btn.classList.contains('active')) {
          e.target.style.boxShadow = 'none';
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      const itemId = btn.dataset.itemId;

      btn.addEventListener('mouseenter', (e) => {
        e.stopPropagation();
        e.target.textContent = 'Edit';
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        e.target.style.padding = '4px 10px';
        e.target.style.fontSize = '11px';
      });

      btn.addEventListener('mouseleave', (e) => {
        e.target.textContent = '+';
        e.target.style.boxShadow = 'none';
        e.target.style.padding = '4px 8px';
        e.target.style.fontSize = '16px';
      });

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const savedItem = this.savedItems.find(i => i.id === itemId);
        if (savedItem) {
          this.previousView = this.viewMode;
          this.editingItem = savedItem;
          this.viewMode = 'edit';
          this.renderDashboard();
        }
      });
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.viewMode = 'saves';
        this.previewItem = null;
        this.renderDashboard();
      });
      backBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      backBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const editPreviewBtn = document.getElementById('edit-preview-btn');
    if (editPreviewBtn) {
      editPreviewBtn.addEventListener('click', () => {
        this.previousView = this.viewMode; // Save current view before editing
        this.editingItem = this.previewItem;
        this.viewMode = 'edit';
        this.renderDashboard();
      });
      editPreviewBtn.addEventListener('mouseenter', (e) => {
        e.target.textContent = 'Edit';
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        e.target.style.padding = '4px 10px';
        e.target.style.fontSize = '11px';
      });
      editPreviewBtn.addEventListener('mouseleave', (e) => {
        e.target.textContent = '+';
        e.target.style.boxShadow = 'none';
        e.target.style.padding = '4px 8px';
        e.target.style.fontSize = '16px';
      });
    }

    const removeEditBtn = document.getElementById('remove-edit-btn');
    if (removeEditBtn) {
      removeEditBtn.addEventListener('click', async () => {
        const confirmed = await this.showConfirm('Are you sure you want to remove this saved item?');
        if (confirmed) {
          // Clean up autocomplete
          if (this.autocompleteInstance) {
            try {
              this.autocompleteInstance.remove();
            } catch (e) {
              console.log('Autocomplete already removed');
            }
          }
          this.autocompleteInstance = null;
          this.selectedAddress = null;

          await this.removeItem(this.editingItem.id);
          this.viewMode = 'saves';
          this.editingItem = null;
          this.previewItem = null;
        }
      });
      removeEditBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      removeEditBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const viewAllCategoryBtn = document.getElementById("view-all-category-btn");
    if (viewAllCategoryBtn) {
      viewAllCategoryBtn.addEventListener("click", () => {
        // Set filter to the current item's category
        this.filterCategory = this.previewItem.category;
        this.viewMode = "saves";
        this.previewItem = null;
        this.renderDashboard();
      });
      viewAllCategoryBtn.addEventListener("mouseenter", (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      viewAllCategoryBtn.addEventListener("mouseleave", (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => {
        this.previousView = this.viewMode; // Save current view before editing
        this.editingItem = this.previewItem;
        this.viewMode = 'edit';
        this.renderDashboard();
      });
      addCategoryBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      addCategoryBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        // Clean up autocomplete
        if (this.autocompleteInstance) {
          try {
            this.autocompleteInstance.remove();
          } catch (e) {
            console.log('Autocomplete already removed');
          }
        }
        this.autocompleteInstance = null;
        this.selectedAddress = null;

        // Go back to the previous view
        this.viewMode = this.previousView;
        this.editingItem = null;
        this.renderDashboard();
      });
      cancelEditBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      cancelEditBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const editCategorySelect = document.getElementById('edit-category');
    const editCustomCategoryContainer = document.getElementById('edit-custom-category-container');
    const editCustomCategoryInput = document.getElementById('edit-custom-category');
    if (editCategorySelect && editCustomCategoryContainer) {
      editCategorySelect.addEventListener('change', () => {
        if (editCategorySelect.value === 'other') {
          editCustomCategoryContainer.style.display = 'block';
          if (editCustomCategoryInput) editCustomCategoryInput.focus();
        } else {
          editCustomCategoryContainer.style.display = 'none';
        }
      });
    }

    const saveEditBtn = document.getElementById('save-edit-btn');
    if (saveEditBtn) {
      saveEditBtn.addEventListener('click', async () => {
        await this.saveItemEdit();
      });
      saveEditBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      saveEditBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const openNewTabBtn = document.getElementById('open-new-tab-btn');
    if (openNewTabBtn && this.previewItem) {
      openNewTabBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: this.previewItem.url });
      });
      openNewTabBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      openNewTabBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    const dateSort = document.getElementById('date-sort');
    if (dateSort) {
      dateSort.addEventListener('change', (e) => {
        this.sortByDate = e.target.value || null;
        this.renderDashboard();
      });
    }

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '' || value === 'all') {
          this.filterCategory = null;
        } else {
          this.filterCategory = value;
        }
        this.renderDashboard();
      });
    }

    const waitlistBtn = document.getElementById('waitlist-btn');
    if (waitlistBtn) {
      waitlistBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://looplocal.app' });
      });
    }

    const addFromLinkBtn = document.getElementById('add-from-link-btn');
    if (addFromLinkBtn) {
      addFromLinkBtn.addEventListener('click', () => {
        this.showAddFromLinkModal();
      });
      addFromLinkBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });
      addFromLinkBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    // SHARE BUTTON EVENT LISTENER
    const shareCategoryBtn = document.getElementById('share-category-btn');
    if (shareCategoryBtn) {
      shareCategoryBtn.addEventListener('click', async () => {
        await this.shareCategory();
      });
      
      shareCategoryBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });

      shareCategoryBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    // BACK BUTTON EVENT LISTENER
    const backToAllBtn = document.getElementById("back-to-all-btn");
    if (backToAllBtn) {
      backToAllBtn.addEventListener("click", () => {
        this.filterCategory = "all";
        this.renderDashboard();
      });

      backToAllBtn.addEventListener("mouseenter", (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });

      backToAllBtn.addEventListener("mouseleave", (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    // Map view: Open all locations button
    const openAllMapsBtn = document.getElementById('open-all-maps-btn');
    if (openAllMapsBtn) {
      openAllMapsBtn.addEventListener('click', () => {
        // Filter by category first
        let itemsToShow = this.savedItems;

        if (this.filterCategory === 'no-category') {
          itemsToShow = itemsToShow.filter(item => !item.category);
        } else if (this.filterCategory && this.filterCategory !== 'all') {
          itemsToShow = itemsToShow.filter(item => item.category === this.filterCategory);
        }

        const locations = itemsToShow
          .filter(item => item.address)
          .map(item => item.address)
          .join('|');

        if (locations) {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locations.split('|')[0])}&waypoints=${encodeURIComponent(locations.split('|').slice(1).join('|'))}`;
          chrome.tabs.create({ url });
        }
      });
    }

    // Map view: Edit location buttons
    document.querySelectorAll('.edit-location-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const item = this.savedItems.find(i => i.id === itemId);
        if (item) {
          this.previousView = this.viewMode; // Save current view before editing
          this.editingItem = item;
          this.viewMode = 'edit';
          this.renderDashboard();
        }
      });

      btn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });

      btn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    });

    if (openAllMapsBtn) {
      openAllMapsBtn.addEventListener('mouseenter', (e) => {
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      });

      openAllMapsBtn.addEventListener('mouseleave', (e) => {
        e.target.style.boxShadow = 'none';
      });
    }

    // Map view: Individual location cards
    document.querySelectorAll('.location-card').forEach(card => {
      card.addEventListener('click', () => {
        const location = decodeURIComponent(card.dataset.location);
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        chrome.tabs.create({ url });
      });

      card.addEventListener('mouseenter', (e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateX(4px)';
      });

      card.addEventListener('mouseleave', (e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateX(0)';
      });
    });

    document.querySelectorAll('.save-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) return;

        const itemId = item.dataset.itemId;
        const savedItem = this.savedItems.find(i => i.id === itemId);
        if (savedItem) {
          // Filter by the item's category
          if (savedItem.category) {
            this.filterCategory = savedItem.category;
          } else {
            this.filterCategory = 'no-category';
          }
          this.renderDashboard();
        }
      });
    });
  }

  async removeItem(itemId) {
    const storage = await chrome.storage.local.get(['savedItems']);
    const savedItems = storage.savedItems || [];
    
    const updatedItems = savedItems.filter(item => item.id !== itemId);
    
    await chrome.storage.local.set({ savedItems: updatedItems });
    this.savedItems = updatedItems;
    this.renderDashboard();
  }

  async saveItemEdit() {
    let category = document.getElementById('edit-category').value;

    // If "Other" is selected, get custom category name
    if (category === 'other') {
      const customCategoryInput = document.getElementById('edit-custom-category');
      category = customCategoryInput ? customCategoryInput.value.trim() : '';
      if (!category) {
        alert('Please enter a custom category name');
        return;
      }
    }

    const name = document.getElementById('edit-name').value.trim();
    const date = document.getElementById('edit-date').value;

    // Get location data from Radar autocomplete if selected, otherwise keep existing
    let locationData = {};
    if (this.selectedAddress) {
      locationData = {
        address: this.selectedAddress.formattedAddress || '',
        latitude: this.selectedAddress.latitude || null,
        longitude: this.selectedAddress.longitude || null,
        city: this.selectedAddress.city || '',
        state: this.selectedAddress.stateCode || '',
        postalCode: this.selectedAddress.postalCode || ''
      };
      console.log('💾 Saving location data from autocomplete:', locationData);
    } else {
      // Keep existing location data if no new selection
      locationData = {
        address: this.editingItem.address || '',
        latitude: this.editingItem.latitude || null,
        longitude: this.editingItem.longitude || null,
        city: this.editingItem.city || '',
        state: this.editingItem.state || '',
        postalCode: this.editingItem.postalCode || ''
      };
      console.log('💾 Keeping existing location data:', locationData);
    }

    // If we have an address but no coordinates, try geocoding
    if (locationData.address && (!locationData.latitude || !locationData.longitude)) {
      console.log('⚠️ Address exists but no coordinates, attempting geocoding...');
      try {
        const geocoded = await this.geocodeAddress(locationData.address);
        if (geocoded) {
          locationData = { ...locationData, ...geocoded };
          console.log('✅ Geocoding successful:', locationData);
        }
      } catch (error) {
        console.error('❌ Geocoding failed:', error);
      }
    }

    const storage = await chrome.storage.local.get(['savedItems']);
    const savedItems = storage.savedItems || [];

    const itemIndex = savedItems.findIndex(i => i.id === this.editingItem.id);
    if (itemIndex !== -1) {
      savedItems[itemIndex] = {
        ...savedItems[itemIndex],
        category: category,
        venue_name: name,
        event_name: name || category,
        event_date: date,
        ...locationData
      };

      console.log('📦 Final saved item:', {
        name: savedItems[itemIndex].venue_name,
        category: savedItems[itemIndex].category,
        address: savedItems[itemIndex].address,
        lat: savedItems[itemIndex].latitude,
        lng: savedItems[itemIndex].longitude
      });

      await chrome.storage.local.set({ savedItems });
      this.savedItems = savedItems;
      this.previewItem = savedItems[itemIndex];
      this.editingItem = null;

      // If we came from map view, go back to map. Otherwise go to preview.
      this.viewMode = (this.previousView === 'map') ? 'map' : 'preview';

      // Clean up autocomplete
      if (this.autocompleteInstance) {
        try {
          this.autocompleteInstance.remove();
        } catch (e) {
          console.log('Autocomplete already removed');
        }
      }
      this.autocompleteInstance = null;
      this.selectedAddress = null;

      this.renderDashboard();
    }
  }

  renderError(message) {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div style="font-weight: 600; margin-bottom: 8px;">Something went wrong</div>
        <div style="opacity: 0.8; font-size: 14px;">${message}</div>
      </div>
    `;
  }

  showAddFromLinkModal() {
    const modal = document.createElement('div');
    modal.id = 'add-from-link-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #f0f0f0 0%, #f9f8e5 100%);
          border-radius: 16px;
          width: 90%;
          max-width: 320px;
          padding: 24px;
        ">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #000000;">Add from Link</h3>
          <p style="margin: 0 0 16px 0; font-size: 13px; opacity: 0.8; color: #000000;">Paste an Instagram or TikTok link</p>

          <textarea id="link-input" placeholder="https://www.instagram.com/p/...
https://www.tiktok.com/@user/video/..." style="
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 8px;
            background: white;
            color: #000000;
            font-size: 13px;
            font-family: inherit;
            resize: vertical;
            box-sizing: border-box;
            margin-bottom: 16px;
          "></textarea>

          <div style="display: flex; gap: 12px;">
            <button id="cancel-link-btn" style="
              flex: 1;
              padding: 12px;
              background: white;
              border: none;
              color: #000000;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">Cancel</button>
            <button id="add-link-btn" style="
              flex: 1;
              padding: 12px;
              background: #42a746;
              border: none;
              color: white;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">Add</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector('#cancel-link-btn');
    const addBtn = modal.querySelector('#add-link-btn');
    const input = modal.querySelector('#link-input');

    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });

    addBtn.addEventListener('click', () => {
      const url = input.value.trim();
      if (url) {
        this.handleAddFromLink(url);
        modal.remove();
      } else {
        alert('Please paste a link');
      }
    });
  }

  parsePostUrl(url) {
    try {
      // Instagram patterns
      const igPostMatch = url.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
      const igUserMatch = url.match(/instagram\.com\/([^/?]+)/);

      // TikTok patterns
      const ttVideoMatch = url.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/);
      const ttUserMatch = url.match(/tiktok\.com\/@([^/?]+)/);

      if (igPostMatch) {
        return {
          platform: 'instagram',
          author: igUserMatch ? igUserMatch[1] : '',
          url: url
        };
      } else if (ttVideoMatch) {
        return {
          platform: 'tiktok',
          author: ttVideoMatch[1],
          url: url
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }

  async handleAddFromLink(url) {
    const parsed = this.parsePostUrl(url);

    if (!parsed) {
      alert('Invalid link. Please paste an Instagram or TikTok URL.');
      return;
    }

    // Create a new item with parsed data
    const newItem = {
      id: Date.now().toString(),
      platform: parsed.platform,
      author: parsed.author,
      url: url,
      content: '',
      images: [],
      category: '',
      event_name: '',
      venue_name: '',
      address: '',
      latitude: null,
      longitude: null,
      event_date: '',
      tags: [],
      saved_at: new Date().toISOString()
    };

    // Save to storage
    const storage = await chrome.storage.local.get(['savedItems']);
    const savedItems = storage.savedItems || [];
    savedItems.unshift(newItem);
    await chrome.storage.local.set({ savedItems });

    // Reload items
    await this.loadSavedItems();

    // Open edit view for the new item
    this.previousView = this.viewMode; // Save current view before editing
    this.editingItem = newItem;
    this.viewMode = 'edit';
    this.renderDashboard();
  }
}

new LoopLocalPopup();
