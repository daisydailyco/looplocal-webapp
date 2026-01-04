// content-scripts/tiktok.js
console.log('[ParaSosh] TikTok script loaded!', window.location.href);

class TikTokParaSosh {
  constructor() {
    this.platform = 'tiktok';
    this.customCategories = [];
    console.log('[ParaSosh] TikTokParaSosh initialized');
    this.init();
  }

  async init() {
    console.log('[ParaSosh] Init starting...');
    await this.loadCustomCategories();
    console.log('[ParaSosh] Categories loaded, adding buttons in 2s...');
    setTimeout(() => this.addSaveButtons(), 2000);
    this.observeNewVideos();
  }

  async loadCustomCategories() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customCategories'], (result) => {
        this.customCategories = result.customCategories || [];
        resolve();
      });
    });
  }

  async saveCustomCategory(category) {
    if (!category || this.customCategories.includes(category)) return;

    this.customCategories.push(category);
    await chrome.storage.local.set({ customCategories: this.customCategories });
  }

  addSaveButtons() {
    // TikTok has different structures for feed, profile pages, and single video modal
    // Try multiple selectors
    const videos = document.querySelectorAll([
      '[data-e2e="recommend-list-item-container"]', // FYP feed
      'div[class*="DivItemContainer"]', // Feed variations
      '[data-e2e="user-post-item"]', // Profile page videos
      'div[id^="SIGI_STATE"]', // Profile page wrapper
      'div[class*="DivVideoWrapper"]' // Single video modal
    ].join(', '));

    console.log(`[ParaSosh] Found ${videos.length} video containers`);

    videos.forEach(video => {
      if (!video.querySelector('.looplocal-save-btn')) {
        this.addSaveButtonToVideo(video);
      }
    });
  }

  addSaveButtonToVideo(video) {
    // Find the action buttons container (like, comment, share buttons)
    // Try multiple selectors for different page types
    const actionsContainer = video.querySelector('[class*="ActionItem"]')?.parentElement ||
                            video.querySelector('[data-e2e="browse-video-action-bar"]') ||
                            video.querySelector('[class*="DivActionItemContainer"]') ||
                            video.querySelector('[data-e2e="video-player-action-bar"]');

    if (!actionsContainer) {
      console.log('[ParaSosh] No actions container found for video');
      return;
    }

    console.log('[ParaSosh] Adding save button to video');

    const saveBtn = document.createElement('button');
    saveBtn.className = 'looplocal-save-btn';
    saveBtn.style.cssText = `
      background: white;
      border: 2px solid #42a746;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin: 8px 0;
      transition: all 0.2s ease;
      position: relative;
    `;

    saveBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
              stroke="#42a746" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.transform = 'scale(1.1)';
      saveBtn.style.boxShadow = '0 4px 12px rgba(66, 167, 70, 0.3)';
    });

    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.transform = 'scale(1)';
      saveBtn.style.boxShadow = 'none';
    });

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSaveClick(video, saveBtn);
    });

    actionsContainer.appendChild(saveBtn);
  }

  async handleSaveClick(video, button) {
    const videoData = this.extractVideoData(video);
    await this.loadCustomCategories();
    this.showEditModal(videoData, button);
  }

  showEditModal(videoData, button) {
    const existingModal = document.getElementById('looplocal-edit-modal');
    if (existingModal) existingModal.remove();

    const categoryOptions = this.customCategories.map(cat =>
      `<option value="${cat}">${cat}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.id = 'looplocal-edit-modal';
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
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
          <div style="
            padding: 20px;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <h3 style="
              margin: 0;
              color: #000000;
              font-size: 20px;
              font-weight: 700;
            ">Save to ParaSosh</h3>
            <button class="looplocal-modal-close" style="
              background: white;
              border: none;
              color: #000000;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              font-size: 24px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            ">×</button>
          </div>

          <div style="padding: 20px;">
            <div style="margin-bottom: 16px;">
              <label style="
                display: block;
                color: #000000;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 6px;
                opacity: 0.8;
              ">Category</label>
              <select id="looplocal-category" style="
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 8px;
                background: white;
                color: #000000;
                font-size: 14px;
                box-sizing: border-box;
                cursor: pointer;
              ">
                <option value="">Select a category...</option>
                ${categoryOptions}
                <option value="other">Other (Create New)</option>
              </select>
            </div>

            <div id="looplocal-custom-category-container" style="display: none; margin-bottom: 16px;">
              <label style="
                display: block;
                color: #000000;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 6px;
                opacity: 0.8;
              ">Custom Category Name</label>
              <input type="text" id="looplocal-custom-category" placeholder="e.g., Brunch Spots, Coffee Shops..." style="
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 8px;
                background: white;
                color: #000000;
                font-size: 14px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="
                display: block;
                color: #000000;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 6px;
                opacity: 0.8;
              ">Name</label>
              <input type="text" id="looplocal-name" placeholder="e.g., Bodega on Central, Red Mesa Cantina..." style="
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 8px;
                background: white;
                color: #000000;
                font-size: 14px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="
                display: block;
                color: #000000;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 6px;
                opacity: 0.8;
              ">Date</label>
              <input type="date" id="looplocal-date" style="
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 8px;
                background: white;
                color: #000000;
                font-size: 14px;
                box-sizing: border-box;
              ">
            </div>

            <div style="
              background: white;
              padding: 12px;
              border-radius: 8px;
              font-size: 12px;
              color: #000000;
              line-height: 1.6;
              opacity: 0.8;
            ">
              <strong>From:</strong> @${videoData.author || 'unknown'}
            </div>
          </div>

          <div style="
            padding: 20px;
            border-top: 1px solid rgba(0,0,0,0.1);
            display: flex;
            gap: 12px;
          ">
            <button class="looplocal-btn-cancel" style="
              flex: 1;
              padding: 12px;
              background: white;
              border: none;
              color: #000000;
              border-radius: 8px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">Cancel</button>
            <button class="looplocal-btn-save" style="
              flex: 1;
              padding: 12px;
              background: #42a746;
              border: none;
              color: white;
              border-radius: 8px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">Save</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachModalHandlers(videoData, button);
  }

  attachModalHandlers(videoData, button) {
    const closeBtn = document.querySelector('.looplocal-modal-close');
    const cancelBtn = document.querySelector('.looplocal-btn-cancel');
    const saveBtn = document.querySelector('.looplocal-btn-save');
    const categorySelect = document.getElementById('looplocal-category');
    const customCategoryContainer = document.getElementById('looplocal-custom-category-container');
    const customCategoryInput = document.getElementById('looplocal-custom-category');

    const closeModal = () => {
      const modal = document.getElementById('looplocal-edit-modal');
      if (modal) modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Show/hide custom category input when "Other" is selected
    categorySelect.addEventListener('change', () => {
      if (categorySelect.value === 'other') {
        customCategoryContainer.style.display = 'block';
        customCategoryInput.focus();
      } else {
        customCategoryContainer.style.display = 'none';
      }
    });

    saveBtn.addEventListener('click', async () => {
      let category = categorySelect.value;

      // If "Other" is selected, get custom category name
      if (category === 'other') {
        category = customCategoryInput.value.trim();
        if (!category) {
          alert('Please enter a custom category name');
          return;
        }
        // Save new category to storage
        await this.saveCustomCategory(category);
      }

      if (!category) {
        alert('Please select a category');
        return;
      }

      const name = document.getElementById('looplocal-name').value.trim();
      const date = document.getElementById('looplocal-date').value;

      const saveData = {
        ...videoData,
        category,
        event_name: name,
        venue_name: name,
        event_date: date,
        saved_at: new Date().toISOString()
      };

      chrome.runtime.sendMessage({
        action: 'saveItem',
        data: saveData
      }, (response) => {
        if (response && response.success) {
          button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#42a746">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          `;
          closeModal();

          setTimeout(() => {
            button.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                      stroke="#42a746" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
          }, 2000);
        }
      });
    });
  }

  extractVideoData(video) {
    // Extract TikTok video data
    let author = '';
    let content = '';
    let url = window.location.href;
    const images = [];

    // Try to find author
    const authorElement = video.querySelector('[data-e2e="browse-username"]') ||
                         video.querySelector('a[href*="/@"]') ||
                         video.querySelector('[class*="AuthorName"]');

    if (authorElement) {
      author = authorElement.innerText?.trim() ||
               authorElement.getAttribute('href')?.split('/@')[1]?.split('/')[0] || '';
    }

    // Try to find description/caption
    const captionElement = video.querySelector('[data-e2e="browse-video-desc"]') ||
                          video.querySelector('[class*="DivVideoDesc"]') ||
                          video.querySelector('[class*="SpanText"]');

    if (captionElement) {
      content = captionElement.innerText?.trim() || '';
    }

    // Try to get video thumbnail
    const thumbnail = video.querySelector('img[src*="tiktok"]');
    if (thumbnail && thumbnail.src) {
      images.push(thumbnail.src);
    }

    // Try to get video URL if on a specific video page
    const videoLink = video.querySelector('a[href*="/video/"]');
    if (videoLink) {
      url = 'https://www.tiktok.com' + videoLink.getAttribute('href');
    }

    return {
      platform: this.platform,
      content,
      images,
      author,
      url,
      event_name: '',
      venue_name: '',
      address: '',
      event_date: '',
      tags: this.extractHashtags(content)
    };
  }

  extractHashtags(text) {
    if (!text) return [];
    const hashtags = text.match(/#[\w]+/g);
    return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
  }

  observeNewVideos() {
    // Watch for DOM changes (new videos loading)
    const observer = new MutationObserver(() => {
      this.addSaveButtons();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also watch for URL changes (SPA navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('[ParaSosh] URL changed to:', currentUrl);
        // Give TikTok time to load the new content
        setTimeout(() => this.addSaveButtons(), 1000);
        setTimeout(() => this.addSaveButtons(), 2000);
      }
    }).observe(document, { subtree: true, childList: true });

    // Also check periodically (backup method)
    setInterval(() => {
      this.addSaveButtons();
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TikTokParaSosh();
  });
} else {
  new TikTokParaSosh();
}
