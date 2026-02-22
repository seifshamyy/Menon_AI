// ==============================
// Menon AI Control — main.js
// ==============================
import { renderProducts } from './views/products.js';
import { renderOffers } from './views/offers.js';

const viewContainer = document.getElementById('view-container');
const navBtns = document.querySelectorAll('.nav-btn');

let currentView = 'products';

function switchView(view) {
    currentView = view;
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'products') renderProducts(viewContainer);
    else if (view === 'offers') renderOffers(viewContainer);
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ── Dark mode toggle ────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');

function setDarkMode(enabled) {
    document.body.classList.toggle('dark', enabled);
    localStorage.setItem('menon-dark-mode', enabled ? '1' : '0');
}

// Restore saved preference
if (localStorage.getItem('menon-dark-mode') === '1') {
    setDarkMode(true);
}

themeToggle?.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark'));
});

// Boot
switchView('products');
