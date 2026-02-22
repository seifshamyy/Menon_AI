// ==============================
// Toast utility
// ==============================
export function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ==============================
// Modal helpers
// ==============================
const overlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');

export function openModal(html) {
    modalContent.innerHTML = html;
    overlay.classList.remove('hidden');
}
export function closeModal() {
    overlay.classList.add('hidden');
    modalContent.innerHTML = '';
}

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

// ==============================
// SVG icons (inline)
// ==============================
export const icons = {
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    chevLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
};

// ==============================
// JSON flattening helpers
// ==============================

/**
 * Normalize a JSONB value: always returns a parsed JS value.
 * Handles strings (possibly double-encoded), null, etc.
 */
export function parseJsonSafe(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
    }
    return val;
}

/**
 * Normalize photos to an array of URL strings.
 * Recursively extracts ALL string values from any JSON structure.
 * Handles: array, nested object, single string, null, mixed.
 */
export function normalizePhotos(raw) {
    const parsed = parseJsonSafe(raw);
    if (!parsed) return [];
    if (typeof parsed === 'string') return parsed.trim() ? [parsed] : [];
    return extractStrings(parsed);
}

function extractStrings(val) {
    if (val === null || val === undefined) return [];
    if (typeof val === 'string') return val.trim() ? [val] : [];
    if (Array.isArray(val)) {
        const result = [];
        for (const item of val) result.push(...extractStrings(item));
        return result;
    }
    if (typeof val === 'object') {
        const result = [];
        for (const v of Object.values(val)) result.push(...extractStrings(v));
        return result;
    }
    return [];
}

/**
 * Render a JSON value as an HTML table of key-value pairs (recursive, flat).
 */
export function jsonToDetailHtml(val) {
    const parsed = parseJsonSafe(val);
    if (!parsed || (typeof parsed !== 'object')) return `<span>${parsed ?? '—'}</span>`;
    const entries = flattenJson(parsed);
    if (entries.length === 0) return '<span>—</span>';
    let html = '<table class="json-detail-table">';
    for (const [k, v] of entries) {
        html += `<tr><td>${escHtml(k)}</td><td>${escHtml(String(v))}</td></tr>`;
    }
    html += '</table>';
    return html;
}

/**
 * Flatten nested JSON into [key, value] pairs with dot notation keys.
 */
export function flattenJson(obj, prefix = '') {
    const result = [];
    if (obj === null || obj === undefined) return result;
    if (typeof obj !== 'object') {
        result.push([prefix || 'value', obj]);
        return result;
    }
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
            const key = prefix ? `${prefix}[${i}]` : `[${i}]`;
            if (typeof item === 'object' && item !== null) {
                result.push(...flattenJson(item, key));
            } else {
                result.push([key, item]);
            }
        });
        return result;
    }
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null) {
            result.push(...flattenJson(v, key));
        } else {
            result.push([key, v]);
        }
    }
    return result;
}

export function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
