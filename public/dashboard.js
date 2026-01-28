// LoopLocal Dashboard JavaScript
// Handles user saves management, map view, categories, and all dashboard functionality

// Global state
let allSaves = [];
let filteredSaves = [];
let currentUser = null;
let map = null;
let mapInitialized = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// DOM elements
const loadingDiv = document.getElementById('loading');
const dashboardDiv = document.getElementById('dashboard');
const userEmailSpan = document.getElementById('user-email');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// My Saves tab elements
const savesGrid = document.getElementById('saves-grid');
const emptyState = document.getElementById('empty-state');
const sortSelect = document.getElementById('sort-select');
const categoryFilter = document.getElementById('category-filter');

// Map elements
const mapDiv = document.getElementById('map');

// Categories elements
const categoriesGrid = document.getElementById('categories-grid');
const categoriesEmpty = document.getElementById('categories-empty');

// Modal elements
const addModal = document.getElementById('add-modal');
const editModal = document.getElementById('edit-modal');
const addForm = document.getElementById('add-form');
const editForm = document.getElementById('edit-form');

// Buttons
const addSaveBtn = document.getElementById('add-save-btn');
const logoutBtn = document.getElementById('logout-btn');

// Initialize dashboard
async function init() {
  try {
    // Verify authentication
    const verification = await verifySession();

    if (!verification.valid) {
      // Not logged in, redirect to login page
      window.location.href = '/login.html';
      return;
    }

    currentUser = verification.user;
    userEmailSpan.textContent = currentUser.email || 'User';

    // Fetch user's saves
    await fetchSaves();

    // Show dashboard
    loadingDiv.style.display = 'none';
    dashboardDiv.style.display = 'block';

    // Initialize event listeners
    initEventListeners();

    // Render initial view
    renderSaves();

  } catch (error) {
    console.error('Dashboard initialization error:', error);
    alert('Failed to load dashboard. Please try logging in again.');
    window.location.href = '/login.html';
  }
}

// Fetch saves from backend
async function fetchSaves() {
  try {
    const session = getSession();
    if (!session) throw new Error('No session found');

    const response = await fetch(`${API_BASE}/v1/user/saves`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch saves');
    }

    const data = await response.json();
    allSaves = data.saves || [];
    filteredSaves = [...allSaves];

    console.log('Fetched saves:', allSaves.length);
  } catch (error) {
    console.error('Error fetching saves:', error);
    allSaves = [];
    filteredSaves = [];
  }
}

// Initialize event listeners
function initEventListeners() {
  // Logout button
  logoutBtn.addEventListener('click', handleLogout);

  // Add save button
  addSaveBtn.addEventListener('click', openAddModal);

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Filters
  sortSelect.addEventListener('change', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);

  // Add form submission
  addForm.addEventListener('submit', handleAddSave);

  // Edit form submission
  editForm.addEventListener('submit', handleEditSave);
}

// Handle logout
async function handleLogout() {
  logoutBtn.disabled = true;
  logoutBtn.textContent = 'Logging out...';

  await logout();
  window.location.href = '/';
}

// Switch tabs
function switchTab(tabName) {
  // Update tab buttons
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab content
  tabContents.forEach(content => {
    content.classList.remove('active');
  });

  if (tabName === 'saves') {
    document.getElementById('saves-tab').classList.add('active');
  } else if (tabName === 'map') {
    document.getElementById('map-tab').classList.add('active');
    initMap();
  } else if (tabName === 'calendar') {
    document.getElementById('calendar-tab').classList.add('active');
    renderCalendar();
  } else if (tabName === 'categories') {
    document.getElementById('categories-tab').classList.add('active');
    renderCategories();
  }
}

// Render saves cards
function renderSaves() {
  savesGrid.innerHTML = '';

  if (filteredSaves.length === 0) {
    savesGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  savesGrid.style.display = 'grid';
  emptyState.style.display = 'none';

  // Update category filter options
  updateCategoryFilter();

  filteredSaves.forEach(save => {
    const card = createSaveCard(save);
    savesGrid.appendChild(card);
  });
}

// Create save card element
function createSaveCard(save) {
  const card = document.createElement('div');
  card.className = 'save-card';

  // Format date
  let dateStr = '';
  if (save.event_date) {
    const date = new Date(save.event_date);
    dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Tags HTML
  const tagsHTML = (save.tags || []).map(tag =>
    `<span class="tag">${tag}</span>`
  ).join('');

  card.innerHTML = `
    <div class="card-edit-icon" data-save-id="${save.id}">+</div>
    <div class="card-title">${save.event_name || save.venue_name || 'Untitled'}</div>
    ${save.address ? `<div class="card-address">📍 ${save.address}</div>` : ''}
    ${dateStr ? `<div class="card-date">📅 ${dateStr}</div>` : ''}
    ${save.category ? `<div class="card-category">${save.category}</div>` : ''}
    ${save.tags && save.tags.length > 0 ? `<div class="card-tags">${tagsHTML}</div>` : ''}
    <div class="card-link-preview">
      <button class="card-link-btn" data-url="${save.url || ''}">Link Preview - Open in Tab</button>
    </div>
  `;

  // Edit icon click handler
  const editIcon = card.querySelector('.card-edit-icon');
  editIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    editSave(save.id);
  });

  // Link button click handler
  const linkBtn = card.querySelector('.card-link-btn');
  linkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (save.url) {
      window.open(save.url, '_blank');
    }
  });

  return card;
}

