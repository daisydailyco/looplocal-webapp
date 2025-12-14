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

  // Filter items with valid coordinates first
  const itemsWithCoords = items.filter(item => item.latitude && item.longitude);

  if (itemsWithCoords.length === 0) {
    console.log('No items with coordinates to display');
    return;
  }

  // Calculate initial center from coordinates
  const avgLat = itemsWithCoords.reduce((sum, item) => sum + item.latitude, 0) / itemsWithCoords.length;
  const avgLng = itemsWithCoords.reduce((sum, item) => sum + item.longitude, 0) / itemsWithCoords.length;

  // Create map centered on data
  radarMap = Radar.ui.map({
    container: 'radar-map',
    style: 'radar-default-v1',
    center: [avgLng, avgLat],
    zoom: 13,
  });

  console.log('🗺️ Map initialized, waiting for load event...');

  // Close all popups when clicking the map
  radarMap.on('click', (e) => {
    // Close all open popups
    markers.forEach(marker => {
      const popup = marker.getPopup();
      if (popup && popup.isOpen()) {
        popup.remove();
      }
    });
  });

  // Wait for map to be fully loaded and rendered
  radarMap.on('load', () => {
    console.log('🗺️ Map loaded, adding markers...');

    // Add markers for each location
    items.forEach((item, index) => {
      // Only add marker if we have valid coordinates
      if (item.latitude && item.longitude) {
        console.log(`Adding marker ${index + 1} at:`, item.latitude, item.longitude);

        const venue = item.venue_name || item.address || item.event_name || 'Saved Location';
        const author = item.author ? (item.author.startsWith('@') ? item.author : '@' + item.author) : '';
        const eventDate = formatEventDate(item.event_date);
        const imageUrl = item.images && item.images[0] ? item.images[0] : '';

        // Create very compact popup HTML (no image to keep it small)
        let popupHTML = `
          <div style="padding: 6px; min-width: 140px; max-width: 160px;">
            <div style="background: rgba(66, 167, 70, 0.1); border: 1px solid rgba(66, 167, 70, 0.3); color: #42A746; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 600; display: inline-block; margin-bottom: 4px;">
              #${index + 1}
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #000000; margin: 4px 0; line-height: 1.2;">${venue}</div>
        `;

        if (author) {
          popupHTML += `<div style="font-size: 10px; color: #666; margin: 2px 0;">${author}</div>`;
        }

        if (eventDate) {
          popupHTML += `<div style="font-size: 10px; color: #666; margin: 2px 0 4px 0;">${eventDate}</div>`;
        }

        if (item.url) {
          popupHTML += `<a href="${item.url}" target="_blank" style="display: block; text-align: center; margin-top: 6px; padding: 5px 10px; background: #42A746; color: white; text-decoration: none; border-radius: 5px; font-size: 10px; font-weight: 600;">View Post</a>`;
        }

        popupHTML += '</div>';

        // Create native MapLibre marker using Radar's internal map
        try {
          // Create custom marker element
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.innerHTML = `
            <svg width="27" height="41" viewBox="0 0 27 41">
              <g fill="#42A746">
                <path d="M27,13.5 C27,19.074644 20.250001,27.000002 14.75,34.500002 C14.016665,35.500004 12.983335,35.500004 12.25,34.500002 C6.7499993,27.000002 0,19.222562 0,13.5 C0,6.0441559 6.0441559,0 13.5,0 C20.955844,0 27,6.0441559 27,13.5 Z"></path>
              </g>
              <circle fill="#FFFFFF" cx="13.5" cy="13.5" r="5.5"></circle>
            </svg>
          `;
          el.style.cursor = 'pointer';
          el.style.width = '27px';
          el.style.height = '41px';

          // Use native MapLibre marker constructor
          const marker = new radarMap.constructor.Marker(el)
            .setLngLat([item.longitude, item.latitude])
            .addTo(radarMap);

          // Create native MapLibre popup
          const popup = new radarMap.constructor.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '180px',
            offset: 15
          }).setHTML(popupHTML);

          marker.setPopup(popup);

          console.log(`✅ Native marker ${markers.length + 1} added at [${item.longitude}, ${item.latitude}]`);
          markers.push(marker);
        } catch (error) {
          console.error(`❌ Error creating marker ${index + 1}:`, error);
        }
      } else {
        console.log(`Skipping item ${index + 1} - no coordinates`);
      }
    });

    // Auto-fit map to show all markers
    if (markers.length > 0) {
      console.log(`🗺️ Fitting map to ${markers.length} markers...`);

      // Calculate bounds manually from items with coordinates
      const coordinates = items
        .filter(item => item.latitude && item.longitude)
        .map(item => [item.longitude, item.latitude]);

      console.log('📍 Coordinates for bounds:', coordinates);

      // Wait for markers to be fully rendered before fitting
      setTimeout(() => {
        try {
          if (coordinates.length === 1) {
            // Single marker - center on it
            radarMap.setCenter(coordinates[0]);
            radarMap.setZoom(14);
            console.log('✅ Map centered on single marker');
          } else if (coordinates.length > 1) {
            // Multiple markers - fit bounds using MapLibre's LngLatBounds from the map constructor
            const LngLatBounds = radarMap.constructor.LngLatBounds;
            const bounds = coordinates.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new LngLatBounds(coordinates[0], coordinates[0]));

            radarMap.fitBounds(bounds, {
              padding: { top: 60, bottom: 60, left: 60, right: 60 },
              maxZoom: 14,
              duration: 1000 // Smooth animation
            });
            console.log('✅ Map bounds fitted to all markers');
          }
        } catch (error) {
          console.error('Error fitting bounds:', error);
        }
      }, 300);
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
