// content-scripts/instagram.js
class InstagramParaSosh {
  constructor() {
    this.platform = 'instagram';
    this.customCategories = [];
    this.init();
  }

  async init() {
    await this.loadCustomCategories();
    setTimeout(() => this.addSaveButtons(), 2000);
    this.observeNewPosts();
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
    const posts = document.querySelectorAll('article[role="presentation"]');
    posts.forEach(post => {
      if (!post.querySelector('.looplocal-save-btn')) {
        this.addSaveButtonToPost(post);
      }
    });
  }

  addSaveButtonToPost(post) {
    const actionsContainer = post.querySelector('section > div');
    if (!actionsContainer) return;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'looplocal-save-btn';
    saveBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" 
              stroke="#42a746" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="color: #42a746; font-weight: 700;">Save to ParaSosh</span>
    `;

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSaveClick(post, saveBtn);
    });

    actionsContainer.appendChild(saveBtn);
  }

  async handleSaveClick(post, button) {
    const postData = this.extractPostData(post);
    await this.loadCustomCategories();
    this.showEditModal(postData, button);
  }

  showEditModal(postData, button) {
    const existingModal = document.getElementById('looplocal-edit-modal');
    if (existingModal) existingModal.remove();

    // Only show saved custom categories
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
              <strong>From:</strong> @${postData.author || 'unknown'}<br>
              <strong>Content preview:</strong> ${postData.content.substring(0, 100)}...
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
              background: white;
              border: none;
              color: #000000;
              border-radius: 8px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">Save to ParaSosh</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.bindModalEvents(modal, postData, button);
  }

  bindModalEvents(modal, postData, button) {
    const categorySelect = document.getElementById('looplocal-category');
    const customCategoryContainer = document.getElementById('looplocal-custom-category-container');
    const customCategoryInput = document.getElementById('looplocal-custom-category');

    // Category dropdown
    categorySelect.addEventListener('change', () => {
      if (categorySelect.value === 'other') {
        customCategoryContainer.style.display = 'block';
        customCategoryInput.focus();
      } else {
        customCategoryContainer.style.display = 'none';
        customCategoryInput.value = '';
      }
    });

    // Close button
    const closeBtn = modal.querySelector('.looplocal-modal-close');
    closeBtn.addEventListener('click', () => this.closeModal(modal));
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.boxShadow = 'none';
    });

    // Cancel button
    const cancelBtn = modal.querySelector('.looplocal-btn-cancel');
    cancelBtn.addEventListener('click', () => this.closeModal(modal));
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.boxShadow = 'none';
    });

    // Save button
    const saveBtn = modal.querySelector('.looplocal-btn-save');
    saveBtn.addEventListener('click', async () => {
      let category = categorySelect.value;
      
      if (category === 'other') {
        const customCategory = customCategoryInput.value.trim();
        if (!customCategory) {
          customCategoryInput.style.borderColor = 'rgba(237, 73, 86, 0.8)';
          customCategoryInput.placeholder = 'Please enter a category name';
          return;
        }
        category = customCategory;
        await this.saveCustomCategory(category);
      }

      if (!category) {
        categorySelect.style.borderColor = 'rgba(237, 73, 86, 0.8)';
        return;
      }

      const name = document.getElementById('looplocal-name').value.trim();
      const date = document.getElementById('looplocal-date').value;

      const enrichedPostData = {
        ...postData,
        category: category,
        event_name: name || category,
        venue_name: name || null,  // Only set if user entered something
        event_date: date || null
      };

      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.7';

      await this.saveToBackend(enrichedPostData, button);
      this.closeModal(modal);
    });
    saveBtn.addEventListener('mouseenter', () => {
      if (!saveBtn.disabled) {
        saveBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        saveBtn.style.transform = 'translateY(-2px)';
      }
    });
    saveBtn.addEventListener('mouseleave', () => {
      if (!saveBtn.disabled) {
        saveBtn.style.boxShadow = 'none';
        saveBtn.style.transform = 'translateY(0)';
      }
    });

    // Click outside to close
    modal.querySelector('div').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal(modal);
      }
    });

    setTimeout(() => categorySelect.focus(), 100);
  }

  closeModal(modal) {
    modal.remove();
  }

  async saveToBackend(postData, button) {
    button.classList.add('looplocal-loading');
    button.innerHTML = `
      <div class="looplocal-spinner"></div>
      <span style="color: #1877f2; font-weight: 600;">Saving...</span>
    `;

    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'SAVE_POST',
          data: postData
        }, resolve);
      });

      if (result && result.success) {
        this.showSuccessState(button);
      } else {
        this.showErrorState(button);
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showErrorState(button);
    }
  }

  extractPostData(post) {
    const textElement = post.querySelector('h1');
    const content = textElement ? textElement.innerText : '';
    const images = Array.from(post.querySelectorAll('img'))
      .map(img => img.src)
      .filter(src => src && !src.includes('profile'));

    // Try multiple selectors to find the author
    let author = '';

    // Method 1: Try header a tag
    let authorElement = post.querySelector('header a');
    if (authorElement && authorElement.innerText) {
      author = authorElement.innerText.trim();
    }

    // Method 2: Try header span with link
    if (!author) {
      authorElement = post.querySelector('header span a');
      if (authorElement && authorElement.innerText) {
        author = authorElement.innerText.trim();
      }
    }

    // Method 3: Try any link in header that looks like a username
    if (!author) {
      const headerLinks = post.querySelectorAll('header a');
      for (let link of headerLinks) {
        const text = link.innerText.trim();
        // Username shouldn't have spaces and should be reasonable length
        if (text && !text.includes(' ') && text.length > 0 && text.length < 50) {
          author = text;
          break;
        }
      }
    }

    // Method 4: Extract from URL if present
    if (!author) {
      const profileLink = post.querySelector('header a[href^="/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        const match = href.match(/^\/([^\/]+)\/?/);
        if (match && match[1]) {
          author = match[1];
        }
      }
    }

    console.log('Extracted author:', author);

    return {
      platform: this.platform,
      content: content,
      images: images.slice(0, 3),
      author: author,
      url: window.location.href
    };
  }

  showSuccessState(button) {
    button.classList.remove('looplocal-loading');
    button.classList.add('looplocal-saved');
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#42a746">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <span style="color: #42a746; font-weight: 700;">✓ Saved!</span>
    `;
    setTimeout(() => {
      button.classList.remove('looplocal-saved');
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" 
                stroke="#42a746" stroke-width="2.5"/>
        </svg>
        <span style="color: #42a746; font-weight: 700;">Save to ParaSosh</span>
      `;
    }, 3000);
  }

  showErrorState(button) {
    button.classList.remove('looplocal-loading');
    button.classList.add('looplocal-error');
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" 
              stroke="#ed4956" stroke-width="2.5"/>
      </svg>
      <span style="color: #ed4956; font-weight: 600;">Error - Try Again</span>
    `;
    setTimeout(() => {
      button.classList.remove('looplocal-error');
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" 
                stroke="#42a746" stroke-width="2.5"/>
        </svg>
        <span style="color: #42a746; font-weight: 700;">Save to ParaSosh</span>
      `;
    }, 3000);
  }

  observeNewPosts() {
    const observer = new MutationObserver(() => {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = setTimeout(() => {
        this.addSaveButtons();
      }, 1000);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new InstagramParaSosh());
} else {
  new InstagramParaSosh();
}