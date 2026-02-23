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

// ── Mobile sidebar toggle ───────────────────────────
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('visible');
    menuToggle.classList.add('hidden');
}
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('visible');
    menuToggle.classList.remove('hidden');
}

menuToggle?.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarBackdrop?.addEventListener('click', closeSidebar);

// Close sidebar when a nav item is clicked (mobile)
navBtns.forEach(btn => {
    btn.addEventListener('click', closeSidebar);
});
