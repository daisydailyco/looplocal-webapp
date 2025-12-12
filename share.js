// Configuration
const BACKEND_URL = 'https://web-production-5630.up.railway.app';
const RADAR_API_KEY = 'prj_live_pk_8c9d4c6a85d8b9e0aacb1b2f6f7ec0ead4cb799a';

// Get share ID from URL
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('id') || window.location.pathname.split('/').pop();

// Initialize
let radarMap = null;
let markers = [];

async function loadSharedList() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/share/${shareId}`);

    if (!response.ok) {
      throw new Error('List not found');
    }

    const data = await response.json();

    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    // Render the page
    renderCategoryHeader(data);
    renderLocationCards(data.items);
    initializeRadarMap(data.items);

  } catch (error) {
    console.error('Error loading shared list:', error);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
  }
}

function renderCategoryHeader(data) {
  document.getElementById('category-name').textContent = data.category;
  document.getElementById('item-count').textContent = `${data.items.length} place${data.items.length !== 1 ? 's' : ''}`;
  document.getElementById('view-count').textContent = `${data.views} view${data.views !== 1 ? 's' : ''}`;
  document.title = `${data.category} - LoopLocal`;
}

function renderLocationCards(items) {
  const container = document.getElementById('location-list');
  container.innerHTML = '';

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'location-card';

    const venue = item.venue_name || item.address || item.event_name || 'Saved Location';
    const platform = item.platform || '';
    const author = item.author || '';
    const eventDate = formatEventDate(item.event_date);

    card.innerHTML = `
      <div class="location-number">${index + 1}</div>
      <h3>${venue}</h3>
      ${platform || author ? `
        <div class="location-details">
          ${platform ? platform : ''}
          ${platform && author ? ' • ' : ''}
          ${author ? (author.startsWith('@') ? author : '@' + author) : ''}
        </div>
      ` : ''}
      ${eventDate ? `<div class="location-date">${eventDate}</div>` : ''}
    `;

    // Click to focus on map marker
    card.addEventListener('click', () => {
      if (markers[index]) {
        radarMap.setCenter(markers[index].getPosition());
        radarMap.setZoom(15);
      }
    });

    container.appendChild(card);
  });
}

function initializeRadarMap(items) {
  // Initialize Radar
  Radar.initialize(RADAR_API_KEY);

  // Create map with custom style
  radarMap = Radar.ui.map({
    container: 'radar-map',
    style: '6ca227b6-fe94-4211-ba2a-1ef204aaf55a',
    center: [items[0]?.longitude || -82.6403, items[0]?.latitude || 27.7676],
    zoom: 12,
  });

  // Add markers for each location
  items.forEach((item, index) => {
    // For now, use placeholder coordinates (St. Pete area)
    // In production, you'd geocode the addresses
    const lat = 27.7676 + (Math.random() - 0.5) * 0.1;
    const lng = -82.6403 + (Math.random() - 0.5) * 0.1;

    const marker = Radar.ui.marker({
      text: (index + 1).toString(),
      color: '#42A746'
    })
      .setLngLat([lng, lat])
      .addTo(radarMap);

    markers.push(marker);
  });
}

function formatEventDate(dateString) {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch (e) {
    return null;
  }
}

// Load when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSharedList);
} else {
  loadSharedList();
}
