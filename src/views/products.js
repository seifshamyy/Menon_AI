// ==============================
// Products View — Card Layout + Category Grouping
// ==============================
import { supabase } from '../supabase.js';
import {
  toast, openModal, closeModal, icons,
  parseJsonSafe, normalizePhotos, jsonToDetailHtml, flattenJson, escHtml
} from '../utils.js';

const TABLE = 'productsmenon_duplicate';

const AVAILABILITY_OPTIONS = [
  'Available in stock',
  'Available in showroom Nasr City',
  'Available in showroom Maadi',
  'Available in showroom Faisal',
  'Available in showroom 6th October City',
  'Out of stock',
];

let allProducts = [];
let searchTerm = '';
let activeCategory = null; // null = "All"

// ─── Fetch ──────────────────────────────────────────
async function fetchProducts() {
  const { data, error } = await supabase.from(TABLE).select('*').order('product_id');
  if (error) { toast('Failed to load products: ' + error.message, 'error'); return []; }
  return data || [];
}

// ─── Render ─────────────────────────────────────────
export async function renderProducts(container) {
  container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  allProducts = await fetchProducts();
  searchTerm = '';
  activeCategory = null;
  renderView(container);
}

function getFiltered() {
  let list = allProducts;
  if (searchTerm) {
    list = list.filter(p =>
      p.product_name.toLowerCase().includes(searchTerm) ||
      p.product_id.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm)
    );
  }
  if (activeCategory) {
    list = list.filter(p => p.category === activeCategory);
  }
  return list;
}

function getCategories() {
  const map = {};
  allProducts.forEach(p => {
    map[p.category] = (map[p.category] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

function renderView(container) {
  const categories = getCategories();

  container.innerHTML = `
    <div class="view-header">
      <h2>Products</h2>
      <div class="header-actions">
        <div class="search-wrapper">
          ${icons.search}
          <input type="text" class="search-input" id="product-search" placeholder="Search products…" value="${escHtml(searchTerm)}" />
        </div>
        <button class="btn btn-primary" id="add-product-btn">${icons.plus} New product</button>
      </div>
    </div>

    <!-- Filter chips -->
    <div class="filter-bar" id="filter-bar">
      <button class="filter-chip ${activeCategory === null ? 'active' : ''}" data-cat="">
        All <span class="chip-count">${allProducts.length}</span>
      </button>
      ${categories.map(([cat, count]) => `
        <button class="filter-chip ${activeCategory === cat ? 'active' : ''}" data-cat="${escHtml(cat)}">
          ${escHtml(cat)} <span class="chip-count">${count}</span>
        </button>
      `).join('')}
    </div>

    <!-- Cards section — only this re-renders on search -->
    <div id="cards-container"></div>
  `;

  updateCards(container);
  bindEvents(container);
}

/** Re-renders only the cards grid — preserves search input focus */
function updateCards(container) {
  const filtered = getFiltered();
  const grouped = {};
  filtered.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  const sortedGroups = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

  const cardsEl = container.querySelector('#cards-container');
  if (!cardsEl) return;

  cardsEl.innerHTML = sortedGroups.length === 0 ? renderEmpty() :
    sortedGroups.map(([cat, items]) => `
      <div class="category-section">
        <div class="category-section-header">
          <span class="category-section-title">${escHtml(cat)}</span>
          <span class="category-section-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="cards-grid">
          ${items.map((p, i) => renderCard(p, i)).join('')}
        </div>
      </div>
    `).join('');

  // Re-bind card events on new DOM
  bindCardEvents(container);
}

function bindCardEvents(container) {
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-footer')) return;
      const id = card.dataset.viewId;
      const product = allProducts.find(p => p.product_id === id);
      if (product) openProductDetail(product);
    });
  });

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const product = allProducts.find(p => p.product_id === id);
      if (!product) return;
      if (action === 'view') openProductDetail(product);
      else if (action === 'edit') openProductForm(product, container);
      else if (action === 'delete') confirmDelete(product, container);
    });
  });
}

