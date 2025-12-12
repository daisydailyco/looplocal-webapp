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

  // Create map - simplified to match working example
  radarMap = Radar.ui.map({
    container: 'radar-map',
    style: 'radar-default-v1',
    center: [-82.6403, 27.7676], // St. Pete default
    zoom: 12,
  });

  // Wait for map to load before adding markers
  radarMap.on('load', () => {
    // Add markers for each location
    items.forEach((item, index) => {
      // Only add marker if we have valid coordinates
      if (item.latitude && item.longitude) {
        console.log(`Adding marker ${index + 1} at:`, item.latitude, item.longitude);

        const venue = item.venue_name || item.address || item.event_name || 'Saved Location';
        const author = item.author ? (item.author.startsWith('@') ? item.author : '@' + item.author) : '';
        const eventDate = formatEventDate(item.event_date);
        const imageUrl = item.images && item.images[0] ? item.images[0] : '';

        // Create popup HTML
        let popupHTML = `
          <div style="text-align: center; padding: 8px; min-width: 200px;">
            <div style="background: rgba(66, 167, 70, 0.1); border: 1px solid rgba(66, 167, 70, 0.3); color: #42A746; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; margin-bottom: 8px;">
              ${index + 1}
            </div>
            <h3 style="margin: 8px 0; font-size: 16px; font-weight: 600; color: #000000;">${venue}</h3>
        `;

        if (imageUrl) {
          popupHTML += `<img src="${imageUrl}" style="width: 100%; max-width: 200px; border-radius: 8px; margin: 8px 0;" />`;
        }

        if (author) {
          popupHTML += `<div style="font-size: 13px; color: #666; margin: 4px 0;">${author}</div>`;
        }

        if (eventDate) {
          popupHTML += `<div style="font-size: 13px; color: #666; margin: 4px 0;">${eventDate}</div>`;
        }

        if (item.url) {
          popupHTML += `<a href="${item.url}" target="_blank" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #42A746; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">View Post</a>`;
        }

        popupHTML += '</div>';

        // Create marker using simple pattern that works
        const marker = Radar.ui.marker({
          color: '#42A746',
          popup: {
            html: popupHTML
          }
        })
          .setLngLat([item.longitude, item.latitude])
          .addTo(radarMap);

        markers.push(marker);
      } else {
        console.log(`Skipping item ${index + 1} - no coordinates`);
      }
    });

    // Auto-fit map to show all markers
    if (markers.length > 0) {
      radarMap.fitToMarkers({
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15
      });
    } else {
      console.log('No markers to display - items may not have coordinates');
    }
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
