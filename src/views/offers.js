// ==============================
// Offers View
// ==============================
import { supabase } from '../supabase.js';
import { toast, openModal, closeModal, icons, escHtml } from '../utils.js';

const TABLE = 'offers_menon';
const PAGE_SIZE = 12;

let allOffers = [];
let filtered = [];
let page = 1;
let searchTerm = '';

// ─── Fetch ──────────────────────────────────────────
async function fetchOffers() {
  const { data, error } = await supabase.from(TABLE).select('*');
  if (error) {
    console.error('Offers fetch error:', error);
    toast('Failed to load offers: ' + error.message, 'error');
    return [];
  }
  console.log('Offers loaded:', data?.length, data);
  return data || [];
}

// ─── Render ─────────────────────────────────────────
export async function renderOffers(container) {
  container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  allOffers = await fetchOffers();
  filtered = allOffers;
  page = 1;
  searchTerm = '';
  renderView(container);
}

function renderView(container) {
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  container.innerHTML = `
    <div class="view-header">
      <h2>Offers</h2>
      <div class="header-actions">
        <div class="search-wrapper">
          ${icons.search}
          <input type="text" class="search-input" id="offer-search" placeholder="Search offers…" value="${escHtml(searchTerm)}" />
        </div>
        <button class="btn btn-gold" id="add-offer-btn">${icons.plus} Add Offer</button>
      </div>
    </div>
    <div class="table-container">
      ${pageItems.length === 0 ? renderEmpty() : renderTable(pageItems)}
      <div class="table-footer">
        <span>${filtered.length} offer${filtered.length !== 1 ? 's' : ''}</span>
        ${renderPagination(totalPages)}
      </div>
    </div>
  `;

  bindEvents(container);
}

function renderTable(items) {
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Details</th>
          <th>Status</th>
          <th style="width:100px">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(o => `
          <tr>
            <td><strong style="color:var(--navy)">#${o.id}</strong></td>
            <td style="max-width:420px">${escHtml(o.details || '—')}</td>
            <td>${statusBadge(o.status)}</td>
            <td>
              <div class="row-actions">
                <button title="Edit" data-action="edit" data-id="${o.id}">${icons.edit}</button>
                <button title="Delete" class="delete-btn" data-action="delete" data-id="${o.id}">${icons.trash}</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  let cls = 'draft';
  if (s === 'active' || s === 'live') cls = 'active';
  else if (s === 'inactive' || s === 'expired' || s === 'ended') cls = 'inactive';
  return `<span class="status-badge ${cls}">${escHtml(status || 'N/A')}</span>`;
}

function renderEmpty() {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
    <p>No offers found</p>
    <p class="sub">Create your first offer to get started</p>
  </div>`;
}

function renderPagination(totalPages) {
  if (totalPages <= 1) return '';
  let html = '<div class="pagination">';
  html += `<button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${icons.chevLeft}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-page="${i}" class="${i === page ? 'active' : ''}">${i}</button>`;
  }
  html += `<button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>${icons.chevRight}</button>`;
  html += '</div>';
  return html;
}

// ─── Events ─────────────────────────────────────────
function bindEvents(container) {
  const searchInput = container.querySelector('#offer-search');
  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    filtered = allOffers.filter(o =>
      (o.details || '').toLowerCase().includes(searchTerm) ||
      (o.status || '').toLowerCase().includes(searchTerm) ||
      String(o.id).includes(searchTerm)
    );
    page = 1;
    renderView(container);
  });

  container.querySelector('#add-offer-btn')?.addEventListener('click', () => {
    openOfferForm(null, container);
  });

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const offer = allOffers.find(o => Number(o.id) === id);
      if (!offer) return;
      if (btn.dataset.action === 'edit') openOfferForm(offer, container);
      else if (btn.dataset.action === 'delete') confirmDelete(offer, container);
    });
  });

  container.querySelectorAll('.pagination button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (p >= 1) { page = p; renderView(container); }
    });
  });
}

// ─── Form ───────────────────────────────────────────
function openOfferForm(offer, viewContainer) {
  const isEdit = !!offer;

  openModal(`
    <div class="modal-header">
      <h3>${isEdit ? 'Edit' : 'New'} Offer</h3>
      <button class="modal-close" id="modal-close-btn">${icons.x}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Details</label>
        <textarea class="form-textarea" id="f-details" rows="4" placeholder="Offer details…">${isEdit ? escHtml(offer.details || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <input class="form-input" id="f-status" value="${isEdit ? escHtml(offer.status || '') : ''}" placeholder="e.g. active, inactive, draft" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">${isEdit ? 'Update' : 'Create'} Offer</button>
    </div>
  `);

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-save-btn')?.addEventListener('click', async () => {
    const details = document.getElementById('f-details')?.value.trim();
    const status = document.getElementById('f-status')?.value.trim();

    if (!details) { toast('Details are required', 'error'); return; }

    const payload = { details, status: status || null };
    let error;

    if (isEdit) {
      ({ error } = await supabase.from(TABLE).update(payload).eq('id', offer.id));
    } else {
      ({ error } = await supabase.from(TABLE).insert(payload));
    }

    if (error) { toast('Save failed: ' + error.message, 'error'); return; }
    toast(isEdit ? 'Offer updated' : 'Offer created', 'success');
    closeModal();
    renderOffers(viewContainer);
  });
}

// ─── Delete ─────────────────────────────────────────
function confirmDelete(offer, viewContainer) {
  openModal(`
    <div class="modal-header">
      <h3>Delete offer</h3>
      <button class="modal-close" id="modal-close-btn">${icons.x}</button>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to delete offer <strong>#${offer.id}</strong>?</p>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-top:6px">This action cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm-del">Delete</button>
    </div>
  `);

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-del')?.addEventListener('click', async () => {
    const { error } = await supabase.from(TABLE).delete().eq('id', offer.id);
    if (error) { toast('Delete failed: ' + error.message, 'error'); return; }
    toast('Offer deleted', 'success');
    closeModal();
    renderOffers(viewContainer);
  });
}