function renderCard(p, index = 0) {
  const photos = normalizePhotos(p.photos);
  const pricing = parseJsonSafe(p.pricing);
  const priceLabel = pricing ? priceSummary(pricing) : null;
  const delay = index * 0.04; // stagger

  return `
    <div class="product-card" data-view-id="${escHtml(p.product_id)}" style="animation-delay:${delay}s">
      <div class="card-body">
        <div class="card-product-id">${escHtml(p.product_id)}</div>
        <div class="card-product-name">${escHtml(p.product_name)}</div>
        <div class="card-meta">
          <span class="card-chip category">${escHtml(p.category)}</span>
          ${priceLabel ? `<span class="card-chip price">${escHtml(priceLabel)}</span>` : ''}
        </div>
        ${p.availability ? `<div class="card-availability">${renderAvailPills(p.availability)}</div>` : ''}
      </div>
      <div class="card-footer">
        <button title="View" data-action="view" data-id="${escHtml(p.product_id)}">${icons.eye}</button>
        <button title="Edit" data-action="edit" data-id="${escHtml(p.product_id)}">${icons.edit}</button>
        <button title="Delete" class="delete-btn" data-action="delete" data-id="${escHtml(p.product_id)}">${icons.trash}</button>
      </div>
    </div>`;
}

function renderAvailPills(text) {
  if (!text) return '';
  return text.split(' - ').map(item => {
    const lower = item.toLowerCase();
    let cls = 'showroom';
    if (lower.includes('out of stock')) cls = 'out';
    else if (lower.includes('in stock')) cls = 'stock';
    return `<span class="avail-pill ${cls}">${escHtml(item.trim())}</span>`;
  }).join('');
}

function priceSummary(obj) {
  if (!obj || typeof obj !== 'object') return String(obj ?? '');
  const entries = Object.entries(obj);
  if (entries.length === 0) return '';
  const [k, v] = entries[0];
  return typeof v === 'object' ? `${k}: …` : `${k}: ${v}`;
}