// Update category filter dropdown
function updateCategoryFilter() {
  const categories = new Set();
  allSaves.forEach(save => {
    if (save.category) {
      categories.add(save.category);
    }
  });

  // Keep "All Categories" option
  categoryFilter.innerHTML = '<option value="">All Categories</option>';

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categoryFilter.appendChild(option);
  });
}

// Apply filters and sorting
function applyFilters() {
  const sortValue = sortSelect.value;
  const categoryValue = categoryFilter.value;

  // Filter by category
  filteredSaves = allSaves.filter(save => {
    if (categoryValue && save.category !== categoryValue) {
      return false;
    }
    return true;
  });

  // Sort
  filteredSaves.sort((a, b) => {
    switch (sortValue) {
      case 'newest':
        return new Date(b.saved_at) - new Date(a.saved_at);
      case 'oldest':
        return new Date(a.saved_at) - new Date(b.saved_at);
      case 'name-asc':
        const nameA = (a.event_name || a.venue_name || '').toLowerCase();
        const nameB = (b.event_name || b.venue_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      case 'name-desc':
        const nameA2 = (a.event_name || a.venue_name || '').toLowerCase();
        const nameB2 = (b.event_name || b.venue_name || '').toLowerCase();
        return nameB2.localeCompare(nameA2);
      default:
        return 0;
    }
  });

  renderSaves();
}

// Initialize map
function initMap() {
  if (mapInitialized) {
    return;
  }

  // Get saves with coordinates
  const savesWithCoords = allSaves.filter(save =>
    save.coordinates && save.coordinates.lat && save.coordinates.lng
  );

  if (savesWithCoords.length === 0) {
    mapDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🗺️</div>
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #000;">No maps yet!</h2>
        <p style="font-size: 16px; color: #666;">Click "Add Save" to get started</p>
      </div>
    `;
    return;
  }

  // Initialize map
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_key', // You'll need to get a MapTiler API key
    center: [savesWithCoords[0].coordinates.lng, savesWithCoords[0].coordinates.lat],
    zoom: 12
  });

  // Add markers
  savesWithCoords.forEach((save, index) => {
    // Create custom marker
    const el = document.createElement('div');
    el.style.cssText = `
      background: #000;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    el.textContent = index + 1;

    // Create popup
    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
      <div style="padding: 8px;">
        <strong>${save.event_name || save.venue_name || 'Location'}</strong><br>
        ${save.address || ''}
        <br><br>
        <a href="https://www.google.com/maps/search/?api=1&query=${save.coordinates.lat},${save.coordinates.lng}"
           target="_blank"
           style="color: #000; font-weight: 600;">
          Open in Google Maps →
        </a>
      </div>
    `);

    // Add marker to map
    new maplibregl.Marker(el)
      .setLngLat([save.coordinates.lng, save.coordinates.lat])
      .setPopup(popup)
      .addTo(map);
  });

  // Fit bounds to show all markers
  if (savesWithCoords.length > 1) {
    const bounds = new maplibregl.LngLatBounds();
    savesWithCoords.forEach(save => {
      bounds.extend([save.coordinates.lng, save.coordinates.lat]);
    });
    map.fitBounds(bounds, { padding: 50 });
  }

  mapInitialized = true;
}

// Render categories
function renderCategories() {
  categoriesGrid.innerHTML = '';

  // Group saves by category
  const categoryGroups = {};
  allSaves.forEach(save => {
    const category = save.category || 'uncategorized';
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(save);
  });

  const categories = Object.keys(categoryGroups);

  if (categories.length === 0) {
    categoriesGrid.style.display = 'none';
    categoriesEmpty.style.display = 'block';
    return;
  }

  categoriesGrid.style.display = 'grid';
  categoriesEmpty.style.display = 'none';

  // Category icons
  const categoryIcons = {
    restaurant: '🍽️',
    bar: '🍺',
    event: '🎉',
    activity: '🎯',
    venue: '🏛️',
    other: '📌',
    uncategorized: '📁'
  };

  categories.forEach(category => {
    const card = document.createElement('div');
    card.className = 'category-card';

    const icon = categoryIcons[category] || '📌';
    const count = categoryGroups[category].length;
    const displayName = category.charAt(0).toUpperCase() + category.slice(1);

    card.innerHTML = `
      <div class="category-icon">${icon}</div>
      <div class="category-name">${displayName}</div>
      <div class="category-count">${count} ${count === 1 ? 'save' : 'saves'}</div>
    `;

    card.addEventListener('click', () => {
      // Switch to My Saves tab and filter by this category
      switchTab('saves');
      categoryFilter.value = category === 'uncategorized' ? '' : category;
      applyFilters();
    });

    categoriesGrid.appendChild(card);
  });
}

// Render calendar
function renderCalendar() {
  const calendarView = document.getElementById('calendar-view');
  const calendarEmpty = document.getElementById('calendar-empty');

  // Get saves with dates
  const savesWithDates = allSaves.filter(save => save.event_date);

  if (savesWithDates.length === 0) {
    calendarView.style.display = 'none';
    calendarEmpty.style.display = 'block';
    return;
  }

  calendarView.style.display = 'block';
  calendarEmpty.style.display = 'none';

  // Create calendar header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const prevLastDay = new Date(currentYear, currentMonth, 0);
  const firstDayIndex = firstDay.getDay();
  const lastDateOfMonth = lastDay.getDate();
  const prevLastDate = prevLastDay.getDate();

  // Group saves by date
  const savesByDate = {};
  savesWithDates.forEach(save => {
    const dateKey = save.event_date.split('T')[0]; // Get YYYY-MM-DD
    if (!savesByDate[dateKey]) {
      savesByDate[dateKey] = [];
    }
    savesByDate[dateKey].push(save);
  });

  let calendarHTML = `
    <div class="calendar-header">
      <button onclick="changeMonth(-1)" style="background: #f5f5f5; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">‹ Prev</button>
      <h2 style="margin: 0; font-size: 20px;">${monthNames[currentMonth]} ${currentYear}</h2>
      <button onclick="changeMonth(1)" style="background: #f5f5f5; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">Next ›</button>
    </div>

    <div class="calendar-grid">
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Sun</div>
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Mon</div>
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Tue</div>
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Wed</div>
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Thu</div>
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Fri</div>
      <div style="text-align: center; font-weight: 700; padding: 8px; color: #666;">Sat</div>
  `;

  // Add previous month's trailing days
  for (let i = firstDayIndex; i > 0; i--) {
    calendarHTML += `
      <div class="calendar-day" style="opacity: 0.3;">
        <div style="font-weight: 600;">${prevLastDate - i + 1}</div>
      </div>
    `;
  }

  // Add current month's days
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  for (let day = 1; day <= lastDateOfMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const hasSaves = savesByDate[dateStr];

    calendarHTML += `
      <div class="calendar-day ${isToday ? 'today' : ''}" ${hasSaves ? `onclick="showSavesForDate('${dateStr}')"` : ''}>
        <div style="font-weight: 600;">${day}</div>
        ${hasSaves ? `<div class="calendar-day-dot"></div>` : ''}
        ${hasSaves ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${hasSaves.length} save${hasSaves.length > 1 ? 's' : ''}</div>` : ''}
      </div>
    `;
  }

  // Add next month's leading days
  const remainingDays = 7 - ((firstDayIndex + lastDateOfMonth) % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      calendarHTML += `
        <div class="calendar-day" style="opacity: 0.3;">
          <div style="font-weight: 600;">${i}</div>
        </div>
      `;
    }
  }

  calendarHTML += '</div>';
  calendarView.innerHTML = calendarHTML;
}

// Change calendar month
function changeMonth(direction) {
  currentMonth += direction;

  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }

  renderCalendar();
}

