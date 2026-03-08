// ==============================
// Menon AI Control — main.js
// ==============================
import { renderProducts } from './views/products.js';
import { renderOffers } from './views/offers.js';
import { supabase } from './supabase.js';

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
    if (btn.hasAttribute('data-view')) {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    }
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
    // Only close sidebar for internal navigation buttons, not external links
    if (btn.hasAttribute('data-view')) {
        btn.addEventListener('click', closeSidebar);
    }
});

// ── AI Status Toggles Logic ─────────────────────────
const toggleMessenger = document.getElementById('toggle-messenger');
const toggleWhatsapp = document.getElementById('toggle-whatsapp');

async function initStatusToggles() {
    try {
        const { data, error } = await supabase
            .from('menon_ai_status')
            .select('*')
            .in('id', [1, 2]);

        if (error) throw error;

        // Initialize toggles from database state
        data.forEach(row => {
            if (row.id === 1 && toggleMessenger) {
                toggleMessenger.checked = row.status;
                toggleMessenger.disabled = false;
            } else if (row.id === 2 && toggleWhatsapp) {
                toggleWhatsapp.checked = row.status;
                toggleWhatsapp.disabled = false;
            }
        });

        // Add event listeners for updating state
        toggleMessenger?.addEventListener('change', async (e) => {
            const newStatus = e.target.checked;
            toggleMessenger.disabled = true; // disable during network request
            const { error } = await supabase
                .from('menon_ai_status')
                .update({ status: newStatus })
                .eq('id', 1);

            toggleMessenger.disabled = false;
            if (error) {
                console.error('Error updating Messenger status:', error);
                toggleMessenger.checked = !newStatus; // revert on fail
                // Optionally show a toast error here
            }
        });

        toggleWhatsapp?.addEventListener('change', async (e) => {
            const newStatus = e.target.checked;
            toggleWhatsapp.disabled = true; // disable during network request
            const { error } = await supabase
                .from('menon_ai_status')
                .update({ status: newStatus })
                .eq('id', 2);

            toggleWhatsapp.disabled = false;
            if (error) {
                console.error('Error updating WhatsApp status:', error);
                toggleWhatsapp.checked = !newStatus; // revert on fail
                // Optionally show a toast error here
            }
        });

    } catch (err) {
        console.error('Failed to fetch initial menon_ai_status:', err);
    }
}

// Initialize toggles independently of the views
initStatusToggles();
