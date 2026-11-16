const firebaseConfig = {
    apiKey: "AIzaSyD2O2iYQDk9qGB1jKW121Hru3MiC3GGW98",
    authDomain: "classifieds-detective.firebaseapp.com",
    projectId: "classifieds-detective",
    storageBucket: "classifieds-detective.firebasestorage.app",
    messagingSenderId: "114298083065",
    appId: "1:114298083065:web:253ca0ff6cc244812af428",
    measurementId: "G-K9K5QVXMVC"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const ADMIN_EMAIL = "maxfoxbetov@gmail.com";

let currentUser = null;
let isAdmin = false;
let isModerator = false;
let allListings = [];
let moderators = [];
let allPosts = [];
let isGuestMode = false;

function getSafeEmailId(email) {
    return email.replace(/\./g, ',');
}

function checkModeratorRights(email) {
    return moderators.includes(email);
}

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

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function showWelcomeModal() {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
        document.getElementById('welcomeModal').classList.remove('hidden');
    }
}

function closeWelcomeModal() {
    document.getElementById('welcomeModal').classList.add('hidden');
    localStorage.setItem('hasSeenWelcome', 'true');
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function closeAuthAndBrowse() {
    isGuestMode = true;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    updateUIForGuest();
}

function updateUIForGuest() {
    document.getElementById('authBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('userEmail').classList.add('hidden');
    document.getElementById('newsBtn').classList.add('hidden');
    document.getElementById('addListingBtn').classList.add('hidden');
    document.getElementById('moderatorsBtn').classList.add('hidden');
}

auth.onAuthStateChanged((user) => {
    if (user) {
        isGuestMode = false;
        currentUser = user;
        isAdmin = user.email === ADMIN_EMAIL;
        isModerator = checkModeratorRights(user.email);
        
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userEmail').classList.remove('hidden');
        document.getElementById('authBtn').classList.add('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        
        if (isModerator) {
            document.getElementById('addListingBtn').classList.remove('hidden');
            document.getElementById('addPostSection').classList.remove('hidden');
            document.getElementById('newsBtn').classList.remove('hidden');
        } else {
            document.getElementById('newsBtn').classList.remove('hidden');
        }
        
        if (isAdmin) {
            document.getElementById('moderatorsBtn').classList.remove('hidden');
        }
        
        loadListings();
        loadModerators();
        loadNews();
    } else {
        if (!isGuestMode) {
            currentUser = null;
            isAdmin = false;
            isModerator = false;
            document.getElementById('authScreen').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
        }
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
    if (isGuestMode) {
        isGuestMode = false;
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('authBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
    } else {
        await auth.signOut();
    }
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
        moderators = [ADMIN_EMAIL]; 
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (!moderators.includes(data.email)) {
                moderators.push(data.email);
            }
        });
        
        if (currentUser) {
            isModerator = checkModeratorRights(currentUser.email);
            if (isModerator) {
                document.getElementById('addListingBtn').classList.remove('hidden');
                document.getElementById('addPostSection').classList.remove('hidden');
                document.getElementById('newsBtn').classList.remove('hidden');
            }
        }
    });
}

function loadNews() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        allPosts = [];
        snapshot.forEach((doc) => {
            allPosts.push({ id: doc.id, ...doc.data() });
        });
        renderNews();
    });
}

function filterListings() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = allListings;
    
    if (categoryFilter) filtered = filtered.filter(l => l.category === categoryFilter);
    if (statusFilter) filtered = filtered.filter(l => l.status === statusFilter);
    
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
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Нет объявлений в этой категории</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => {
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

async function deleteListing(listingId) {
    if (!isModerator) {
        alert('У вас нет прав для удаления');
        return;
    }
    
    if (!confirm('Удалить это объявление?')) return;
    
    try {
        await db.collection('listings').doc(listingId).delete();
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
    const mods = moderators.filter(m => m !== ADMIN_EMAIL);
    
    if (mods.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Нет дополнительных модераторов</p>';
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
        await db.collection('moderators').doc(safeId).set({
            email: emailInput,
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
    
    const safeId = email.replace(/\./g, ',');
    
    try {
        await db.collection('moderators').doc(safeId).delete();
        alert('Права убраны');
        updateModeratorsList();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function showNewsModal() {
    if (isGuestMode || !currentUser) {
        document.getElementById('newsGuestMessage').classList.remove('hidden');
        document.getElementById('newsFeedContainer').innerHTML = '';
        document.getElementById('addPostSection').classList.add('hidden');
    } else {
        document.getElementById('newsGuestMessage').classList.add('hidden');
        if (isModerator) {
            document.getElementById('addPostSection').classList.remove('hidden');
        }
        renderNews();
    }
    document.getElementById('newsModal').classList.remove('hidden');
}

function closeNewsModal() {
    document.getElementById('newsModal').classList.add('hidden');
}

function renderNews() {
    const container = document.getElementById('newsFeedContainer');
    
    if (allPosts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Пока нет новостей</p>';
        return;
    }
    
    container.innerHTML = allPosts.map(post => {
        const canDelete = isModerator;
        const date = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString('ru-RU') : '';
        
        return `
        <div class="news-post">
            ${canDelete ? `<button class="news-delete-btn" onclick="deletePost('${post.id}')">×</button>` : ''}
            <div class="news-author">${escapeHtml(post.authorEmail || 'Admin')}</div>
            <div class="news-text">${escapeHtml(post.content)}</div>
            <div class="news-date">${date}</div>
        </div>
    `}).join('');
}

async function addPost() {
    const content = document.getElementById('postContent').value.trim();
    
    if (!content) {
        alert('Введите текст новости');
        return;
    }
    
    if (!isModerator) {
        alert('У вас нет прав для публикации');
        return;
    }
    
    try {
        await db.collection('posts').add({
            content: content,
            authorEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('postContent').value = '';
    } catch (error) {
        alert('Ошибка при публикации: ' + error.message);
    }
}

async function deletePost(postId) {
    if (!isModerator) return;
    if (!confirm('Удалить этот пост?')) return;
    
    try {
        await db.collection('posts').doc(postId).delete();
    } catch (error) {
        alert('Ошибка при удалении: ' + error.message);
    }
}

function showAuthorsModal() {
    document.getElementById('authorsModal').classList.remove('hidden');
}

function closeAuthorsModal() {
    document.getElementById('authorsModal').classList.add('hidden');
}

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

document.getElementById('addModal').addEventListener('click', (e) => {
    if (e.target.id === 'addModal') closeAddModal();
});

document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeDetailModal();
});

document.getElementById('moderatorsModal').addEventListener('click', (e) => {
    if (e.target.id === 'moderatorsModal') closeModeratorsModal();
});

document.getElementById('newsModal').addEventListener('click', (e) => {
    if (e.target.id === 'newsModal') closeNewsModal();
});

document.getElementById('authorsModal').addEventListener('click', (e) => {
    if (e.target.id === 'authorsModal') closeAuthorsModal();
});

loadTheme();
showWelcomeModal();