// Show saves for a specific date
function showSavesForDate(dateStr) {
  const savesForDate = allSaves.filter(save =>
    save.event_date && save.event_date.startsWith(dateStr)
  );

  if (savesForDate.length === 0) return;

  // Format date nicely
  const date = new Date(dateStr + 'T00:00:00');
  const dateFormatted = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let message = `Saves for ${dateFormatted}:\n\n`;
  savesForDate.forEach((save, index) => {
    message += `${index + 1}. ${save.event_name || save.venue_name || 'Untitled'}\n`;
    if (save.address) message += `   📍 ${save.address}\n`;
    if (save.start_time) message += `   🕐 ${save.start_time}\n`;
    message += '\n';
  });

  alert(message);
}

// Open add modal
function openAddModal() {
  addForm.reset();
  addModal.classList.add('active');
}

// Close add modal
function closeAddModal() {
  addModal.classList.remove('active');
}

// Handle add save
async function handleAddSave(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const session = getSession();
    if (!session) throw new Error('No session found');

    // Get form data
    const url = document.getElementById('add-url').value.trim();
    const name = document.getElementById('add-name').value.trim();
    const location = document.getElementById('add-location').value.trim();
    const date = document.getElementById('add-date').value;
    const time = document.getElementById('add-time').value;
    const category = document.getElementById('add-category').value;

    // Auto-detect platform from URL
    let platform = 'instagram';
    if (url.includes('tiktok.com')) {
      platform = 'tiktok';
    }

    // Call backend POST /v1/user/saves
    const response = await fetch(`${API_BASE}/v1/user/saves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        platform: platform,
        url: url,
        content: name,
        images: [],
        author: 'unknown',
        category: category || null
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Save failed');
    }

    // Update the item with user-provided data
    if (name || location || date || time || category) {
      const updateData = {};
      if (name) {
        updateData.event_name = name;
        updateData.venue_name = name;
      }
      if (location) updateData.address = location;
      if (date) updateData.event_date = date;
      if (time) updateData.start_time = time;
      if (category) updateData.category = category;

      await fetch(`${API_BASE}/v1/user/saves/${data.item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      });
    }

    // Refresh saves
    await fetchSaves();
    renderSaves();

    // Close modal
    closeAddModal();

    alert('Save added successfully!');

  } catch (error) {
    console.error('Add save error:', error);
    alert('Failed to add save. Please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// Edit save
function editSave(itemId) {
  const save = allSaves.find(s => s.id === itemId);
  if (!save) return;

  // Fill edit form
  document.getElementById('edit-item-id').value = save.id;
  document.getElementById('edit-event-name').value = save.event_name || '';
  document.getElementById('edit-venue-name').value = save.venue_name || '';
  document.getElementById('edit-address').value = save.address || '';
  document.getElementById('edit-date').value = save.event_date || '';
  document.getElementById('edit-time').value = save.start_time || '';
  document.getElementById('edit-category').value = save.category || '';
  document.getElementById('edit-tags').value = save.tags ? save.tags.join(', ') : '';

  // Open modal
  editModal.classList.add('active');
}

// Close edit modal
function closeEditModal() {
  editModal.classList.remove('active');
}

// Handle edit save
async function handleEditSave(e) {
  e.preventDefault();

  const updateBtn = document.getElementById('update-btn');
  updateBtn.disabled = true;
  updateBtn.textContent = 'Updating...';

  try {
    const session = getSession();
    if (!session) throw new Error('No session found');

    const itemId = document.getElementById('edit-item-id').value;
    const eventName = document.getElementById('edit-event-name').value.trim();
    const venueName = document.getElementById('edit-venue-name').value.trim();
    const address = document.getElementById('edit-address').value.trim();
    const date = document.getElementById('edit-date').value;
    const time = document.getElementById('edit-time').value;
    const category = document.getElementById('edit-category').value;
    const tagsStr = document.getElementById('edit-tags').value.trim();

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

    // Call backend PATCH /v1/user/saves/{id}
    const response = await fetch(`${API_BASE}/v1/user/saves/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        event_name: eventName || null,
        venue_name: venueName || null,
        address: address || null,
        event_date: date || null,
        start_time: time || null,
        category: category || null,
        tags: tags.length > 0 ? tags : null
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update');
    }

    // Refresh saves
    await fetchSaves();
    renderSaves();

    // Reset map
    if (mapInitialized) {
      mapInitialized = false;
      mapDiv.innerHTML = '';
    }

    // Close modal
    closeEditModal();

    alert('Save updated successfully!');

  } catch (error) {
    console.error('Update save error:', error);
    alert('Failed to update save. Please try again.');
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = 'Update';
  }
}

// Delete save
async function deleteSave(itemId) {
  if (!confirm('Are you sure you want to delete this save?')) {
    return;
  }

  try {
    const session = getSession();
    if (!session) throw new Error('No session found');

    // Call backend DELETE /v1/user/saves/{id}
    const response = await fetch(`${API_BASE}/v1/user/saves/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete');
    }

    // Refresh saves
    await fetchSaves();
    renderSaves();

    // Reset map
    if (mapInitialized) {
      mapInitialized = false;
      mapDiv.innerHTML = '';
    }

    alert('Save deleted successfully!');

  } catch (error) {
    console.error('Delete save error:', error);
    alert('Failed to delete save. Please try again.');
  }
}

// Make functions globally accessible
window.editSave = editSave;
window.deleteSave = deleteSave;
window.closeAddModal = closeAddModal;
window.closeEditModal = closeEditModal;
window.changeMonth = changeMonth;
window.showSavesForDate = showSavesForDate;

// Initialize on page load
init();
