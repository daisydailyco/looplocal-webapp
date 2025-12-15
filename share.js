// Configuration
const BACKEND_URL = 'https://web-production-5630.up.railway.app';
const RADAR_API_KEY = 'prj_live_pk_8c9d4c6a85d8b9e0aacb1b2f6f7ec0ead4cb799a';

// Get share ID from URL
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('id') || window.location.pathname.split('/').pop();

// Initialize
let radarMap = null;
let markers = [];
let isEditMode = false;
let currentItems = [];

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

    // Store items for reordering
    currentItems = data.items;

    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    // Render the page
    renderCategoryHeader(data);
    renderLocationCards(data.items);
    initializeRadarMap(data.items);
    initializeEditButtons();

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

    // Click to focus on map marker and show popup
    card.addEventListener('click', () => {
      if (markers[index]) {
        const markerPos = markers[index].getLngLat();
        radarMap.setCenter(markerPos);
        radarMap.setZoom(15);
        // Open the popup
        markers[index].togglePopup();
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
  // Filter items with valid coordinates first
  const itemsWithCoords = items.filter(item => item.latitude && item.longitude);

  if (itemsWithCoords.length === 0) {
    console.log('No items with coordinates to display');
    return;
  }

  // Calculate initial center from coordinates
  const avgLat = itemsWithCoords.reduce((sum, item) => sum + item.latitude, 0) / itemsWithCoords.length;
  const avgLng = itemsWithCoords.reduce((sum, item) => sum + item.longitude, 0) / itemsWithCoords.length;

  // Create native MapLibre map with Radar tiles
  radarMap = new maplibregl.Map({
    container: 'radar-map',
    style: `https://api.radar.io/maps/styles/radar-default-v1?publishableKey=${RADAR_API_KEY}`,
    center: [avgLng, avgLat],
    zoom: 13,
  });

  // Add navigation controls (zoom buttons)
  radarMap.addControl(new maplibregl.NavigationControl(), 'top-right');

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

        // Create native MapLibre marker using global maplibregl
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

          // Use native MapLibre GL JS marker (loaded globally)
          const marker = new maplibregl.Marker(el)
            .setLngLat([item.longitude, item.latitude])
            .addTo(radarMap);

          // Create native MapLibre popup
          const popup = new maplibregl.Popup({
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

    // Auto-zoom to fit all markers
    if (markers.length > 0) {
      console.log(`🗺️ Adjusting map to show ${markers.length} markers...`);

      // Calculate zoom level based on marker spread
      const coordinates = items
        .filter(item => item.latitude && item.longitude)
        .map(item => [item.longitude, item.latitude]);

      if (coordinates.length > 1) {
        // Calculate bounds to determine zoom
        const lngs = coordinates.map(c => c[0]);
        const lats = coordinates.map(c => c[1]);
        const lngSpan = Math.max(...lngs) - Math.min(...lngs);
        const latSpan = Math.max(...lats) - Math.min(...lats);
        const maxSpan = Math.max(lngSpan, latSpan);

        // Adjust zoom based on span (rough approximation)
        let zoom = 13;
        if (maxSpan < 0.01) zoom = 15;
        else if (maxSpan < 0.05) zoom = 13;
        else if (maxSpan < 0.1) zoom = 12;
        else zoom = 11;

        radarMap.setZoom(zoom);
        console.log(`✅ Map zoom set to ${zoom} for span ${maxSpan.toFixed(4)}`);
      }
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

// Edit Order functionality
function initializeEditButtons() {
  const editBtn = document.getElementById('edit-order-btn');
  const saveBtn = document.getElementById('save-order-btn');
  const cancelBtn = document.getElementById('cancel-order-btn');

  editBtn.addEventListener('click', () => {
    enterEditMode();
  });

  saveBtn.addEventListener('click', async () => {
    await saveNewOrder();
  });

  cancelBtn.addEventListener('click', () => {
    exitEditMode();
    renderLocationCards(currentItems); // Re-render original order
  });
}

function enterEditMode() {
  isEditMode = true;
  document.getElementById('edit-order-btn').style.display = 'none';
  document.getElementById('edit-mode-controls').style.display = 'block';

  // Make location cards draggable
  const cards = document.querySelectorAll('.location-card');
  cards.forEach((card, index) => {
    card.draggable = true;
    card.style.cursor = 'move';
    card.dataset.index = index;

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
  });
}

function exitEditMode() {
  isEditMode = false;
  document.getElementById('edit-order-btn').style.display = 'inline-block';
  document.getElementById('edit-mode-controls').style.display = 'none';

  // Remove draggable from cards
  const cards = document.querySelectorAll('.location-card');
  cards.forEach(card => {
    card.draggable = false;
    card.style.cursor = 'pointer';
    card.removeEventListener('dragstart', handleDragStart);
    card.removeEventListener('dragover', handleDragOver);
    card.removeEventListener('drop', handleDrop);
    card.removeEventListener('dragend', handleDragEnd);
  });
}

let draggedCard = null;

function handleDragStart(e) {
  draggedCard = this;
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedCard !== this) {
    const container = document.getElementById('location-list');
    const allCards = Array.from(container.querySelectorAll('.location-card'));
    const draggedIndex = allCards.indexOf(draggedCard);
    const targetIndex = allCards.indexOf(this);

    // Reorder in DOM
    if (draggedIndex < targetIndex) {
      this.parentNode.insertBefore(draggedCard, this.nextSibling);
    } else {
      this.parentNode.insertBefore(draggedCard, this);
    }

    // Reorder items array (only items with coordinates)
    const itemsWithCoords = currentItems.filter(item => item.latitude && item.longitude);
    const [movedItem] = itemsWithCoords.splice(draggedIndex, 1);
    itemsWithCoords.splice(targetIndex, 0, movedItem);

    // Update currentItems with new order (merge back with items without coords)
    const itemsWithoutCoords = currentItems.filter(item => !item.latitude || !item.longitude);
    currentItems = [...itemsWithCoords, ...itemsWithoutCoords];

    // Update numbers on all cards
    const updatedCards = Array.from(container.querySelectorAll('.location-card'));
    updatedCards.forEach((card, index) => {
      const numberElement = card.querySelector('.location-number');
      if (numberElement) {
        numberElement.textContent = index + 1;
      }
    });
  }

  return false;
}

function handleDragEnd(e) {
  this.style.opacity = '1';
}

async function saveNewOrder() {
  try {
    // Send new order to backend
    const response = await fetch(`${BACKEND_URL}/api/share/${shareId}/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: currentItems })
    });

    if (!response.ok) {
      throw new Error('Failed to save order');
    }

    exitEditMode();
    // Re-render cards with new order and updated numbers
    renderLocationCards(currentItems);
    // Re-initialize edit buttons on the new cards
    initializeEditButtons();
    alert('Order saved successfully!');
  } catch (error) {
    console.error('Error saving order:', error);
    alert('Failed to save order. Please try again.');
  }
}

// Load when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSharedList);
} else {
  loadSharedList();
}
