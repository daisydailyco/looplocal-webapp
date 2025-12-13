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

    // Debug: Log what data we received
    console.log('📥 Received data from backend:', data);
    console.log('📍 Items received:', data.items?.length || 0);
    if (data.items) {
      data.items.forEach((item, i) => {
        console.log(`Item ${i + 1}:`, {
          name: item.venue_name || item.event_name,
          address: item.address,
          lat: item.latitude,
          lng: item.longitude,
          hasCoords: !!(item.latitude && item.longitude)
        });
      });
    }

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
  // Count items with coordinates
  const itemsWithCoords = data.items.filter(item => item.latitude && item.longitude).length;
  const totalItems = data.items.length;

  document.getElementById('category-name').textContent = data.category;

  // Show count with location info if some items are missing coordinates
  if (itemsWithCoords < totalItems) {
    document.getElementById('item-count').textContent = `${itemsWithCoords} of ${totalItems} place${totalItems !== 1 ? 's' : ''} on map`;
  } else {
    document.getElementById('item-count').textContent = `${totalItems} place${totalItems !== 1 ? 's' : ''}`;
  }

  document.getElementById('view-count').textContent = `${data.views} view${data.views !== 1 ? 's' : ''}`;
  document.title = `${data.category} - LoopLocal`;
}

function renderLocationCards(items) {
  const container = document.getElementById('location-list');
  container.innerHTML = '';

  // Separate items with and without coordinates
  const itemsWithCoords = [];
  const itemsWithoutCoords = [];

  items.forEach(item => {
    if (item.latitude && item.longitude) {
      itemsWithCoords.push(item);
    } else {
      itemsWithoutCoords.push(item);
    }
  });

  // Render items with coordinates
  itemsWithCoords.forEach((item, index) => {
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
        const markerPos = markers[index].getLngLat();
        radarMap.setCenter(markerPos);
        radarMap.setZoom(15);
      }
    });

    container.appendChild(card);
  });

  // Render items without coordinates in a separate section
  if (itemsWithoutCoords.length > 0) {
    const divider = document.createElement('div');
    divider.style.cssText = 'margin: 24px 0 16px; padding-top: 16px; border-top: 2px dashed rgba(0,0,0,0.1);';
    divider.innerHTML = `
      <div style="text-align: center; color: #000000; opacity: 0.7; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
        📍 Items Without Locations (${itemsWithoutCoords.length})
      </div>
      <div style="text-align: center; color: #000000; opacity: 0.6; font-size: 11px; margin-bottom: 16px;">
        Add locations in the extension to show these on the map
      </div>
    `;
    container.appendChild(divider);

    itemsWithoutCoords.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'location-card';
      card.style.opacity = '0.6';
      card.style.cursor = 'default';

      const venue = item.venue_name || item.address || item.event_name || 'Saved Location';
      const platform = item.platform || '';
      const author = item.author || '';
      const eventDate = formatEventDate(item.event_date);

      card.innerHTML = `
        <div style="display: inline-block; background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.2); color: #000000; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-bottom: 12px;">?</div>
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

      container.appendChild(card);
    });
  }
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

        console.log(`✅ Marker ${markers.length + 1} added to map:`, marker);
        markers.push(marker);
      } else {
        console.log(`Skipping item ${index + 1} - no coordinates`);
      }
    });

    // Auto-fit map to show all markers
    if (markers.length > 0) {
      console.log(`🗺️ Fitting map to ${markers.length} markers...`);

      // Force map to resize and recalculate
      radarMap.resize();

      // Small delay to ensure map is fully rendered before fitting
      setTimeout(() => {
        radarMap.fitToMarkers({
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
        console.log('✅ Map fitted successfully');
      }, 100);
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
