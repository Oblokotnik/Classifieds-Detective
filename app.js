// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2O2iYQDk9qGB1jKW121Hru3MiC3GGW98",
    authDomain: "classifieds-detective.firebaseapp.com",
    projectId: "classifieds-detective",
    storageBucket: "classifieds-detective.firebasestorage.app",
    messagingSenderId: "114298083065",
    appId: "1:114298083065:web:253ca0ff6cc244812af428",
    measurementId: "G-K9K5QVXMVC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Admin email
const ADMIN_EMAIL = "maxfoxbetov@gmail.com";

let currentUser = null;
let isAdmin = false;
let isModerator = false;
let allListings = [];
let moderators = []; // Список email-ов модераторов (включая админа)

// --- Helper Functions ---

// Заменяем точки на запятые для использования в качестве ID документа в Firestore
function getSafeEmailId(email) {
    return email.replace(/\./g, ',');
}

// Проверка прав модератора по локальному списку
function checkModeratorRights(email) {
    return moderators.includes(email);
}

// --- UI & Navigation ---

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

// --- Authentication ---

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        isAdmin = user.email === ADMIN_EMAIL;
        isModerator = checkModeratorRights(user.email);
        
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userEmail').textContent = user.email;
        
        // Показываем кнопки только если есть права
        if (isModerator) {
            document.getElementById('addListingBtn').classList.remove('hidden');
        }
        
        if (isAdmin) {
            document.getElementById('moderatorsBtn').classList.remove('hidden');
        }
        
        loadListings();
        loadModerators();
    } else {
        currentUser = null;
        isAdmin = false;
        isModerator = false;
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('authError');
    
    errorDiv.textContent = 'Входим...';
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        errorDiv.textContent = '';
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = getErrorMessage(error.code);
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('authError');
    
    errorDiv.textContent = 'Регистрируем...';
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        errorDiv.textContent = '';
    } catch (error) {
        console.error('Register error:', error);
        errorDiv.textContent = getErrorMessage(error.code);
    }
});

async function logout() {
    await auth.signOut();
}

function getErrorMessage(code) {
    const errors = {
        'auth/email-already-in-use': 'Этот email уже зарегистрирован',
        'auth/invalid-email': 'Неверный формат email',
        'auth/operation-not-allowed': 'Регистрация отключена',
        'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
        'auth/user-disabled': 'Аккаунт заблокирован',
        'auth/user-not-found': 'Пользователь не найден. Сначала зарегистрируйтесь',
        'auth/wrong-password': 'Неверный пароль',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
    };
    return errors[code] || 'Ошибка: ' + code;
}

// --- Data Loading ---

function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        allListings = [];
        snapshot.forEach((doc) => {
            allListings.push({ id: doc.id, ...doc.data() });
        });
        filterListings();
    }, (error) => {
        console.error('Firestore error:', error);
        alert('Ошибка загрузки данных: ' + error.message);
    });
}

function loadModerators() {
    db.collection('moderators').onSnapshot((snapshot) => {
        // Админ всегда модератор
        moderators = [ADMIN_EMAIL]; 
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Добавляем в список, если его там еще нет
            if (!moderators.includes(data.email)) {
                moderators.push(data.email);
            }
        });
        
        // Обновляем статус текущего пользователя, если он вошел
        if (currentUser) {
            isModerator = checkModeratorRights(currentUser.email);
            if (isModerator) {
                document.getElementById('addListingBtn').classList.remove('hidden');
            }
        }
    });
}

// --- Filtering & Display ---