function renderEmpty() {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
    <p>No products found</p>
    <p class="sub">Add your first product to get started</p>
  </div>`;
}

// ─── Events ─────────────────────────────────────────
function bindEvents(container) {
  // Search — only re-render cards, preserves input focus
  container.querySelector('#product-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    updateCards(container);
  });

  // Filter chips — update active state + cards only
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      activeCategory = cat || null;
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      updateCards(container);
    });
  });

  // Add button
  container.querySelector('#add-product-btn')?.addEventListener('click', () => {
    openProductForm(null, container);
  });
}

// ─── Detail View ────────────────────────────────────
function openProductDetail(product) {
  const photos = normalizePhotos(product.photos);
  openModal(`
    <div class="modal-header">
      <h3>${escHtml(product.product_name)}</h3>
      <button class="modal-close" id="modal-close-btn">${icons.x}</button>
    </div>
    <div class="modal-body">
      <div class="detail-grid">
        <div class="detail-card">
          <div class="detail-card-label">Product ID</div>
          <div class="detail-card-value"><code>${escHtml(product.product_id)}</code></div>
        </div>
        <div class="detail-card">
          <div class="detail-card-label">Category</div>
          <div class="detail-card-value"><span class="category-badge">${escHtml(product.category)}</span></div>
        </div>
        <div class="detail-card">
          <div class="detail-card-label">Availability</div>
          <div class="detail-card-value">${escHtml(product.availability || '—')}</div>
        </div>
        <div class="detail-card full-width">
          <div class="detail-card-label">Pricing</div>
          <div class="detail-card-value">${jsonToDetailHtml(product.pricing)}</div>
        </div>
        <div class="detail-card full-width">
          <div class="detail-card-label">Product Details</div>
          <div class="detail-card-value">${jsonToDetailHtml(product.product_details)}</div>
        </div>
        <div class="detail-card full-width">
          <div class="detail-card-label">Photos</div>
          <div class="detail-card-value">
            ${photos.length > 0 ? `<div class="photo-thumbs">${photos.map(url => `<img src="${escHtml(url)}" alt="" onerror="this.style.display='none'" />`).join('')}</div>` : '—'}
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modal-close-btn2">Close</button>
    </div>
  `);
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-close-btn2')?.addEventListener('click', closeModal);
}

// ─── Form (Add / Edit) ─────────────────────────────
function openProductForm(product, viewContainer) {
  const isEdit = !!product;

  // Pricing & details → key-value pairs
  const pricing = isEdit ? flattenJson(parseJsonSafe(product.pricing)) : [];
  const details = isEdit ? flattenJson(parseJsonSafe(product.product_details)) : [];

  // Photos as JSON object → key-value pairs
  const photosRaw = isEdit ? parseJsonSafe(product.photos) : null;
  let photoEntries = [];
  if (photosRaw && typeof photosRaw === 'object' && !Array.isArray(photosRaw)) {
    photoEntries = Object.entries(photosRaw);
  } else if (Array.isArray(photosRaw)) {
    // Convert legacy arrays to object-like entries
    photoEntries = photosRaw.map((url, i) => [`photo_${i + 1}`, typeof url === 'string' ? url : (url?.url || url?.src || '')]);
  } else if (typeof photosRaw === 'string') {
    photoEntries = [['photo_1', photosRaw]];
  }

  // Get unique categories for dropdown
  const existingCategories = [...new Set(allProducts.map(p => p.category))].sort();
  const currentCat = isEdit ? product.category : '';

  openModal(`
    <div class="modal-header">
      <h3>${isEdit ? 'Edit' : 'New'} Product</h3>
      <button class="modal-close" id="modal-close-btn">${icons.x}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Product ID</label>
        <input class="form-input" id="f-product-id" value="${isEdit ? escHtml(product.product_id) : ''}" ${isEdit ? 'readonly style="opacity:0.5;cursor:not-allowed"' : ''} placeholder="e.g. PRD-001" />
      </div>
      <div class="form-group">
        <label class="form-label">Product Name</label>
        <input class="form-input" id="f-product-name" value="${isEdit ? escHtml(product.product_name) : ''}" placeholder="Product name" />
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-input" id="f-category-select">
          <option value="" disabled ${!currentCat ? 'selected' : ''}>Select a category</option>
          ${existingCategories.map(c => `<option value="${escHtml(c)}" ${c === currentCat ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}
          <option value="__new__">+ New category</option>
        </select>
        <input class="form-input" id="f-category-new" placeholder="Enter new category name" style="display:none;margin-top:6px" />
      </div>

      <div class="form-group">
        <label class="form-label">Availability</label>
        <div class="multi-select-container" id="availability-container">
          <div class="multi-select-trigger" id="availability-trigger">
            <span id="availability-display">Select availability…</span>
            ${icons.chevRight}
          </div>
          <div class="multi-select-dropdown hidden" id="availability-dropdown">
            ${AVAILABILITY_OPTIONS.map(opt => {
    const checked = isEdit && product.availability && product.availability.includes(opt) ? 'checked' : '';
    return `<label class="multi-select-option"><input type="checkbox" value="${escHtml(opt)}" ${checked} /><span>${escHtml(opt)}</span></label>`;
  }).join('')}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Pricing</label>
        <div class="json-group" id="pricing-group">
          <div class="json-group-title">Key / Value</div>
          <div id="pricing-rows">
            ${pricing.length > 0 ? pricing.map(([k, v]) => jsonRowHtml(k, v)).join('') : jsonRowHtml('', '')}
          </div>
          <button class="add-field-btn" id="add-pricing-row">${icons.plus} Add field</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Product Details</label>
        <div class="json-group" id="details-group">
          <div class="json-group-title">Key / Value</div>
          <div id="details-rows">
            ${details.length > 0 ? details.map(([k, v]) => jsonRowHtml(k, v)).join('') : jsonRowHtml('', '')}
          </div>
          <button class="add-field-btn" id="add-details-row">${icons.plus} Add field</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Photos (JSON Object — key: label, value: URL)</label>
        <div class="json-group" id="photos-group">
          <div class="json-group-title">Key / URL</div>
          <div id="photos-rows">
            ${photoEntries.length > 0 ? photoEntries.map(([k, v]) => jsonRowHtml(k, v)).join('') : jsonRowHtml('', '')}
          </div>
          <button class="add-field-btn" id="add-photo-row">${icons.plus} Add photo</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">${isEdit ? 'Save changes' : 'Create'}</button>
    </div>
  `);

  document.getElementById('add-pricing-row')?.addEventListener('click', () => {
    document.getElementById('pricing-rows').insertAdjacentHTML('beforeend', jsonRowHtml('', ''));
    wireRemoveButtons();
  });
  document.getElementById('add-details-row')?.addEventListener('click', () => {
    document.getElementById('details-rows').insertAdjacentHTML('beforeend', jsonRowHtml('', ''));
    wireRemoveButtons();
  });
  document.getElementById('add-photo-row')?.addEventListener('click', () => {
    document.getElementById('photos-rows').insertAdjacentHTML('beforeend', jsonRowHtml('', ''));
    wireRemoveButtons();
  });

  wireRemoveButtons();

  // Category dropdown logic
  const catSelect = document.getElementById('f-category-select');
  const catNewInput = document.getElementById('f-category-new');
  catSelect?.addEventListener('change', () => {
    if (catSelect.value === '__new__') {
      catNewInput.style.display = 'block';
      catNewInput.focus();
    } else {
      catNewInput.style.display = 'none';
      catNewInput.value = '';
    }
  });

  // Availability multi-select toggle
  const availTrigger = document.getElementById('availability-trigger');
  const availDropdown = document.getElementById('availability-dropdown');
  const availDisplay = document.getElementById('availability-display');

  function updateAvailDisplay() {
    const checked = Array.from(document.querySelectorAll('#availability-dropdown input:checked')).map(cb => cb.value);
    availDisplay.textContent = checked.length > 0 ? checked.join(' - ') : 'Select availability…';
  }
  updateAvailDisplay();

  availTrigger?.addEventListener('click', () => {
    availDropdown.classList.toggle('hidden');
  });
  availDropdown?.addEventListener('change', updateAvailDisplay);

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-save-btn')?.addEventListener('click', () => saveProduct(isEdit, viewContainer));
}

function jsonRowHtml(key, val) {
  return `<div class="json-row">
    <input class="form-input key-input" placeholder="Key" value="${escHtml(String(key))}" />
    <input class="form-input val-input" placeholder="Value" value="${escHtml(String(val ?? ''))}" />
    <button class="remove-field-btn">${icons.minus}</button>
  </div>`;
}

function wireRemoveButtons() {
  document.querySelectorAll('.remove-field-btn').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.json-row');
      if (row) row.remove();
    };
  });
}

