// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqKxVZ8vF3mN9pL2wR4tY6uI8oP0aS1dF",
    authDomain: "dealfinder-app.firebaseapp.com",
    projectId: "dealfinder-app",
    storageBucket: "dealfinder-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Admin email
const ADMIN_EMAIL = "maxfoxbetov@gmail.com";

let currentUser = null;
let isAdmin = false;
let allListings = [];

// Tab switching
function showTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
}

// Auth state listener
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        isAdmin = user.email === ADMIN_EMAIL;
        
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userEmail').textContent = user.email;
        
        if (isAdmin) {
            document.getElementById('addListingBtn').classList.remove('hidden');
        }
        
        loadListings();
    } else {
        currentUser = null;
        isAdmin = false;
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        document.getElementById('authError').textContent = '';
    } catch (error) {
        document.getElementById('authError').textContent = getErrorMessage(error.code);
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        document.getElementById('authError').textContent = '';
    } catch (error) {
        document.getElementById('authError').textContent = getErrorMessage(error.code);
    }
});

// Logout
async function logout() {
    await auth.signOut();
}

// Error messages in Russian
function getErrorMessage(code) {
    const errors = {
        'auth/email-already-in-use': 'Этот email уже зарегистрирован',
        'auth/invalid-email': 'Неверный формат email',
        'auth/operation-not-allowed': 'Регистрация отключена',
        'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
        'auth/user-disabled': 'Аккаунт заблокирован',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
    };
    return errors[code] || 'Произошла ошибка. Попробуйте снова.';
}

// Load listings with real-time updates
function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        allListings = [];
        snapshot.forEach((doc) => {
            allListings.push({ id: doc.id, ...doc.data() });
        });
        filterListings();
    });
}

// Filter and display listings
function filterListings() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = allListings;
    
    // Category filter
    if (categoryFilter) {
        filtered = filtered.filter(l => l.category === categoryFilter);
    }
    
    // Status filter
    if (statusFilter) {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    
    // Price filter
    if (priceFilter) {
        filtered = filtered.filter(l => {
            const price = parseFloat(l.price);
            if (priceFilter === '0-5000') return price <= 5000;
            if (priceFilter === '5000-15000') return price > 5000 && price <= 15000;
            if (priceFilter === '15000-30000') return price > 15000 && price <= 30000;
            if (priceFilter === '30000+') return price > 30000;
            return true;
        });
    }
    
    displayListings(filtered);
}

// Display listings
function displayListings(listings) {
    const container = document.getElementById('listingsContainer');
    
    if (listings.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; grid-column: 1/-1;">Нет объявлений в этой категории</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => `
        <div class="listing-card">
            <div class="listing-status ${listing.status}"></div>
            <span class="listing-category">${getCategoryName(listing.category)}</span>
            <h3 class="listing-title">${escapeHtml(listing.title)}</h3>
            <p class="listing-description">${escapeHtml(listing.description)}</p>
            <div class="listing-price">${formatPrice(listing.price)} ₽</div>
            <a href="${escapeHtml(listing.link)}" target="_blank" class="listing-link">Перейти к объявлению</a>
        </div>
    `).join('');
}

// Helper functions
function getCategoryName(category) {
    const categories = {
        'gaming-consoles': 'Игровые приставки',
        'portable-pc': 'Портативные компьютеры',
        'pc-components': 'Комплектующие для ПК',
        'phones': 'Телефоны',
        'games': 'Покупка игр'
    };
    return categories[category] || category;
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal functions
function showAddModal() {
    document.getElementById('addModal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('addListingForm').reset();
}

// Add listing
document.getElementById('addListingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
        alert('Только администратор может добавлять объявления');
        return;
    }
    
    const listing = {
        title: document.getElementById('listingTitle').value,
        description: document.getElementById('listingDescription').value,
        price: parseFloat(document.getElementById('listingPrice').value),
        category: document.getElementById('listingCategory').value,
        status: document.getElementById('listingStatus').value,
        link: document.getElementById('listingLink').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        addedBy: currentUser.email
    };
    
    try {
        await db.collection('listings').add(listing);
        closeAddModal();
        alert('Объявление добавлено!');
    } catch (error) {
        alert('Ошибка при добавлении: ' + error.message);
    }
});

// Close modal on outside click
document.getElementById('addModal').addEventListener('click', (e) => {
    if (e.target.id === 'addModal') {
        closeAddModal();
    }
});