function filterListings() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = allListings;
    
    if (categoryFilter) {
        filtered = filtered.filter(l => l.category === categoryFilter);
    }
    
    if (statusFilter) {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    
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

function displayListings(listings) {
    const container = document.getElementById('listingsContainer');
    
    if (listings.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; grid-column: 1/-1;">Нет объявлений в этой категории</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => {
        // Обрезаем описание до 30 символов
        const shortDesc = listing.description.length > 30 
            ? listing.description.substring(0, 30) + '...' 
            : listing.description;
        
        const canDelete = isModerator;
        
        return `
        <div class="listing-card" onclick="showDetail('${listing.id}')">
            ${canDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteListing('${listing.id}')">×</button>` : ''}
            <div class="listing-status ${listing.status}"></div>
            <span class="listing-category">${getCategoryName(listing.category)}</span>
            <h3 class="listing-title">${escapeHtml(listing.title)}</h3>
            <p class="listing-description">${escapeHtml(shortDesc)}</p>
            <div class="listing-price">${formatPrice(listing.price)} ₽</div>
            ${listing.description.length > 30 ? '<span class="read-more">Подробнее →</span>' : ''}
        </div>
    `}).join('');
}

// --- Modals & Details ---

function showDetail(listingId) {
    const listing = allListings.find(l => l.id === listingId);
    if (!listing) return;
    
    document.getElementById('detailTitle').textContent = listing.title;
    document.getElementById('detailCategory').textContent = getCategoryName(listing.category);
    document.getElementById('detailDescription').textContent = listing.description;
    document.getElementById('detailPrice').textContent = formatPrice(listing.price) + ' ₽';
    document.getElementById('detailLink').href = listing.link;
    
    const statusDot = document.getElementById('detailStatusDot');
    const statusText = document.getElementById('detailStatusText');
    statusDot.className = 'dot';
    statusDot.style.background = getStatusColor(listing.status);
    statusText.textContent = getStatusText(listing.status);
    
    document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

function showAddModal() {
    document.getElementById('addModal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('addListingForm').reset();
}

// --- Actions (Add/Delete) ---

async function deleteListing(listingId) {
    if (!isModerator) {
        alert('У вас нет прав для удаления');
        return;
    }
    
    if (!confirm('Удалить это объявление?')) return;
    
    try {
        await db.collection('listings').doc(listingId).delete();
        // Уведомление не обязательно, так как onSnapshot обновит список автоматически
    } catch (error) {
        alert('Ошибка при удалении: ' + error.message);
    }
}

document.getElementById('addListingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isModerator) {
        alert('У вас нет прав для добавления объявлений');
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
        console.error('Add listing error:', error);
        alert('Ошибка при добавлении: ' + error.message);
    }
});

// --- Moderators Management ---

function showModeratorsModal() {
    if (!isAdmin) {
        alert('Только администратор может управлять модераторами');
        return;
    }
    updateModeratorsList();
    document.getElementById('moderatorsModal').classList.remove('hidden');
}

function closeModeratorsModal() {
    document.getElementById('moderatorsModal').classList.add('hidden');
    document.getElementById('moderatorEmail').value = '';
}

function updateModeratorsList() {
    const list = document.getElementById('moderatorsList');
    // Фильтруем админа из списка, чтобы не показывать кнопку "удалить" самому себе
    const mods = moderators.filter(m => m !== ADMIN_EMAIL);
    
    if (mods.length === 0) {
        list.innerHTML = '<p style="color: #7f8c8d;">Нет дополнительных модераторов</p>';
        return;
    }
    
    list.innerHTML = mods.map(email => `
        <div class="moderator-item">
            <span class="moderator-email">${email}</span>
            <button class="remove-moderator-btn" onclick="removeModerator('${email}')">Убрать права</button>
        </div>
    `).join('');
}

async function addModerator() {
    const emailInput = document.getElementById('moderatorEmail').value.trim();
    
    if (!emailInput) {
        alert('Введите email');
        return;
    }

    // ВАЖНО: Заменяем точки на запятые для ID документа
    const safeId = emailInput.replace(/\./g, ','); 
    
    if (emailInput === ADMIN_EMAIL) {
        alert('Администратор уже имеет все права');
        return;
    }
    
    if (moderators.includes(emailInput)) {
        alert('Этот пользователь уже является модератором');
        return;
    }
    
    try {
        // Используем safeId как ID документа
        await db.collection('moderators').doc(safeId).set({
            email: emailInput, // Настоящий email храним внутри поля
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: ADMIN_EMAIL
        });
        
        alert('Права модератора выданы!');
        document.getElementById('moderatorEmail').value = '';
        updateModeratorsList();
    } catch (error) {
        console.error(error);
        alert('Ошибка: ' + error.message);
    }
}

async function removeModerator(email) {
    if (!confirm(`Убрать права модератора у ${email}?`)) return;
    
    // Снова заменяем точки на запятые для поиска ID
    const safeId = email.replace(/\./g, ',');
    
    try {
        await db.collection('moderators').doc(safeId).delete();
        alert('Права убраны');
        updateModeratorsList();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// --- Helpers ---

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

function getStatusColor(status) {
    const colors = {
        'normal': '#27ae60',
        'suspicious': '#f39c12',
        'strange': '#e74c3c'
    };
    return colors[status] || '#999';
}

function getStatusText(status) {
    const texts = {
        'normal': 'Обычное предложение',
        'suspicious': 'Сомнительное',
        'strange': 'Странное предложение'
    };
    return texts[status] || status;
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modals on outside click
document.getElementById('addModal').addEventListener('click', (e) => {
    if (e.target.id === 'addModal') closeAddModal();
});

document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeDetailModal();
});

document.getElementById('moderatorsModal').addEventListener('click', (e) => {
    if (e.target.id === 'moderatorsModal') closeModeratorsModal();
});