// ─── Save ───────────────────────────────────────────
async function saveProduct(isEdit, viewContainer) {
  const productId = document.getElementById('f-product-id')?.value.trim();
  const productName = document.getElementById('f-product-name')?.value.trim();

  // Read category from dropdown or new-category input
  const catSelect = document.getElementById('f-category-select');
  const catNew = document.getElementById('f-category-new')?.value.trim();
  const category = catSelect?.value === '__new__' ? catNew : catSelect?.value?.trim();

  if (!productId || !productName || !category) {
    toast('Please fill in ID, Name, and Category', 'error');
    return;
  }

  const collectJson = (containerId) => {
    const obj = {};
    document.querySelectorAll(`#${containerId} .json-row`).forEach(row => {
      const k = row.querySelector('.key-input')?.value.trim();
      const v = row.querySelector('.val-input')?.value.trim();
      if (k) obj[k] = isNaN(v) || v === '' ? v : Number(v);
    });
    return Object.keys(obj).length > 0 ? obj : null;
  };

  const pricing = collectJson('pricing-rows');
  const product_details = collectJson('details-rows');
  const photos = collectJson('photos-rows'); // JSON object, not array

  // Collect availability
  const availChecks = document.querySelectorAll('#availability-dropdown input[type="checkbox"]:checked');
  const availability = Array.from(availChecks).map(cb => cb.value).join(' - ') || null;

  const payload = { product_id: productId, product_name: productName, category, pricing, product_details, photos, availability };

  let error;
  if (isEdit) {
    ({ error } = await supabase.from(TABLE).update(payload).eq('product_id', productId));
  } else {
    ({ error } = await supabase.from(TABLE).insert(payload));
  }

  if (error) { toast('Save failed: ' + error.message, 'error'); return; }
  toast(isEdit ? 'Product updated' : 'Product created', 'success');

  // Send webhook on NEW product creation
  if (!isEdit) {
    const webhookPayload = [{
      product_id: productId,
      product_name: productName,
      category,
      pricing: pricing ? JSON.stringify(pricing) : null,
      photos: photos ? JSON.stringify(photos) : null,
      product_details: product_details ? JSON.stringify(product_details) : null,
      availability,
    }];
    try {
      await fetch('https://primary-production-9e01d.up.railway.app/webhook/77983cde-93b5-4a59-9e9d-98af5105983d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      toast('Webhook sent', 'info');
    } catch (e) {
      console.error('Webhook error:', e);
      toast('Webhook failed: ' + e.message, 'error');
    }
  }

  closeModal();
  renderProducts(viewContainer);
}

// ─── Delete ─────────────────────────────────────────
function confirmDelete(product, viewContainer) {
  openModal(`
    <div class="modal-header">
      <h3>Delete product</h3>
      <button class="modal-close" id="modal-close-btn">${icons.x}</button>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to delete <strong>${escHtml(product.product_name)}</strong>?</p>
      <p style="color:var(--on-surface-muted);font-size:0.85rem;margin-top:6px">This action cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm-del">Delete</button>
    </div>
  `);
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-del')?.addEventListener('click', async () => {
    const { error } = await supabase.from(TABLE).delete().eq('product_id', product.product_id);
    if (error) { toast('Delete failed: ' + error.message, 'error'); return; }
    toast('Product deleted', 'success');
    closeModal();
    renderProducts(viewContainer);
  });
}
