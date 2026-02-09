/* ============================================
   DREAM AI GIRL - FUTURISTIC UI
   Main JavaScript Controller
   ============================================ */

// ====== STATE ======
let allGirls = [];
let camgirls = [];
let currentUser = null;
let currentGirl = null;
let currentPage = 'camgirls';
let userTokens = 500;
let currentFilter = 'all';
let swipeIndex = 0;
let chatMessages = [];
let userMatches = [];
let userConversations = [];
let girlPhotos = {};
let girlVideos = {};
let loadingPhotos = new Set();
let notifications = [];
let unreadCount = 0;
let profileCarouselMedia = [];
let profileCurrentSlide = 0;

// ====== PROFILE CAROUSEL FUNCTIONS ======
function renderProfileCarousel() {
    const container = document.getElementById('profileCarouselContainer');
    const dotsContainer = document.getElementById('profileCarouselDots');
    
    if (!container || !dotsContainer) return;
    
    container.innerHTML = profileCarouselMedia.map((m, i) => {
        if (m.type === 'video') {
            return `<div class="carousel-slide"><video src="${m.url}" autoplay loop muted playsinline></video></div>`;
        } else {
            return `<div class="carousel-slide"><img src="${m.url}" alt="Photo ${i+1}"></div>`;
        }
    }).join('');
    
    dotsContainer.innerHTML = profileCarouselMedia.map((_, i) => 
        `<div class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToProfileSlide(${i})"></div>`
    ).join('');
    
    updateProfileCarouselPosition();
    setupProfileSwipe();
}

function updateProfileCarouselPosition() {
    const container = document.getElementById('profileCarouselContainer');
    if (!container) return;
    
    container.style.transform = `translateX(-${profileCurrentSlide * 100}%)`;
    
    document.querySelectorAll('#profileCarouselDots .carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === profileCurrentSlide);
    });
    
    const slides = container.querySelectorAll('.carousel-slide');
    slides.forEach((slide, i) => {
        const video = slide.querySelector('video');
        if (video) {
            if (i === profileCurrentSlide) video.play();
            else video.pause();
        }
    });
}

function nextProfileSlide() {
    if (profileCurrentSlide < profileCarouselMedia.length - 1) {
        profileCurrentSlide++;
        updateProfileCarouselPosition();
    }
}

function prevProfileSlide() {
    if (profileCurrentSlide > 0) {
        profileCurrentSlide--;
        updateProfileCarouselPosition();
    }
}

function goToProfileSlide(index) {
    profileCurrentSlide = index;
    updateProfileCarouselPosition();
}

function setupProfileSwipe() {
    const bg = document.getElementById('profileMediaBg');
    if (!bg || bg.hasAttribute('data-swipe-setup')) return;
    bg.setAttribute('data-swipe-setup', 'true');
    
    let startX = 0;
    let isDragging = false;
    
    bg.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
    });
    
    bg.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextProfileSlide();
            else prevProfileSlide();
        }
        isDragging = false;
    });
}

async function loadProfileCarouselPhotos(girlId) {
    try {
        // Try camgirl content endpoint first
        const camRes = await fetch(`/api/camgirl/content/${girlId}`);
        if (camRes.ok) {
            const data = await camRes.json();
            if (data.photos && data.photos.length > 0) {
                data.photos.forEach(p => {
                    if (!profileCarouselMedia.find(m => m.url === p.url)) {
                        profileCarouselMedia.push({type: 'photo', url: p.url});
                    }
                });
            }
            if (data.videos && data.videos.length > 0) {
                data.videos.forEach(v => {
                    if (!profileCarouselMedia.find(m => m.url === v.url)) {
                        profileCarouselMedia.push({type: 'video', url: v.url});
                    }
                });
            }
        }
        
        // Also try stored photos endpoint
        const storedRes = await fetch(`/api/stored_photos/${girlId}`);
        if (storedRes.ok) {
            const storedData = await storedRes.json();
            if (storedData.photos && storedData.photos.length > 0) {
                storedData.photos.forEach(p => {
                    const url = p.url || p;
                    if (url && !profileCarouselMedia.find(m => m.url === url)) {
                        profileCarouselMedia.push({type: 'photo', url: url});
                    }
                });
            }
        }
        
        // Also try videos endpoint
        const vidRes = await fetch(`/api/profile_videos_all/${girlId}`);
        if (vidRes.ok) {
            const vidData = await vidRes.json();
            if (vidData.videos && vidData.videos.length > 0) {
                vidData.videos.forEach(v => {
                    const url = v.url || v;
                    if (url && !profileCarouselMedia.find(m => m.url === url)) {
                        profileCarouselMedia.push({type: 'video', url: url});
                    }
                });
            }
        }
        
        renderProfileCarousel();
    } catch (err) {
        console.log('Error loading profile photos:', err);
    }
}

// ====== CANDY AI PROFILE TABS ======
function showProfileTab() {
    document.getElementById('tabProfile').classList.add('active');
    document.getElementById('tabGallery').classList.remove('active');
    document.getElementById('profileInfoSection').style.display = 'block';
    document.getElementById('profileGallerySection').style.display = 'none';
}

function showGalleryTab() {
    document.getElementById('tabProfile').classList.remove('active');
    document.getElementById('tabGallery').classList.add('active');
    document.getElementById('profileInfoSection').style.display = 'none';
    document.getElementById('profileGallerySection').style.display = 'block';
    loadGalleryContent();
}

async function loadGalleryContent() {
    if (!currentGirl) return;
    const photosGrid = document.getElementById('profilePhotos');
    const videosGrid = document.getElementById('profileVideos');
    
    photosGrid.innerHTML = profileCarouselMedia.filter(m => m.type === 'photo').map(p => 
        `<img src="${p.url}" alt="Photo" onclick="openFullscreenPhoto('${p.url}')">`
    ).join('');
    
    videosGrid.innerHTML = profileCarouselMedia.filter(m => m.type === 'video').map(v => 
        `<video src="${v.url}" onclick="openFullscreenVideo('${v.url}')"></video>`
    ).join('');
}

function toggleFavorite() {
    const btn = document.querySelector('.candy-fav');
    btn.classList.toggle('active');
    if (currentGirl) {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (favs.includes(currentGirl.id)) {
            favs.splice(favs.indexOf(currentGirl.id), 1);
        } else {
            favs.push(currentGirl.id);
        }
        localStorage.setItem('favorites', JSON.stringify(favs));
    }
}

function showPrivateContent() {
    showGalleryTab();
}

// ====== COLORS FOR AVATARS ======
const avatarColors = [
    'linear-gradient(135deg, #00ffff, #0088ff)',
    'linear-gradient(135deg, #ff00ff, #ff0080)',
    'linear-gradient(135deg, #bf00ff, #8b5cf6)',
    'linear-gradient(135deg, #00ff88, #00ffff)',
    'linear-gradient(135deg, #ff0080, #ff00ff)',
    'linear-gradient(135deg, #8b5cf6, #0088ff)',
    'linear-gradient(135deg, #00ffff, #bf00ff)',
    'linear-gradient(135deg, #ff0080, #00ffff)'
];

// ====== INIT ======
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();
    initFilters();
    initChatInput();
    addAnimationStyles();
    initCreatorWizard();
    
    // Load real data from backend
    await loadAllData();
    
    // Initialize notifications after data is loaded
    initNotifications();
});

async function loadAllData() {
    try {
        // Load all girls
        const res = await fetch('/api/all_girls');
        const data = await res.json();
        if (data.success) {
            allGirls = data.girls;
            camgirls = allGirls.filter(g => g.is_camgirl);
            
            // Pre-populate girlPhotos from API response
            allGirls.forEach((g, i) => {
                g.online = g.is_camgirl || Math.random() > 0.6;
                g.is_new = i > allGirls.length - 20;
                
                // Store photo from API response
                if (g.photo) {
                    girlPhotos[g.id] = g.photo;
                }
            });
            
            console.log(`Loaded ${allGirls.length} girls, ${Object.keys(girlPhotos).length} photos preloaded`);
            
            // Pre-load videos for camgirls
            camgirls.forEach(g => loadGirlVideo(g.id));
            
            renderStories();
            renderCamgirls();
            renderConversations();
            renderMatches();
            renderGallery();
            renderHomeDashboard();
            initDiscoverPage();
            initSwipe();
            
            // Initialize generator if page is visible
            if (document.getElementById('pageGenerate')?.classList.contains('active')) {
                initGeneratorPage();
            }
        }
    } catch (err) {
        console.error('Error loading data:', err);
        // Use fallback mock data
        useMockData();
    }
}

function useMockData() {
    allGirls = [
        { id: 'girl_1', name: 'Yuki', age: 22, origin: 'Japon', type: 'Maid', online: true, popular: true, is_new: false, is_camgirl: true },
        { id: 'girl_2', name: 'Luna', age: 25, origin: 'France', type: 'Dominatrice', online: true, popular: true, is_new: false, is_camgirl: true },
        { id: 'girl_3', name: 'Sofia', age: 28, origin: 'Espagne', type: 'MILF', online: true, popular: false, is_new: false, is_camgirl: false },
        { id: 'girl_4', name: 'Mia', age: 20, origin: 'Suede', type: 'Timide', online: true, popular: false, is_new: true, is_camgirl: false },
        { id: 'girl_5', name: 'Elena', age: 24, origin: 'Russie', type: 'Nympho', online: false, popular: true, is_new: false, is_camgirl: true },
        { id: 'girl_6', name: 'Aiko', age: 21, origin: 'Coree', type: 'Cosplay', online: false, popular: false, is_new: true, is_camgirl: false },
        { id: 'girl_7', name: 'Clara', age: 26, origin: 'Bresil', type: 'Exhib', online: true, popular: true, is_new: false, is_camgirl: true },
        { id: 'girl_8', name: 'Nina', age: 23, origin: 'Italie', type: 'Romantique', online: false, popular: false, is_new: true, is_camgirl: false },
        { id: 'girl_9', name: 'Sakura', age: 19, origin: 'Japon', type: 'Kawaii', online: true, popular: true, is_new: true, is_camgirl: true },
        { id: 'girl_10', name: 'Valentina', age: 30, origin: 'Colombie', type: 'Cougar', online: true, popular: false, is_new: false, is_camgirl: false },
        { id: 'girl_11', name: 'Mei', age: 22, origin: 'Chine', type: 'Soumise', online: false, popular: false, is_new: false, is_camgirl: false },
        { id: 'girl_12', name: 'Anya', age: 27, origin: 'Ukraine', type: 'Fetichiste', online: true, popular: true, is_new: false, is_camgirl: true }
    ];
    camgirls = allGirls.filter(g => g.is_camgirl);
    
    renderStories();
    renderCamgirls();
    renderConversations();
    renderMatches();
    renderGallery();
    renderHomeDashboard();
    initDiscoverPage();
    initSwipe();
}

// ====== AUTH ======
async function checkAuth() {
    // Auto-login: skip auth screen
    document.getElementById('authScreen').classList.add('hidden');
    
    const user = localStorage.getItem('dreamUser');
    if (user) {
        currentUser = JSON.parse(user);
    } else {
        currentUser = { id: 1, username: 'Visiteur', email: 'guest@dream.ai' };
        localStorage.setItem('dreamUser', JSON.stringify(currentUser));
    }
    userTokens = parseInt(localStorage.getItem('dreamTokens') || '500');
    updateUserDisplay();
    updateTokenDisplay();
    loadUserMatches();
}

// Token management functions
async function deductTokens(amount, reason) {
    try {
        const res = await fetch('/api/tokens/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason })
        });
        if (res.ok) {
            const data = await res.json();
            userTokens = data.tokens;
            localStorage.setItem('dreamTokens', userTokens.toString());
            updateTokenDisplay();
            return true;
        } else {
            const err = await res.json();
            showToast(err.error || 'Pas assez de tokens!');
            return false;
        }
    } catch (e) {
        console.error('Token deduction error:', e);
        return false;
    }
}

async function addTokensToAccount(amount) {
    try {
        const res = await fetch('/api/tokens/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        if (res.ok) {
            const data = await res.json();
            userTokens = data.tokens;
            localStorage.setItem('dreamTokens', userTokens.toString());
            updateTokenDisplay();
            return true;
        }
    } catch (e) {
        console.error('Token add error:', e);
    }
    return false;
}

function loadUserMatches() {
    const saved = localStorage.getItem('dreamMatches');
    if (saved) userMatches = JSON.parse(saved);
    
    const convs = localStorage.getItem('dreamConversations');
    if (convs) userConversations = JSON.parse(convs);
}

function showLogin() {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegister() {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('dreamUser', JSON.stringify(data.user));
            document.getElementById('authScreen').classList.add('hidden');
            updateUserDisplay();
            showToast('Connexion reussie!');
        } else {
            showToast(data.error || 'Erreur de connexion');
        }
    } catch (err) {
        currentUser = { id: 1, username };
        localStorage.setItem('dreamUser', JSON.stringify(currentUser));
        document.getElementById('authScreen').classList.add('hidden');
        updateUserDisplay();
        showToast('Bienvenue ' + username + '!');
    }
    return false;
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const email = form.email.value;
    const password = form.password.value;
    const age = parseInt(form.age.value);
    
    if (age < 18) {
        showToast('Tu dois avoir 18 ans minimum');
        return false;
    }
    
    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, age })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('dreamUser', JSON.stringify(data.user));
            document.getElementById('authScreen').classList.add('hidden');
            updateUserDisplay();
            showToast('Compte cree avec succes!');
        } else {
            showToast(data.error || 'Erreur d\'inscription');
        }
    } catch (err) {
        currentUser = { id: 1, username, email, age };
        localStorage.setItem('dreamUser', JSON.stringify(currentUser));
        document.getElementById('authScreen').classList.add('hidden');
        updateUserDisplay();
        showToast('Bienvenue ' + username + '!');
    }
    return false;
}

function logout() {
    localStorage.removeItem('dreamUser');
    localStorage.removeItem('dreamTokens');
    currentUser = null;
    document.getElementById('authScreen').classList.remove('hidden');
    showToast('Deconnecte');
}

function updateUserDisplay() {
    if (currentUser) {
        const nameEl = document.getElementById('userName');
        const avatarEl = document.getElementById('userAvatar');
        if (nameEl) nameEl.textContent = currentUser.username;
        if (avatarEl) avatarEl.textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

// ====== NAVIGATION ======
function initNavigation() {
    // Sidebar nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
    
    // Submenu items
    document.querySelectorAll('.submenu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
    
    // Bottom nav items
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'tokens') {
                showBuyTokens();
            } else if (page === 'discover') {
                navigateTo('tinder');
            } else {
                navigateTo(page);
            }
        });
    });
}

function navigateTo(page) {
    currentPage = page;
    
    // Update sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    
    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        const itemPage = item.dataset.page;
        if (itemPage === page || (itemPage === 'discover' && page === 'tinder')) {
            item.classList.add('active');
        }
    });
    
    // Show page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Map page names to element IDs
    const pageMap = {
        'camgirls': 'pageCamgirls',
        'tinder': 'pageTinder',
        'discover': 'pageTinder',
        'messages': 'pageMessages',
        'matches': 'pageMatches',
        'myais': 'pageMesIA',
        'mesia': 'pageMesIA',
        'gallery': 'pageGallery',
        'generate': 'pageGenerate',
        'tokens': 'pageTokens',
        'profile': 'pageProfile',
        'creator': 'pageCreator'
    };
    
    const pageElId = pageMap[page] || 'page' + page.charAt(0).toUpperCase() + page.slice(1);
    const pageEl = document.getElementById(pageElId);
    if (pageEl) {
        pageEl.classList.add('active');
        pageEl.style.animation = 'fadeIn 0.3s ease';
    }
    
    // Render page-specific content
    if (page === 'myais' || page === 'mesia') {
        renderMesIA();
    }
    if (page === 'tokens') {
        renderTokensPage();
    }
    if (page === 'gallery') {
        renderGallery();
    }
    if (page === 'discover' || page === 'tinder') {
        renderFeed();
    }
    if (page === 'generate') {
        initGeneratorPage();
    }
    
    closeSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
}

function toggleMenuSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('expanded');
    }
}

function filterConversations() {
    const query = document.getElementById('searchConversation')?.value.toLowerCase() || '';
    document.querySelectorAll('.conversation-item').forEach(item => {
        const name = item.querySelector('.conv-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(query) ? '' : 'none';
    });
}

// Render Mes IA (custom girlfriends)
function renderMyAIs() {
    const grid = document.getElementById('myAIsGrid');
    const empty = document.getElementById('myAIsEmpty');
    if (!grid || !empty) return;
    
    const customGirls = allGirls.filter(g => g.is_custom);
    
    if (customGirls.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    
    grid.style.display = 'grid';
    empty.style.display = 'none';
    
    grid.innerHTML = customGirls.map(girl => {
        const photoUrl = girlPhotos[girl.id] || '';
        return `
            <div class="myais-card" onclick="openProfile('${girl.id}')">
                ${photoUrl ? `<img src="${photoUrl}" alt="${girl.name}">` : `<div class="myais-placeholder"></div>`}
                <div class="myais-card-info">
                    <div class="myais-card-name">${girl.name}, ${girl.age || 21}</div>
                    <div class="myais-card-type">${girl.type || 'IA personnalisee'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Render Mes IA page (new design)
function renderMesIA() {
    const grid = document.getElementById('mesIAGrid');
    const empty = document.getElementById('mesIAEmpty');
    if (!grid || !empty) return;
    
    const customGirls = allGirls.filter(g => g.is_custom);
    
    if (customGirls.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    
    grid.style.display = 'grid';
    empty.style.display = 'none';
    
    grid.innerHTML = customGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id] || '';
        return `
            <div class="mes-ia-card" onclick="openProfile('${girl.id}')" style="animation: scaleIn 0.3s ease ${i * 0.05}s both">
                <div class="mes-ia-card-img">
                    ${photoUrl ? `<img src="${photoUrl}" alt="${girl.name}">` : `<div class="mes-ia-card-placeholder">${girl.name.charAt(0)}</div>`}
                </div>
                <div class="mes-ia-card-info">
                    <div class="mes-ia-card-name">${girl.name}, ${girl.age || 21}</div>
                    <div class="mes-ia-card-type">${girl.type || 'IA personnalisee'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Render Tokens page
function renderTokensPage() {
    const balanceEl = document.getElementById('tokenBalance');
    if (balanceEl) {
        balanceEl.textContent = userTokens || 0;
    }
}

// Buy tokens (simulated)
function buyTokens(amount) {
    showToast(`Achat de ${amount} jetons - Fonctionnalite bientot disponible`);
    showPremiumPopup();
}

// Show premium popup
function showPremiumPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="this.parentElement.parentElement.remove()">X</button>
            <h2>Devenir Premium</h2>
            <p style="color:#a0a0c0;margin-bottom:20px">Profite de tous les avantages premium</p>
            <div style="display:flex;flex-direction:column;gap:12px">
                <div style="background:rgba(191,0,255,0.1);border:1px solid #bf00ff;border-radius:12px;padding:16px;cursor:pointer" onclick="alert('Redirection vers paiement...')">
                    <div style="font-size:20px;font-weight:700;color:#fff">12.99 EUR/mois</div>
                    <div style="font-size:13px;color:#a0a0c0">Mensuel - Annulable a tout moment</div>
                </div>
                <div style="background:rgba(0,255,136,0.1);border:1px solid #00ff88;border-radius:12px;padding:16px;cursor:pointer;position:relative" onclick="alert('Redirection vers paiement...')">
                    <span style="position:absolute;top:-8px;right:12px;background:linear-gradient(135deg,#00ff88,#00ffff);color:#000;font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px">-40%</span>
                    <div style="font-size:20px;font-weight:700;color:#fff">71.88 EUR/an</div>
                    <div style="font-size:13px;color:#a0a0c0">5.99 EUR/mois - Meilleure offre</div>
                </div>
            </div>
        </div>
    `;
    popup.onclick = (e) => { if (e.target === popup) popup.remove(); };
    document.body.appendChild(popup);
}

// ====== STORIES ======
function renderStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    
    const onlineGirls = allGirls.filter(g => g.online).slice(0, 10);
    
    container.innerHTML = onlineGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        return `
        <div class="story-bubble" onclick="openStory('${girl.id}')" style="animation: fadeIn 0.3s ease ${i * 0.08}s both" data-story-id="${girl.id}">
            <div class="story-avatar" style="background: ${avatarColors[i % avatarColors.length]}">
                ${photoUrl ? `
                    <img src="${photoUrl}" alt="${girl.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
                ` : `
                    <div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>
                `}
                ${girl.online ? '<span class="story-live">LIVE</span>' : ''}
            </div>
            <div class="story-name">${girl.name}</div>
        </div>
    `}).join('');
    
    // Load photos for stories
    onlineGirls.forEach(girl => {
        if (!girlPhotos[girl.id]) loadGirlPhoto(girl.id);
    });
}

function openStory(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (!girl) return;
    
    const viewer = document.getElementById('storyViewer');
    const content = document.getElementById('storyContent');
    const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
    const photoUrl = girlPhotos[girlId];
    
    // Story messages
    const storyMessages = [
        "Je m'ennuie ce soir...",
        "Tu veux qu'on discute?",
        "J'ai envie de nouvelles rencontres",
        "Qui veut me tenir compagnie?",
        "Coucou les garcons...",
        "Je suis d'humeur coquine ce soir",
        "Swipe right si tu me trouves jolie",
        "Venez me parler!"
    ];
    const storyMsg = storyMessages[Math.floor(Math.random() * storyMessages.length)];
    
    content.innerHTML = `
        <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end">
            ${photoUrl ? `
                <img src="${photoUrl}" alt="${girl.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.7)">
            ` : `
                <div style="position:absolute;inset:0;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center">
                    <span style="font-size:150px;font-weight:900;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</span>
                </div>
            `}
            <div style="position:relative;z-index:2;padding:40px;text-align:center;width:100%;background:linear-gradient(transparent, rgba(0,0,0,0.8))">
                <div style="font-size:24px;font-weight:800;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,0.5);margin-bottom:10px">${girl.name}, ${girl.age}</div>
                <div style="color:var(--neon-cyan);font-size:16px;margin-bottom:20px">${girl.origin}</div>
                <div style="font-size:18px;color:#fff;font-style:italic;margin-bottom:30px">"${storyMsg}"</div>
                <button onclick="openChatFromStory('${girlId}')" style="background:var(--gradient-hot);border:none;padding:14px 40px;border-radius:30px;color:#fff;font-weight:700;font-size:16px;cursor:pointer;box-shadow:0 0 20px rgba(255,0,128,0.5)">Envoyer un message</button>
            </div>
        </div>
    `;
    
    viewer.classList.add('active');
    
    const progressBar = document.createElement('div');
    progressBar.className = 'story-progress-bar';
    document.getElementById('storyProgress').innerHTML = '';
    document.getElementById('storyProgress').appendChild(progressBar);
    
    // Auto-close after 8 seconds
    window.storyTimeout = setTimeout(() => closeStory(), 8000);
}

function openChatFromStory(girlId) {
    closeStory();
    const girl = allGirls.find(g => g.id === girlId);
    if (girl) openChat(girl);
}

function closeStory() {
    document.getElementById('storyViewer').classList.remove('active');
}

function prevStory() { closeStory(); }
function nextStory() { closeStory(); }

// ====== HOME DASHBOARD ======
let carouselIndex = 0;
let carouselInterval = null;

function renderHomeDashboard() {
    renderHeroBanner();
    renderStoriesGirlfriend();
    renderLiveGirls();
    renderAllGirlsGrid();
}

// Scroll to top
function scrollToTop() {
    document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

// Featured girls for hero carousel
let featuredGirls = [];

// Render Hero Carousel
function renderHeroBanner() {
    const carousel = document.getElementById('heroCarousel');
    const dotsContainer = document.getElementById('heroDots');
    if (!carousel) return;
    
    // Get popular girls for the carousel
    const popularGirls = allGirls.filter(g => g.popular).slice(0, 5);
    featuredGirls = popularGirls.length > 0 ? popularGirls : allGirls.slice(0, 5);
    
    if (featuredGirls.length === 0) return;
    
    carousel.innerHTML = featuredGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const colorIdx = i % avatarColors.length;
        
        return `
        <div class="hero-slide" onclick="openProfile('${girl.id}')">
            ${photoUrl ? `
                <img src="${photoUrl}" alt="${girl.name}">
            ` : `
                <div class="hero-slide-placeholder" style="background:${avatarColors[colorIdx]}">${girl.name.charAt(0)}</div>
            `}
            <div class="hero-slide-overlay">
                <span class="hero-badge">VIDEO</span>
                <div class="hero-slide-name">${girl.name}</div>
            </div>
            <div class="hero-slide-cta">
                <div class="hero-slide-cta-text">
                    <span>DEBLOQUER</span>
                    <span>SON CONTENU</span>
                    <span class="hero-18">+18</span>
                </div>
                <button class="hero-btn" onclick="event.stopPropagation(); openProfile('${girl.id}')">DEBLOQUER</button>
            </div>
        </div>
    `}).join('');
    
    // Add dots
    if (dotsContainer) {
        dotsContainer.innerHTML = featuredGirls.map((_, i) => `
            <div class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>
        `).join('');
        
        // Update dots on scroll
        carousel.addEventListener('scroll', () => {
            const scrollLeft = carousel.scrollLeft;
            const slideWidth = carousel.querySelector('.hero-slide')?.offsetWidth || 300;
            const activeIndex = Math.round(scrollLeft / (slideWidth + 12));
            dotsContainer.querySelectorAll('.hero-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === activeIndex);
            });
        });
        
        // Click on dot to scroll
        dotsContainer.querySelectorAll('.hero-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                const slideWidth = carousel.querySelector('.hero-slide')?.offsetWidth || 300;
                carousel.scrollTo({ left: index * (slideWidth + 12), behavior: 'smooth' });
            });
        });
    }
}

// Open Ad Link
function openAdLink() {
    navigateTo('tokens');
}

// Render Stories Girlfriend Section
function renderStoriesGirlfriend() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    
    // Get random girls for stories
    const storiesGirls = allGirls.filter(g => g.online || g.popular).slice(0, 15);
    const viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '[]');
    
    container.innerHTML = storiesGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        const hasViewed = viewedStories.includes(girl.id);
        
        return `
        <div class="story-item" onclick="openStory('${girl.id}')">
            <div class="story-ring ${hasViewed ? 'viewed' : 'has-story'}">
                <div class="story-avatar">
                    ${photoUrl ? `
                        <img src="${photoUrl}" alt="${girl.name}">
                    ` : `
                        <div style="width:100%;height:100%;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>
                    `}
                </div>
            </div>
            <span class="story-name">${girl.name}</span>
        </div>
    `}).join('');
}

// Open Story
function openStory(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (!girl) return;
    
    // Mark as viewed
    const viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '[]');
    if (!viewedStories.includes(girlId)) {
        viewedStories.push(girlId);
        localStorage.setItem('viewedStories', JSON.stringify(viewedStories));
    }
    
    // Open profile or chat
    openProfile(girlId);
    
    // Re-render stories to update viewed state
    renderStoriesGirlfriend();
}

// Render Live Girls - "Action en Direct"
function renderLiveGirls() {
    const container = document.getElementById('liveGirls');
    if (!container) return;
    
    // Get online girls or camgirls
    const liveGirls = camgirls.length > 0 ? camgirls.slice(0, 8) : allGirls.filter(g => g.online).slice(0, 8);
    
    container.innerHTML = liveGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const videoUrl = girlVideos[girl.id];
        const colorIdx = i % avatarColors.length;
        
        let mediaContent = '';
        if (videoUrl) {
            mediaContent = `
                <video autoplay loop muted playsinline style="width:100%;height:220px;object-fit:cover">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="video-badge-live">VIDEO</div>
            `;
        } else if (photoUrl) {
            mediaContent = `
                <img src="${photoUrl}" alt="${girl.name}">
                <button class="animate-photo-btn" onclick="event.stopPropagation(); animatePhotoToVideo('${photoUrl}', '${girl.id}')">
                    &#127916; Animer
                </button>
            `;
        } else {
            mediaContent = `<div style="width:100%;height:220px;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:50px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>`;
        }
        
        return `
        <div class="live-girl-card" onclick="openProfile('${girl.id}')">
            <div class="live-indicator-card">EN DIRECT</div>
            <div class="live-girl-icon">&#128140;</div>
            ${mediaContent}
            <div class="live-girl-name">${girl.name} <span>${girl.age}</span></div>
        </div>
    `}).join('');
    
}

// Render All Girls Grid - Candy AI Style
function renderAllGirlsGrid() {
    const container = document.getElementById('allGirlsGrid');
    if (!container) return;
    
    // Get a mix of girls
    const gridGirls = allGirls.slice(0, 12);
    
    container.innerHTML = gridGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const videoUrl = girlVideos[girl.id];
        const colorIdx = i % avatarColors.length;
        const hasV2 = Math.random() > 0.5;
        
        let mediaContent = '';
        if (videoUrl) {
            mediaContent = `
                <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="video-badge-grid">VIDEO</div>
            `;
        } else if (photoUrl) {
            mediaContent = `<img src="${photoUrl}" alt="${girl.name}">`;
        } else {
            mediaContent = `<div style="width:100%;height:100%;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:50px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>`;
        }
        
        return `
        <div class="girl-card-candy" onclick="openProfile('${girl.id}')">
            ${hasV2 ? '<div class="v2-badge">&#127912; V2</div>' : ''}
            ${girl.is_camgirl ? '<div class="live-badge-grid">LIVE</div>' : ''}
            ${mediaContent}
            <div class="card-name">${girl.name}</div>
        </div>
    `}).join('');
    
}

// Feed likes storage
let feedLikes = JSON.parse(localStorage.getItem('feedLikes') || '{}');

// Render Feed - Instagram/TikTok Style
function renderFeed() {
    const container = document.getElementById('feedContainer');
    const progressContainer = document.getElementById('feedProgress');
    if (!container) return;
    
    // Shuffle and get girls for feed
    const feedGirls = [...allGirls].sort(() => Math.random() - 0.5).slice(0, 20);
    
    container.innerHTML = feedGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const videoUrl = girlVideos[girl.id];
        const colorIdx = i % avatarColors.length;
        const likes = feedLikes[girl.id] || Math.floor(Math.random() * 900) + 100;
        const isLiked = feedLikes[girl.id + '_liked'];
        
        // Build media content - video takes priority for fullscreen feed
        let mediaContent = '';
        if (videoUrl) {
            mediaContent = `
                <video autoplay loop muted playsinline class="feed-slide-video">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="feed-video-badge">VIDEO</div>
            `;
        } else if (photoUrl) {
            mediaContent = `<img src="${photoUrl}" alt="${girl.name}" class="feed-slide-photo">`;
        } else {
            mediaContent = `<div class="feed-slide-placeholder" style="background:${avatarColors[colorIdx]}">${girl.name.charAt(0)}</div>`;
        }
        
        return `
        <div class="feed-slide" data-girl-id="${girl.id}">
            ${mediaContent}
            ${girl.is_camgirl ? '<div class="feed-live-badge">LIVE</div>' : ''}
            <div class="feed-slide-overlay">
                <div class="feed-slide-info">
                    ${photoUrl ? `
                        <img src="${photoUrl}" alt="${girl.name}" class="feed-slide-avatar">
                    ` : `
                        <div class="feed-slide-avatar-placeholder" style="background:${avatarColors[colorIdx]}">${girl.name.charAt(0)}</div>
                    `}
                    <span class="feed-slide-name">${girl.name}</span>
                    <button class="feed-slide-chat-btn" onclick="event.stopPropagation(); openProfile('${girl.id}')">Discuter maintenant</button>
                </div>
            </div>
            <div class="feed-slide-actions">
                <button class="feed-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleFeedLike('${girl.id}')">
                    <span class="icon">&#9829;</span>
                    <span class="count" id="likes-${girl.id}">${likes}</span>
                </button>
            </div>
        </div>
    `}).join('');
    
    // Add progress dots
    if (progressContainer) {
        progressContainer.innerHTML = feedGirls.slice(0, 10).map((_, i) => `
            <div class="feed-progress-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>
        `).join('');
    }
    
    // Update progress on scroll
    container.addEventListener('scroll', updateFeedProgress);
    
}

function updateFeedProgress() {
    const container = document.getElementById('feedContainer');
    const dots = document.querySelectorAll('.feed-progress-dot');
    if (!container || !dots.length) return;
    
    const scrollTop = container.scrollTop;
    const slideHeight = window.innerHeight;
    const activeIndex = Math.round(scrollTop / slideHeight);
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
    });
}

function toggleFeedLike(girlId) {
    const isLiked = feedLikes[girlId + '_liked'];
    const countEl = document.getElementById('likes-' + girlId);
    const btn = countEl?.closest('.feed-action-btn');
    
    if (isLiked) {
        feedLikes[girlId] = (feedLikes[girlId] || 100) - 1;
        feedLikes[girlId + '_liked'] = false;
        btn?.classList.remove('liked');
    } else {
        feedLikes[girlId] = (feedLikes[girlId] || 100) + 1;
        feedLikes[girlId + '_liked'] = true;
        btn?.classList.add('liked');
    }
    
    if (countEl) countEl.textContent = feedLikes[girlId];
    localStorage.setItem('feedLikes', JSON.stringify(feedLikes));
}

function renderOnlineGirls() {
    const container = document.getElementById('onlineGirls');
    const countEl = document.getElementById('onlineCount');
    if (!container) return;
    
    const online = allGirls.filter(g => g.online);
    if (countEl) countEl.textContent = `${online.length} en ligne`;
    
    renderGirlsScroll(container, online.slice(0, 12), true);
}

function renderNewGirls() {
    const container = document.getElementById('newGirls');
    if (!container) return;
    
    const newGirls = allGirls.filter(g => g.is_new).slice(0, 10);
    renderGirlsScroll(container, newGirls, false, true);
}

function renderPopularGirls() {
    const container = document.getElementById('popularGirls');
    if (!container) return;
    
    const popular = allGirls.filter(g => g.popular).slice(0, 8);
    
    container.innerHTML = popular.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        
        return `
        <div class="girl-card-sm" onclick="openProfile('${girl.id}')">
            <div class="girl-card-sm-img">
                ${photoUrl ? `
                    <img src="${photoUrl}" alt="${girl.name}">
                ` : `
                    <div style="width:100%;height:100%;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>
                `}
                ${girl.online ? '<div class="online-dot"></div>' : ''}
            </div>
            <div class="girl-card-sm-info">
                <div class="girl-card-sm-name">${girl.name}, ${girl.age}</div>
                <div class="girl-card-sm-details">${girl.type || girl.origin}</div>
            </div>
        </div>
    `}).join('');
    
    // Load photos
    popular.forEach(girl => {
        if (!girlPhotos[girl.id]) loadGirlPhoto(girl.id);
    });
}

function renderGirlsScroll(container, girls, showOnline = false, showNew = false) {
    container.innerHTML = girls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        
        return `
        <div class="girl-card-sm" onclick="openProfile('${girl.id}')">
            <div class="girl-card-sm-img">
                ${photoUrl ? `
                    <img src="${photoUrl}" alt="${girl.name}">
                ` : `
                    <div style="width:100%;height:100%;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>
                `}
                ${showOnline && girl.online ? '<div class="online-dot"></div>' : ''}
                ${showNew && girl.is_new ? '<span class="new-badge">NEW</span>' : ''}
            </div>
            <div class="girl-card-sm-info">
                <div class="girl-card-sm-name">${girl.name}, ${girl.age}</div>
                <div class="girl-card-sm-details">${girl.type || girl.origin}</div>
            </div>
        </div>
    `}).join('');
    
    // Load photos
    girls.forEach(girl => {
        if (!girlPhotos[girl.id]) loadGirlPhoto(girl.id);
    });
}

// ====== CAMGIRLS GRID ======
function initFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderCamgirls();
        });
    });
}

function renderCamgirls() {
    const grid = document.getElementById('camgirlsGrid');
    if (!grid) return;
    
    // Use camgirls for the Camgirls page
    let girls = currentPage === 'camgirls' ? [...camgirls] : [...allGirls];
    
    // If no camgirls, show all girls marked as online
    if (girls.length === 0) {
        girls = allGirls.filter(g => g.online).slice(0, 12);
    }
    
    switch (currentFilter) {
        case 'online': girls = girls.filter(g => g.online); break;
        case 'popular': girls = girls.filter(g => g.popular); break;
        case 'new': girls = girls.filter(g => g.is_new); break;
    }
    
    // Limit to 20 for performance
    girls = girls.slice(0, 20);
    
    grid.innerHTML = girls.map((girl, i) => {
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        const photoUrl = girlPhotos[girl.id];
        return `
        <div class="camgirl-card" onclick="openProfile('${girl.id}')" style="animation: scaleIn 0.4s ease ${i * 0.04}s both" data-girl-id="${girl.id}">
            ${photoUrl ? `
                <img src="${photoUrl}" alt="${girl.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : i % avatarColors.length]};display:none;align-items:center;justify-content:center;position:absolute;top:0;left:0">
                    <span style="font-size:60px;font-weight:900;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</span>
                </div>
            ` : `
                <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : i % avatarColors.length]};display:flex;align-items:center;justify-content:center">
                    <span style="font-size:60px;font-weight:900;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</span>
                </div>
            `}
            ${girl.online ? `
                <div class="camgirl-status">
                    <span class="status-dot"></span>
                    En ligne
                </div>
            ` : ''}
            <div class="camgirl-overlay">
                <div class="camgirl-name">${girl.name}</div>
                <div class="camgirl-info">${girl.name}, ${girl.age}</div>
                <div class="camgirl-info">${girl.origin} - ${girl.type || girl.tagline || ''}</div>
            </div>
        </div>
    `}).join('');
    
    // Load photos for visible cards
    girls.forEach(girl => {
        if (!girlPhotos[girl.id]) {
            loadGirlPhoto(girl.id);
        }
    });
}

// ====== PHOTO LOADING ======
async function loadGirlPhoto(girlId) {
    if (loadingPhotos.has(girlId) || girlPhotos[girlId]) return;
    loadingPhotos.add(girlId);
    
    try {
        // Try to get stored photos first
        const storedRes = await fetch(`/api/stored_photos/${girlId}`);
        if (storedRes.ok) {
            const storedData = await storedRes.json();
            // Handle both array and object formats
            let photoUrl = null;
            if (Array.isArray(storedData.photos) && storedData.photos.length > 0) {
                photoUrl = storedData.photos[0];
            } else if (storedData.photos && typeof storedData.photos === 'object') {
                // Object format {type: url}
                photoUrl = Object.values(storedData.photos)[0];
            }
            
            if (photoUrl) {
                girlPhotos[girlId] = photoUrl;
                updateGirlCardPhoto(girlId, photoUrl);
                loadingPhotos.delete(girlId);
                return;
            }
        }
        
        // Try camgirl photo endpoint
        const camRes = await fetch(`/api/camgirl_photo/${girlId}`);
        if (camRes.ok) {
            const camData = await camRes.json();
            if (camData.image_url) {
                girlPhotos[girlId] = camData.image_url;
                updateGirlCardPhoto(girlId, camData.image_url);
                loadingPhotos.delete(girlId);
                return;
            }
        }
        
        // Try to generate a new photo
        const genRes = await fetch(`/api/generate_photo/${girlId}`);
        if (genRes.ok) {
            const genData = await genRes.json();
            if (genData.image_url) {
                girlPhotos[girlId] = genData.image_url;
                updateGirlCardPhoto(girlId, genData.image_url);
            }
        }
    } catch (err) {
        console.log('Photo loading failed for', girlId);
    }
    
    loadingPhotos.delete(girlId);
}

function updateGirlCardPhoto(girlId, photoUrl) {
    const card = document.querySelector(`[data-girl-id="${girlId}"]`);
    if (card) {
        const existingImg = card.querySelector('img');
        if (existingImg) {
            existingImg.src = photoUrl;
        } else {
            const placeholder = card.querySelector('div:first-child');
            if (placeholder) {
                const img = document.createElement('img');
                img.src = photoUrl;
                img.alt = '';
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0';
                img.onerror = () => img.remove();
                card.insertBefore(img, placeholder);
            }
        }
    }
}

// ====== PROFILE ======
function openProfile(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (!girl) return;
    
    currentGirl = girl;
    window.currentGirlId = girl.id;
    const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
    const photoUrl = girlPhotos[girlId];
    const videoUrl = girlVideos[girlId];
    
    // Build carousel with all available media
    profileCarouselMedia = [];
    profileCurrentSlide = 0;
    
    if (videoUrl) profileCarouselMedia.push({type: 'video', url: videoUrl});
    if (photoUrl) profileCarouselMedia.push({type: 'photo', url: photoUrl});
    
    // Load additional photos for ALL profiles
    loadProfileCarouselPhotos(girlId);
    
    // Render carousel or fallback
    if (profileCarouselMedia.length > 0) {
        renderProfileCarousel();
    } else {
        document.getElementById('profileCarouselContainer').innerHTML = `
            <div class="carousel-slide" style="background:${avatarColors[colorIdx >= 0 ? colorIdx : 0]};display:flex;align-items:center;justify-content:center">
                <span style="font-size:200px;font-weight:900;color:rgba(0,0,0,0.1)">${girl.name.charAt(0)}</span>
            </div>
        `;
        document.getElementById('profileCarouselDots').innerHTML = '';
        loadGirlPhoto(girlId);
    }
    
    // Load video if not already loaded
    if (!videoUrl) loadGirlVideo(girlId);
    
    // Candy AI style profile info
    document.getElementById('profileName').textContent = `${girl.name}, ${girl.age}`;
    document.getElementById('profileNameOverlay').textContent = girl.name;
    const miniAvatar = document.getElementById('profileMiniAvatar');
    const avatarUrl = girlPhotos[girlId] || girl.portrait || girl.photoUrl || '';
    if (miniAvatar) miniAvatar.src = avatarUrl;
    
    const personality = (girl.type || girl.tagline || '').toLowerCase();
    const origin = girl.origin || girl.location || '';
    const defaultBio = personality && origin 
        ? `Je suis ${girl.name}, ${girl.age} ans. ${origin.charAt(0).toUpperCase() + origin.slice(1)}, ${personality}. J'adore faire de nouvelles rencontres et partager des moments intimes avec toi...`
        : `Je suis ${girl.name}, ${girl.age} ans. J'adore faire de nouvelles rencontres et partager des moments intimes avec toi...`;
    document.getElementById('profileBio').textContent = girl.bio || defaultBio;
    
    // Fill Candy AI stats
    const statAge = document.getElementById('statAge');
    const statBody = document.getElementById('statBody');
    const statOrigin = document.getElementById('statOrigin');
    const statRelation = document.getElementById('statRelation');
    const statProfession = document.getElementById('statProfession');
    
    if (statAge) statAge.textContent = girl.age;
    if (statBody) statBody.textContent = girl.body_type || 'Mince';
    if (statOrigin) statOrigin.textContent = origin || 'France';
    if (statRelation) statRelation.textContent = girl.relationship || 'Celibataire';
    if (statProfession) statProfession.textContent = girl.profession || 'Etudiante';
    
    // Tags
    const tags = [girl.type || girl.tagline];
    if (girl.online) tags.push('En ligne');
    if (girl.is_camgirl) tags.push('Camgirl');
    
    document.getElementById('profileTags').innerHTML = tags.filter(Boolean).map(t => `<span class="candy-tag">${t}</span>`).join('');
    
    // Check if favorite
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const favBtn = document.querySelector('.candy-fav');
    if (favBtn) favBtn.classList.toggle('active', favs.includes(girl.id));
    
    // Reset to profile tab
    showProfileTab();
    
    // Load XP progression
    loadGirlXP(girl.id);
    
    document.getElementById('camgirlProfile').classList.add('active');
}

async function renderProfileMedia(girl) {
    const photosGrid = document.getElementById('profilePhotos');
    const videosGrid = document.getElementById('profileVideos');
    const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
    
    // Try to load girl's actual photos
    let photos = [];
    let videos = [];
    
    // For camgirls, fetch their data
    if (girl.is_camgirl) {
        try {
            const res = await fetch(`/api/camgirl_photo/${girl.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.all_photos) photos = data.all_photos;
                else if (data.image_url) photos = [data.image_url];
            }
            
            // Get videos from database
            const vidRes = await fetch(`/api/profile_videos_all/${girl.id}`);
            if (vidRes.ok) {
                const vidData = await vidRes.json();
                if (vidData.videos && vidData.videos.length > 0) {
                    videos = vidData.videos;
                }
            }
            
            // Fallback to camgirl data
            if (videos.length === 0) {
                const cam = camgirls.find(c => c.id === girl.id || c.girl_id === girl.id);
                if (cam && cam.videos) videos = cam.videos;
            }
        } catch (e) { console.log('Error loading camgirl media:', e); }
    } else {
        // For regular girls, try stored photos
        try {
            const res = await fetch(`/api/stored_photos/${girl.id}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.photos)) photos = data.photos;
            }
        } catch (e) {}
    }
    
    // Render photos
    if (photos.length > 0) {
        photosGrid.innerHTML = photos.slice(0, 8).map((photo, i) => `
            <div class="media-item ${i < 2 ? 'free' : ''}" onclick="${i < 2 ? `viewPhoto('${photo}')` : `showUnlock(50, 'photo')`}">
                <img src="${photo}" alt="Photo ${i+1}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
                ${i >= 2 ? `
                    <div class="media-locked">
                        <span class="lock-icon">🔒</span>
                        <span class="token-cost">50</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } else {
        photosGrid.innerHTML = [1,2,3,4].map((n, i) => `
            <div class="media-item ${i < 2 ? 'free' : ''}" onclick="${i < 2 ? `requestPhoto()` : `showUnlock(50, 'photo')`}">
                <div style="width:100%;height:100%;background:${avatarColors[(colorIdx + n) % avatarColors.length]};display:flex;align-items:center;justify-content:center">
                    <span style="font-size:30px;font-weight:800;color:rgba(0,0,0,0.3)">${girl.name.charAt(0)}</span>
                </div>
                ${i >= 2 ? `
                    <div class="media-locked">
                        <span class="lock-icon">🔒</span>
                        <span class="token-cost">50</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    // Render videos
    if (videos.length > 0) {
        videosGrid.innerHTML = videos.slice(0, 6).map((video, i) => {
            const videoUrl = typeof video === 'string' ? video : (video.video_url || video.url);
            const title = video.title || `Video ${i+1}`;
            const tokens = video.tokens || 100;
            const isFree = i < 1;
            
            return `
            <div class="media-item video-item ${isFree ? 'free' : ''}" onclick="${isFree ? `playVideo('${videoUrl}')` : `showUnlock(${tokens}, 'video')`}">
                <div style="width:100%;height:100%;background:linear-gradient(135deg, #ff0080, #bf00ff);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative">
                    <span style="font-size:40px">▶️</span>
                    <span style="font-size:12px;color:#fff;margin-top:8px">${title}</span>
                </div>
                ${!isFree ? `
                    <div class="media-locked">
                        <span class="lock-icon">🔒</span>
                        <span class="token-cost">${tokens}</span>
                    </div>
                ` : ''}
            </div>
        `}).join('');
    } else {
        videosGrid.innerHTML = [1,2,3,4].map((n, i) => `
            <div class="media-item ${i < 1 ? 'free' : ''}" onclick="${i < 1 ? `requestVideo()` : `showUnlock(100, 'video')`}">
                <div style="width:100%;height:100%;background:${avatarColors[(colorIdx + n + 2) % avatarColors.length]};display:flex;align-items:center;justify-content:center;position:relative">
                    <span style="font-size:30px;font-weight:800;color:rgba(0,0,0,0.3)">▶️</span>
                </div>
                ${i >= 1 ? `
                    <div class="media-locked">
                        <span class="lock-icon">🔒</span>
                        <span class="token-cost">100</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
}

function viewPhoto(url) {
    // Open photo in a modal
    const modal = document.createElement('div');
    modal.id = 'photoModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer';
    modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

function playVideo(url) {
    if (!url) {
        showToast('Video non disponible');
        return;
    }
    // Open video in a modal
    const modal = document.createElement('div');
    modal.id = 'videoModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer';
    modal.innerHTML = `
        <div onclick="event.stopPropagation()" style="position:relative">
            <video src="${url}" controls autoplay style="max-width:90vw;max-height:80vh;border-radius:8px"></video>
            <button onclick="document.getElementById('videoModal').remove()" style="position:absolute;top:-40px;right:0;background:none;border:none;color:#fff;font-size:30px;cursor:pointer">×</button>
        </div>
    `;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

function closeProfile() {
    goToHome();
}

function viewMedia(girlId, type, num) {
    const girl = allGirls.find(g => g.id === girlId);
    showToast(`${type === 'photo' ? 'Photo' : 'Video'} ${num} de ${girl?.name || 'Inconnue'}`);
}

// ====== CHAT ======
function openProfileChat() {
    if (!currentGirl) return;
    // Focus sur le chat overlay au lieu d'ouvrir l'ancien chat
    const input = document.getElementById('photoChatInput');
    if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth' });
    }
}

async function openChat(girl) {
    currentGirl = girl;
    window.currentGirlId = girl.id;
    const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
    
    const avatarEl = document.getElementById('chatAvatar');
    avatarEl.textContent = girl.name.charAt(0);
    avatarEl.style.background = avatarColors[colorIdx >= 0 ? colorIdx : 0];
    document.getElementById('chatUserName').textContent = girl.name;
    
    // Show XP bubble (Candy AI style)
    if (typeof showXpBubble === 'function') {
        showXpBubble();
        console.log('[XP] Bubble shown for girl:', girl.id);
    }
    
    // Load XP from server for XP bubble
    try {
        const xpRes = await fetch(`/api/action/progress/${girl.id}`, {credentials: 'same-origin'});
        if (xpRes.ok) {
            const xpData = await xpRes.json();
            currentXPLevel = xpData.level || 1;
            currentXP = xpData.xp_in_level || 0;
            const maxXp = xpData.xp_for_next || 35;
            console.log('[XP] Loaded from server:', currentXPLevel, currentXP, '/', maxXp);
            // Update Candy AI style bubble
            if (typeof updateXpBubble === 'function') {
                updateXpBubble(currentXPLevel, currentXP, maxXp);
            }
        }
    } catch (e) {
        console.log('Failed to load XP from server:', e);
        loadGirlXP(girl.id);
    }
    
    // Load chat from server first
    let serverMessages = [];
    try {
        const res = await fetch(`/api/chat_history/${girl.id}`);
        if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
                serverMessages = data.messages;
            }
        }
    } catch (e) {
        console.log('Failed to load chat from server');
    }
    
    // Use server messages if available, otherwise localStorage, otherwise default
    if (serverMessages.length > 0) {
        chatMessages = serverMessages;
        localStorage.setItem(`chat_${girl.id}`, JSON.stringify(chatMessages));
    } else {
        const savedMessages = localStorage.getItem(`chat_${girl.id}`);
        if (savedMessages) {
            chatMessages = JSON.parse(savedMessages);
        } else {
            chatMessages = [
                { sender: 'her', text: `Salut! Je suis ${girl.name}... Ravie de te rencontrer`, time: 'Maintenant' }
            ];
        }
    }
    
    renderChatMessages();
    document.getElementById('chatPanel').classList.add('active');
}

function closeChat() {
    document.getElementById('chatPanel').classList.remove('active');
    
    // Hide XP bubble (Candy AI style)
    if (typeof hideXpBubble === 'function') {
        hideXpBubble();
    }
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = chatMessages.map(msg => {
        let content = '';
        if (msg.loading) {
            content = `<div class="message-bubble loading-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>`;
        } else if (msg.image) {
            content = `<div class="message-bubble photo-bubble">
                <img src="${msg.image}" class="chat-photo" onclick="openFullPhoto('${msg.image}')" alt="Photo">
                ${msg.text ? `<div class="photo-caption">${msg.text}</div>` : ''}
            </div>`;
        } else {
            content = `<div class="message-bubble">${msg.text}</div>`;
        }
        return `
            <div class="message ${msg.sender === 'me' ? 'me' : 'her'}">
                ${content}
                <div class="message-time">${msg.time}</div>
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function openFullPhoto(url) {
    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    overlay.innerHTML = `
        <div class="photo-full-container" onclick="this.parentElement.remove()">
            <img src="${url}" class="photo-full">
            <button class="photo-close">x</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function initChatInput() {
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !currentGirl) return;
    
    chatMessages.push({ sender: 'me', text, time: 'Maintenant' });
    renderChatMessages();
    input.value = '';
    
    localStorage.setItem(`chat_${currentGirl.id}`, JSON.stringify(chatMessages));
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get affection for this girl
    const match = userMatches.find(m => m.girl_id === currentGirl.id);
    const affection = match?.affection || 20;
    
    // Build messages history for context
    const messagesHistory = chatMessages.slice(-10).map(m => ({
        role: m.sender === 'me' ? 'user' : 'assistant',
        content: m.text
    }));
    
    console.log('[CHAT DEBUG] chatMessages length:', chatMessages.length);
    console.log('[CHAT DEBUG] messagesHistory:', messagesHistory);
    
    // Try main chat endpoint (works for all profiles)
    try {
        console.log('Sending chat to:', currentGirl.id, 'affection:', affection, 'messages:', messagesHistory.length);
        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ 
                girl: currentGirl.id,
                messages: messagesHistory,
                affection: affection
            })
        });
        
        hideTypingIndicator();
        
        if (res.ok) {
            const data = await res.json();
            console.log('Chat response:', data);
            
            if (data.reply) {
                chatMessages.push({ sender: 'her', text: data.reply, time: 'Maintenant' });
                renderChatMessages();
                localStorage.setItem(`chat_${currentGirl.id}`, JSON.stringify(chatMessages));
                playSound('message');
                
                // Sync affection from server if provided
                if (data.new_affection) {
                    const matchIndex = userMatches.findIndex(m => m.girl_id === currentGirl.id);
                    if (matchIndex >= 0) {
                        userMatches[matchIndex].affection = data.new_affection;
                        localStorage.setItem('userMatches', JSON.stringify(userMatches));
                        console.log('[AFFECTION] Updated to:', data.new_affection);
                    }
                }
                
                // Add XP based on conversation quality
                const xpGain = calculateXPGain(text, data.reply);
                if (xpGain > 0) addXP(xpGain);
                
                // Handle smart_photo - generate photo if detected
                if (data.smart_photo) {
                    console.log('Smart photo detected:', data.smart_photo);
                    await generateSmartPhoto(currentGirl.id, data.smart_photo, affection);
                }
                return;
            }
        }
    } catch (err) {
        console.log('Chat API error:', err);
        hideTypingIndicator();
    }
    
    // Fallback to camgirl chat for camgirls
    if (currentGirl.is_camgirl) {
        try {
            const res = await fetch('/api/camgirl_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ girl_id: currentGirl.id, message: text })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.response) {
                    chatMessages.push({ sender: 'her', text: data.response, time: 'Maintenant' });
                    renderChatMessages();
                    localStorage.setItem(`chat_${currentGirl.id}`, JSON.stringify(chatMessages));
                    playSound('message');
                    return;
                }
            }
        } catch (e) { console.log('Camgirl chat fallback error:', e); }
    }
    
    // Final fallback responses
    setTimeout(() => {
        const girl = currentGirl;
        const isCamgirl = girl?.is_camgirl;
        
        const responses = isCamgirl ? [
            `Mmm bebe... j'adore quand tu me parles comme ca`,
            `Tu me fais mouiller la... continue`,
            `Envoie des tokens et je te montre tout`,
            `Tu veux me voir nue? Ca coute des tokens cheri`,
            `Hmm tu es coquin toi... j'aime ca`,
            `Je suis toute chaude pour toi la`,
            `Tu veux un show prive? Envoie des tokens`,
            `Mmm continue a me parler comme ca bebe`
        ] : [
            `Mmm... j'aime quand tu me parles comme ca`,
            `Tu es trop mignon! Continue...`,
            `Oh oui... ca me plait beaucoup`,
            `Je pense a toi aussi...`,
            `Tu veux qu'on se voit?`,
            `J'adore nos conversations...`,
            `Hehe tu me fais rougir...`,
            `Continue comme ca...`,
            `Tu me plais beaucoup tu sais`,
            `J'ai hate de te connaitre mieux`
        ];
        const reply = responses[Math.floor(Math.random() * responses.length)];
        chatMessages.push({ sender: 'her', text: reply, time: 'Maintenant' });
        renderChatMessages();
        localStorage.setItem(`chat_${currentGirl.id}`, JSON.stringify(chatMessages));
    }, 1200);
}

// Generate photo from smart_photo prompt
async function generateSmartPhoto(girlId, prompt, affection) {
    const PHOTO_COST = 20;
    
    // Check tokens first (but don't deduct yet)
    if (userTokens < PHOTO_COST) {
        showToast('Pas assez de tokens pour generer une photo!');
        chatMessages.push({ sender: 'her', text: 'Tu veux une photo? Il te faut des tokens pour ca...', time: 'Maintenant' });
        renderChatMessages();
        return;
    }
    
    showToast('Generation de photo en cours...');
    
    // Add loading message
    chatMessages.push({ sender: 'her', text: 'Je t\'envoie une photo...', time: 'Maintenant', loading: true });
    renderChatMessages();
    
    try {
        // Call photo generation endpoint
        const res = await fetch('/photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl: girlId,
                description: prompt,
                affection: affection
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log('Photo generated:', data);
            
            if (data.image_url) {
                // SUCCESS - Now deduct tokens
                await deductTokens(PHOTO_COST, 'photo_success');
                
                // Remove loading message and add photo
                chatMessages = chatMessages.filter(m => !m.loading);
                chatMessages.push({ 
                    sender: 'her', 
                    text: '', 
                    image: data.image_url,
                    time: 'Maintenant' 
                });
                renderChatMessages();
                localStorage.setItem(`chat_${girlId}`, JSON.stringify(chatMessages));
                playSound('message');
                showToast('Photo recue! (-20 tokens)');
            } else {
                // FAILED - No tokens deducted
                chatMessages = chatMessages.filter(m => !m.loading);
                chatMessages.push({ sender: 'her', text: 'Oups, la photo n\'a pas marche... reessaie!', time: 'Maintenant' });
                renderChatMessages();
                showToast('Generation echouee - aucun token deduit');
            }
        } else {
            // FAILED - No tokens deducted
            chatMessages = chatMessages.filter(m => !m.loading);
            chatMessages.push({ sender: 'her', text: 'Desolee, erreur serveur...', time: 'Maintenant' });
            renderChatMessages();
            showToast('Erreur serveur - aucun token deduit');
        }
    } catch (err) {
        console.error('Photo generation error:', err);
        // FAILED - No tokens deducted
        chatMessages = chatMessages.filter(m => !m.loading);
        chatMessages.push({ sender: 'her', text: 'Desolee, j\'ai pas pu t\'envoyer la photo...', time: 'Maintenant' });
        renderChatMessages();
        showToast('Erreur - aucun token deduit');
    }
}

function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const typing = document.createElement('div');
    typing.className = 'message her typing-indicator';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
        <div class="message-bubble" style="display:flex;gap:4px;padding:12px 16px">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function startVoice() {
    showToast('Chat vocal - Bientot disponible!');
}

function startAudioCall() {
    showToast('Appel audio - Bientot disponible!');
}

// ====== CONVERSATIONS ======
function renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    // Get conversations from matches or create demo
    let convs = userConversations.length > 0 ? userConversations : [];
    
    // Add some demo conversations from matches
    if (convs.length === 0 && userMatches.length > 0) {
        convs = userMatches.slice(0, 5).map(m => ({
            id: m.id,
            name: m.name,
            lastMessage: 'Tu me manques...',
            time: getRandomTime(),
            unread: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0
        }));
    }
    
    // Fallback demo with random girls
    if (convs.length === 0) {
        const demoGirls = allGirls.filter(g => g.online).slice(0, 6);
        const messages = [
            "J'espere que cela vous pl...",
            "J'ai remarque que vous m...",
            "Salee ? Mon cher Hyyyy, tu...",
            "He bouffon, faut qu'on par...",
            "Salut ! Tu ne devrais pas e...",
            "On se retrouve ce soir?"
        ];
        convs = demoGirls.map((g, i) => ({
            id: g.id,
            name: g.name,
            lastMessage: messages[i] || 'Salut!',
            time: getRandomTime(),
            unread: i === 0 ? 1 : 0
        }));
    }
    
    container.innerHTML = convs.map((conv, i) => {
        const girl = allGirls.find(g => g.id === conv.id || g.name === conv.name);
        const photoUrl = girl ? girlPhotos[girl.id] : null;
        const colorIdx = girl ? allGirls.indexOf(girl) % avatarColors.length : i % avatarColors.length;
        
        return `
        <div class="conversation-item ${conv.unread > 0 ? 'active' : ''}" style="animation: slideIn 0.3s ease ${i * 0.05}s both">
            <div class="conv-avatar-wrap" onclick="openConversation('${conv.id}')">
                ${photoUrl ? `
                    <img class="conv-avatar" src="${photoUrl}" alt="${conv.name}">
                ` : `
                    <div class="conv-avatar" style="background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#000">${conv.name.charAt(0)}</div>
                `}
            </div>
            <div class="conv-info" onclick="openConversation('${conv.id}')">
                <div class="conv-name">${conv.name}</div>
                <div class="conv-preview">${conv.lastMessage}</div>
            </div>
            <div class="conv-meta">
                <div class="conv-time">${conv.time}</div>
                <div class="conv-actions">
                    <button class="conv-action-btn refresh" onclick="event.stopPropagation(); refreshConversation('${conv.id}')" title="Rafraichir">&#8635;</button>
                    <button class="conv-action-btn delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="Supprimer">&#128465;</button>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Load photos for conversations
    convs.forEach(conv => {
        const girl = allGirls.find(g => g.id === conv.id);
        if (girl && !girlPhotos[girl.id]) {
            loadGirlPhoto(girl.id);
        }
    });
}

function getRandomTime() {
    const times = ['6:43PM', '11:32PM', '3:36AM', '9:45AM', '9:44AM', '2:15PM', '8:20PM', '5:10AM'];
    return times[Math.floor(Math.random() * times.length)];
}

function refreshConversation(convId) {
    showToast('Conversation rafraichie');
}

function deleteConversation(convId) {
    if (confirm('Supprimer cette conversation ?')) {
        userConversations = userConversations.filter(c => c.id !== convId);
        renderConversations();
        showToast('Conversation supprimee');
    }
}

function openConversation(convId) {
    const girl = allGirls.find(g => g.id === convId);
    if (girl) openChat(girl);
}

// ====== MATCHES ======
function renderMatches() {
    const container = document.getElementById('matchesGrid');
    if (!container) return;
    
    // Load saved matches or use first few girls as demo
    let matches = userMatches.length > 0 ? userMatches : allGirls.slice(0, 8);
    
    container.innerHTML = matches.map((match, i) => {
        const girl = typeof match === 'string' ? allGirls.find(g => g.id === match) : (allGirls.find(g => g.id === match.id) || match);
        if (!girl) return '';
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        const photoUrl = girlPhotos[girl.id];
        return `
        <div class="match-card" onclick="openMatchProfile('${girl.id}')" style="animation: scaleIn 0.3s ease ${i * 0.04}s both" data-girl-id="${girl.id}">
            ${photoUrl ? `
                <img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : i % avatarColors.length]};display:none;align-items:center;justify-content:center;position:absolute;top:0;left:0">
                    <span style="font-size:40px;font-weight:900;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</span>
                </div>
            ` : `
                <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : i % avatarColors.length]};display:flex;align-items:center;justify-content:center">
                    <span style="font-size:40px;font-weight:900;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</span>
                </div>
            `}
            <div class="match-card-name">${girl.name}, ${girl.age}</div>
        </div>
    `}).join('');
    
    // Load photos for matches
    matches.forEach(match => {
        const girl = typeof match === 'string' ? allGirls.find(g => g.id === match) : (allGirls.find(g => g.id === match.id) || match);
        if (girl && !girlPhotos[girl.id]) loadGirlPhoto(girl.id);
    });
}

function openMatchProfile(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (girl) openProfile(girlId);
}

// ====== COLLECTION / GALLERY ======
let userFavorites = [];
let userPhotos = [];
let userVideos = [];

function renderGallery() {
    renderCollectionPhotos();
    renderCollectionFavorites();
    updateCollectionCounts();
}

function switchCollectionTab(tab) {
    document.querySelectorAll('.collection-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.collection-tab[data-tab="${tab}"]`)?.classList.add('active');
    
    document.querySelectorAll('.collection-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1))?.classList.add('active');
}

function renderCollectionPhotos() {
    const container = document.getElementById('galleryGrid');
    const emptyEl = document.getElementById('photosEmpty');
    if (!container) return;
    
    // Get photos from girlPhotos object
    const photos = Object.entries(girlPhotos).filter(([id, url]) => url && url.startsWith('http'));
    
    if (photos.length === 0) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    
    container.innerHTML = photos.map(([girlId, url], i) => {
        const girl = allGirls.find(g => g.id === girlId);
        return `
        <div class="gallery-item" style="animation: scaleIn 0.3s ease ${i * 0.02}s both" onclick="viewPhoto('${url}', '${girl?.name || ''}')">
            <img src="${url}" alt="${girl?.name || 'Photo'}" loading="lazy">
        </div>
    `}).join('');
}

function renderCollectionFavorites() {
    const container = document.getElementById('favoritesGrid');
    const emptyEl = document.getElementById('favoritesEmpty');
    if (!container) return;
    
    // Load favorites from localStorage
    const saved = localStorage.getItem('dreamFavorites');
    if (saved) userFavorites = JSON.parse(saved);
    
    const favorites = allGirls.filter(g => userFavorites.includes(g.id));
    
    if (favorites.length === 0) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    
    container.innerHTML = favorites.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        
        return `
        <div class="discover-card" onclick="openProfile('${girl.id}')" style="animation: fadeIn 0.3s ease ${i * 0.05}s both">
            <div class="discover-card-img">
                ${photoUrl ? `<img src="${photoUrl}" alt="${girl.name}">` : `
                    <div style="width:100%;height:100%;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</div>
                `}
                <button class="remove-fav-btn" onclick="event.stopPropagation(); removeFavorite('${girl.id}')">X</button>
            </div>
            <div class="discover-card-info">
                <div class="discover-card-name">${girl.name}, ${girl.age}</div>
                <div class="discover-card-details">${girl.origin}</div>
            </div>
        </div>
    `}).join('');
}

function updateCollectionCounts() {
    const photosCount = Object.values(girlPhotos).filter(url => url && url.startsWith('http')).length;
    const favoritesCount = userFavorites.length;
    
    const photosEl = document.getElementById('photosCount');
    const videosEl = document.getElementById('videosCount');
    const favoritesEl = document.getElementById('favoritesCount');
    
    if (photosEl) photosEl.textContent = photosCount;
    if (videosEl) videosEl.textContent = userVideos.length;
    if (favoritesEl) favoritesEl.textContent = favoritesCount;
}

function addFavorite(girlId) {
    if (!girlId) girlId = currentGirl?.id;
    if (!girlId) return;
    
    if (!userFavorites.includes(girlId)) {
        userFavorites.push(girlId);
        localStorage.setItem('dreamFavorites', JSON.stringify(userFavorites));
        showToast('Ajoutee aux favoris');
        renderCollectionFavorites();
        updateCollectionCounts();
    } else {
        showToast('Deja dans tes favoris');
    }
}

function removeFavorite(girlId) {
    userFavorites = userFavorites.filter(id => id !== girlId);
    localStorage.setItem('dreamFavorites', JSON.stringify(userFavorites));
    showToast('Retiree des favoris');
    renderCollectionFavorites();
    updateCollectionCounts();
}

function viewPhoto(url, name) {
    // Simple fullscreen photo viewer
    const viewer = document.createElement('div');
    viewer.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    viewer.innerHTML = `
        <button style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.1);border:none;width:40px;height:40px;border-radius:50%;color:white;font-size:20px;cursor:pointer">X</button>
        <img src="${url}" alt="${name}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:10px">
    `;
    viewer.onclick = () => viewer.remove();
    document.body.appendChild(viewer);
}

// ====== DISCOVER PAGE ======
let discoverTag = 'all';
let discoverSort = 'popular';

function initDiscoverPage() {
    // Init tag buttons
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            discoverTag = btn.dataset.tag;
            renderDiscoverGrid();
        });
    });
    
    renderDiscoverGrid();
}

function renderDiscoverGrid() {
    const container = document.getElementById('discoverGrid');
    if (!container) return;
    
    let filtered = [...allGirls];
    
    // Apply tag filter
    switch(discoverTag) {
        case 'online':
            filtered = filtered.filter(g => g.online);
            break;
        case 'new':
            filtered = filtered.filter(g => g.is_new);
            break;
        case 'popular':
            filtered = filtered.filter(g => g.popular);
            break;
        case 'romantic':
        case 'dominant':
        case 'submissive':
        case 'nympho':
            filtered = filtered.filter(g => g.type && g.type.toLowerCase().includes(discoverTag));
            break;
        case 'milf':
            filtered = filtered.filter(g => g.age >= 35);
            break;
        case 'asian':
            filtered = filtered.filter(g => g.origin && (g.origin.includes('Japon') || g.origin.includes('Coree') || g.origin.includes('Chine') || g.origin.includes('Vietnam') || g.origin.includes('Thai')));
            break;
        case 'latina':
            filtered = filtered.filter(g => g.origin && (g.origin.includes('Bresil') || g.origin.includes('Colombie') || g.origin.includes('Mexique') || g.origin.includes('Argentine')));
            break;
        case 'ebony':
            filtered = filtered.filter(g => g.origin && (g.origin.includes('Nigeria') || g.origin.includes('Kenya') || g.origin.includes('Afrique') || g.origin.includes('Senegal')));
            break;
    }
    
    // Apply sort
    const sortValue = document.getElementById('discoverSort')?.value || 'popular';
    switch(sortValue) {
        case 'popular':
            filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
            break;
        case 'new':
            filtered.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
            break;
        case 'online':
            filtered.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    // Apply search
    const searchVal = document.getElementById('searchDiscover')?.value?.toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(g => 
            g.name.toLowerCase().includes(searchVal) || 
            (g.origin && g.origin.toLowerCase().includes(searchVal)) ||
            (g.type && g.type.toLowerCase().includes(searchVal))
        );
    }
    
    // Limit to 50 for performance
    filtered = filtered.slice(0, 50);
    
    container.innerHTML = filtered.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id];
        const videoUrl = girlVideos[girl.id];
        const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
        
        // Build media content - video takes priority
        let mediaContent = '';
        if (videoUrl) {
            mediaContent = `
                <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="discover-video-badge">VIDEO</div>
            `;
        } else if (photoUrl) {
            mediaContent = `<img src="${photoUrl}" alt="${girl.name}" loading="lazy">`;
        } else {
            mediaContent = `<div style="width:100%;height:100%;background:${avatarColors[colorIdx]};display:flex;align-items:center;justify-content:center;font-size:50px;font-weight:800;color:rgba(0,0,0,0.2)">${girl.name.charAt(0)}</div>`;
        }
        
        return `
        <div class="discover-card" onclick="openProfile('${girl.id}')" style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
            <div class="discover-card-img">
                ${mediaContent}
                ${girl.online ? '<div class="online-indicator"></div>' : ''}
                ${girl.is_new ? '<span class="new-tag">NEW</span>' : ''}
                ${girl.is_camgirl ? '<span class="camgirl-tag">LIVE</span>' : ''}
                ${girl.type ? `<span class="type-tag">${girl.type}</span>` : ''}
            </div>
            <div class="discover-card-info">
                <div class="discover-card-name">${girl.name}, ${girl.age}</div>
                <div class="discover-card-details">${girl.origin}</div>
            </div>
        </div>
    `}).join('');
    
    // Load photos and videos
    filtered.slice(0, 12).forEach(girl => {
        if (!girlPhotos[girl.id]) loadGirlPhoto(girl.id);
        if (!girlVideos[girl.id]) loadGirlVideo(girl.id);
    });
}

function filterDiscoverGirls() {
    renderDiscoverGrid();
}

function sortDiscoverGirls() {
    renderDiscoverGrid();
}

function toggleSwipeMode() {
    document.getElementById('swipeOverlay')?.classList.add('active');
    initSwipe();
}

function openSwipeMode() {
    document.getElementById('swipeOverlay')?.classList.add('active');
    initSwipe();
}

function closeSwipeMode() {
    document.getElementById('swipeOverlay')?.classList.remove('active');
}

// ====== SWIPE (TINDER) ======
function initSwipe() {
    swipeIndex = 0;
    renderSwipeCard();
}

function renderSwipeCard() {
    const container = document.getElementById('swipeCards');
    if (!container) return;
    
    // Filter out camgirls for Tinder mode - only regular girls
    const tinderGirls = allGirls.filter(g => !g.is_camgirl);
    
    if (swipeIndex >= tinderGirls.length) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:50px">Plus de profils disponibles! Reviens plus tard.</div>';
        return;
    }
    
    const girl = tinderGirls[swipeIndex];
    const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
    const photoUrl = girlPhotos[girl.id];
    const videoUrl = girlVideos[girl.id];
    
    // Build media content - video takes priority if available
    let mediaContent = '';
    if (videoUrl) {
        mediaContent = `
            <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">
                <source src="${videoUrl}" type="video/mp4">
            </video>
            <div class="swipe-video-badge">VIDEO</div>
        `;
    } else if (photoUrl) {
        mediaContent = `
            <img src="${photoUrl}" alt="${girl.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : 0]};display:none;align-items:center;justify-content:center;position:absolute;inset:0">
                <span style="font-size:150px;font-weight:900;color:rgba(0,0,0,0.15)">${girl.name.charAt(0)}</span>
            </div>
        `;
    } else {
        mediaContent = `
            <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : 0]};display:flex;align-items:center;justify-content:center">
                <span style="font-size:150px;font-weight:900;color:rgba(0,0,0,0.15)">${girl.name.charAt(0)}</span>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="swipe-card" id="currentSwipeCard" data-girl-id="${girl.id}">
            ${mediaContent}
            <div class="swipe-card-info">
                <div class="swipe-card-name">${girl.name}, ${girl.age}</div>
                <div class="swipe-card-bio">${girl.origin} - ${girl.type || girl.tagline}<br>${(girl.bio || 'Une fille adorable qui cherche a faire des rencontres...').substring(0, 100)}...</div>
            </div>
        </div>
    `;
    
    // Load photo and video if not available
    if (!photoUrl) loadGirlPhoto(girl.id);
    if (!videoUrl) loadGirlVideo(girl.id);
    
    // Preload next 3 photos and videos
    preloadNextPhotos(tinderGirls, swipeIndex);
    preloadNextVideos(tinderGirls, swipeIndex);
    
    initSwipeGestures();
}

async function loadGirlVideo(girlId) {
    if (girlVideos[girlId]) return;
    try {
        const res = await fetch(`/api/profile_video/${girlId}`);
        if (res.ok) {
            const data = await res.json();
            if (data.video_url) {
                girlVideos[girlId] = data.video_url;
                console.log(`[VIDEO] Loaded video for ${girlId}:`, data.video_url);
                
                // Update DOM elements for this specific girl (no full re-render to avoid loops)
                updateGirlVideoInDOM(girlId, data.video_url);
            }
        }
    } catch (e) {
        console.log('No video for', girlId);
    }
}

function updateGirlVideoInDOM(girlId, videoUrl) {
    // Update live girls section
    document.querySelectorAll(`.live-girl-card[onclick*="${girlId}"]`).forEach(card => {
        const img = card.querySelector('img');
        if (img && !card.querySelector('video')) {
            img.insertAdjacentHTML('afterend', `
                <video autoplay loop muted playsinline style="width:100%;height:220px;object-fit:cover">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="video-badge-live">VIDEO</div>
            `);
            img.remove();
        }
    });
    
    // Update grid cards
    document.querySelectorAll(`.girl-card-candy[onclick*="${girlId}"]`).forEach(card => {
        const img = card.querySelector('img');
        if (img && !card.querySelector('video')) {
            img.insertAdjacentHTML('afterend', `
                <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="video-badge-grid">VIDEO</div>
            `);
            img.remove();
        }
    });
    
    // Update feed slides
    document.querySelectorAll(`.feed-slide[data-girl-id="${girlId}"]`).forEach(slide => {
        const img = slide.querySelector('.feed-slide-photo');
        if (img && !slide.querySelector('video')) {
            img.insertAdjacentHTML('afterend', `
                <video autoplay loop muted playsinline class="feed-slide-video">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="feed-video-badge">VIDEO</div>
            `);
            img.remove();
        }
    });
    
    // Update profile background if viewing this girl
    if (currentGirl && currentGirl.id === girlId) {
        const bg = document.getElementById('profileMediaBg');
        if (bg && !bg.querySelector('video')) {
            bg.innerHTML = `
                <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;filter:brightness(0.6)">
                    <source src="${videoUrl}" type="video/mp4">
                </video>
                <div class="profile-video-badge">VIDEO</div>
            `;
        }
    }
}

// Optimized re-render functions that only update video elements
function preloadNextVideos(girls, currentIdx) {
    for (let i = 1; i <= 3; i++) {
        const nextGirl = girls[currentIdx + i];
        if (nextGirl && !girlVideos[nextGirl.id]) {
            loadGirlVideo(nextGirl.id);
        }
    }
}

function preloadNextPhotos(girls, currentIdx) {
    for (let i = 1; i <= 3; i++) {
        const nextGirl = girls[currentIdx + i];
        if (nextGirl && !girlPhotos[nextGirl.id]) {
            loadGirlPhoto(nextGirl.id);
        }
    }
}

function initSwipeGestures() {
    const card = document.getElementById('currentSwipeCard');
    if (!card) return;
    
    let startX = 0, currentX = 0, isDragging = false;
    
    const onStart = (x) => { startX = x; isDragging = true; };
    const onMove = (x) => {
        if (!isDragging) return;
        currentX = x;
        const diff = currentX - startX;
        card.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`;
        card.style.transition = 'none';
    };
    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';
        const diff = currentX - startX;
        if (diff > 100) swipeLike();
        else if (diff < -100) swipePass();
        else card.style.transform = '';
    };
    
    card.addEventListener('touchstart', e => onStart(e.touches[0].clientX));
    card.addEventListener('touchmove', e => onMove(e.touches[0].clientX));
    card.addEventListener('touchend', onEnd);
    
    card.addEventListener('mousedown', e => onStart(e.clientX));
    card.addEventListener('mousemove', e => onMove(e.clientX));
    card.addEventListener('mouseup', onEnd);
    card.addEventListener('mouseleave', onEnd);
}

function swipePass() {
    const card = document.getElementById('currentSwipeCard');
    if (card) {
        card.style.transform = 'translateX(-150%) rotate(-30deg)';
        card.style.opacity = '0';
    }
    setTimeout(() => { swipeIndex++; renderSwipeCard(); }, 300);
}

function swipeLike() {
    const tinderGirls = allGirls.filter(g => !g.is_camgirl);
    const girl = tinderGirls[swipeIndex];
    const card = document.getElementById('currentSwipeCard');
    
    console.log('Swipe like on:', girl?.name);
    
    if (card) {
        card.style.transform = 'translateX(150%) rotate(30deg)';
        card.style.opacity = '0';
    }
    
    // Match chance - higher for better experience (70% base)
    const matchChance = girl?.match_chance || 70;
    const roll = Math.random() * 100;
    const isMatch = roll < matchChance;
    
    console.log('Match chance:', matchChance, 'Roll:', roll.toFixed(1), 'Match:', isMatch);
    
    setTimeout(() => {
        if (isMatch && girl) {
            console.log('Showing match popup for:', girl.name);
            showMatch(girl);
            // Save match
            if (!userMatches.find(m => m.id === girl.id)) {
                userMatches.push({ id: girl.id, name: girl.name, age: girl.age });
                localStorage.setItem('dreamMatches', JSON.stringify(userMatches));
            }
            // Start notifications for this match
            initNotifications();
        } else if (girl) {
            showToast(`${girl.name} n'a pas matche...`);
        }
        swipeIndex++;
        renderSwipeCard();
    }, 300);
}

function swipeSuperlike() {
    if (userTokens < 50) {
        showToast('Pas assez de tokens!');
        return;
    }
    userTokens -= 50;
    localStorage.setItem('dreamTokens', userTokens);
    updateTokenDisplay();
    
    const tinderGirls = allGirls.filter(g => !g.is_camgirl);
    const girl = tinderGirls[swipeIndex];
    const card = document.getElementById('currentSwipeCard');
    
    if (card) {
        card.style.transform = 'translateY(-150%) scale(1.2)';
        card.style.opacity = '0';
    }
    
    setTimeout(() => {
        if (girl) {
            showMatch(girl);
            if (!userMatches.find(m => m.id === girl.id)) {
                userMatches.push({ id: girl.id, name: girl.name, age: girl.age });
                localStorage.setItem('dreamMatches', JSON.stringify(userMatches));
            }
        }
        swipeIndex++;
        renderSwipeCard();
    }, 300);
}

// ====== MATCH POPUP ======
function showMatch(girl) {
    const colorIdx = allGirls.indexOf(girl) % avatarColors.length;
    const photoUrl = girlPhotos[girl.id];
    
    document.getElementById('matchAvatar2').innerHTML = photoUrl ? `
        <img src="${photoUrl}" alt="${girl.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
    ` : `
        <div style="width:100%;height:100%;background:${avatarColors[colorIdx >= 0 ? colorIdx : 0]};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#000">${girl.name.charAt(0)}</div>
    `;
    document.getElementById('matchText').textContent = `Tu as matche avec ${girl.name}!`;
    document.getElementById('matchPopup').classList.add('active');
    currentGirl = girl;
    window.currentGirlId = girl.id;
    
    // Play match sound
    playSound('match');
    
    // Create heart burst effect
    createHeartBurst();
}

function closeMatch() {
    document.getElementById('matchPopup').classList.remove('active');
}

function openMatchChat() {
    closeMatch();
    if (currentGirl) openChat(currentGirl);
}

function createHeartBurst() {
    const container = document.getElementById('matchPopup');
    if (!container) return;
    
    // Create multiple floating hearts
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.className = 'floating-heart';
            heart.innerHTML = '&#10084;';
            heart.style.cssText = `
                position: absolute;
                font-size: ${20 + Math.random() * 30}px;
                color: ${Math.random() > 0.5 ? 'var(--neon-pink)' : 'var(--hot-pink)'};
                left: ${20 + Math.random() * 60}%;
                bottom: 20%;
                pointer-events: none;
                animation: floatHeart ${2 + Math.random() * 2}s ease-out forwards;
                opacity: 0;
                text-shadow: 0 0 10px currentColor;
            `;
            container.appendChild(heart);
            
            setTimeout(() => heart.remove(), 4000);
        }, i * 100);
    }
}

// ====== TOKENS ======
function showBuyTokens() {
    document.getElementById('buyTokensPopup').classList.add('active');
}

function closeBuyTokens() {
    document.getElementById('buyTokensPopup').classList.remove('active');
}

function buyTokens(amount) {
    closeBuyTokens();
    showToast(`Paiement simule - +${amount} tokens!`);
    userTokens += amount;
    localStorage.setItem('dreamTokens', userTokens);
    updateTokenDisplay();
}

function updateTokenDisplay() {
    const els = ['tokenCount', 'headerTokens', 'statTokens', 'chatTokens'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = userTokens.toLocaleString();
    });
}

// ====== UNLOCK ======
let pendingUnlock = null;

function showUnlock(cost, type) {
    pendingUnlock = { cost, type };
    document.getElementById('unlockCost').textContent = cost;
    document.getElementById('unlockPopup').classList.add('active');
}

function closeUnlock() {
    document.getElementById('unlockPopup').classList.remove('active');
    pendingUnlock = null;
}

function confirmUnlock() {
    if (!pendingUnlock) return;
    
    if (userTokens < pendingUnlock.cost) {
        showToast('Pas assez de tokens!');
        closeUnlock();
        showBuyTokens();
        return;
    }
    
    userTokens -= pendingUnlock.cost;
    localStorage.setItem('dreamTokens', userTokens);
    updateTokenDisplay();
    closeUnlock();
    showToast('Contenu debloque!');
}

// ====== PROFILE ACTIONS ======
async function requestPhoto() {
    if (!currentGirl) {
        showToast('Aucun profil selectionne');
        return;
    }
    
    if (userTokens < 30) {
        showToast('Pas assez de tokens! (30 requis)');
        showBuyTokens();
        return;
    }
    
    showToast('Generation de photo en cours...');
    
    try {
        const res = await fetch(`/api/generate_photo/${currentGirl.id}?force=true`);
        if (res.ok) {
            const data = await res.json();
            if (data.image_url) {
                userTokens -= 30;
                localStorage.setItem('dreamTokens', userTokens);
                updateTokenDisplay();
                
                // Add to stored photos
                if (!girlPhotos[currentGirl.id]) {
                    girlPhotos[currentGirl.id] = data.image_url;
                }
                
                // Refresh the profile media
                renderProfileMedia(currentGirl);
                
                showToast('Nouvelle photo generee!');
                playSound('match');
            } else {
                showToast('Generation echouee, reessaye');
            }
        } else {
            showToast('Erreur serveur, reessaye');
        }
    } catch (e) {
        console.error('Photo generation error:', e);
        showToast('Erreur, reessaye plus tard');
    }
}

function requestVideo() {
    if (userTokens < 80) {
        showToast('Pas assez de tokens!');
        showBuyTokens();
        return;
    }
    userTokens -= 80;
    localStorage.setItem('dreamTokens', userTokens);
    updateTokenDisplay();
    showToast('Video demandee! Elle arrive bientot...');
}

function addFavorite() {
    showToast('Ajoutee aux favoris!');
}

async function regenerateProfilePhoto() {
    if (!currentGirl) return;
    
    if (userTokens < 20) {
        showToast('Pas assez de tokens! (20 requis)');
        showBuyTokens();
        return;
    }
    
    showToast('Generation de nouvelle photo...');
    
    try {
        const res = await fetch(`/api/generate_photo/${currentGirl.id}?force=true`);
        if (res.ok) {
            const data = await res.json();
            if (data.image_url) {
                userTokens -= 20;
                localStorage.setItem('dreamTokens', userTokens);
                updateTokenDisplay();
                
                girlPhotos[currentGirl.id] = data.image_url;
                
                document.getElementById('profileMediaBg').innerHTML = `
                    <img src="${data.image_url}" alt="${currentGirl.name}" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.6)">
                `;
                
                updateGirlCardPhoto(currentGirl.id, data.image_url);
                renderProfileMedia(currentGirl);
                
                showToast('Nouvelle photo generee!');
                playSound('match');
            }
        } else {
            showToast('Erreur de generation, reessaye');
        }
    } catch (e) {
        console.error('Photo regeneration error:', e);
        showToast('Erreur, reessaye plus tard');
    }
}

// ====== TOAST ======
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ====== NOTIFICATIONS SYSTEM ======
function initNotifications() {
    // Load saved notifications
    const saved = localStorage.getItem('dreamNotifications');
    if (saved) notifications = JSON.parse(saved);
    updateNotificationBadge();
    
    // Start random message system - girls message you first
    if (userMatches.length > 0) {
        setTimeout(() => triggerRandomMessage(), 30000 + Math.random() * 60000);
    }
}

function triggerRandomMessage() {
    if (!currentUser || userMatches.length === 0) return;
    
    // Pick a random matched girl
    const matchId = userMatches[Math.floor(Math.random() * userMatches.length)];
    const girl = allGirls.find(g => g.id === matchId);
    if (!girl) return;
    
    // Random flirty messages
    const messages = [
        "Coucou, tu me manques...",
        "Tu fais quoi la?",
        "J'ai envie de te parler...",
        "Hey toi...",
        "Tu penses a moi?",
        "Je m'ennuie sans toi...",
        "Tu veux voir quelque chose?",
        "J'ai une surprise pour toi...",
        "Tu es la?",
        "Ca te dit qu'on discute?"
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    // Add notification
    addNotification({
        type: 'message',
        girlId: girl.id,
        girlName: girl.name,
        message: message,
        time: Date.now()
    });
    
    // Show popup notification
    showNotificationPopup(girl, message);
    
    // Schedule next message
    setTimeout(() => triggerRandomMessage(), 60000 + Math.random() * 180000);
}

function addNotification(notif) {
    notifications.unshift(notif);
    if (notifications.length > 50) notifications.pop();
    localStorage.setItem('dreamNotifications', JSON.stringify(notifications));
    unreadCount++;
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badges = document.querySelectorAll('.notif-badge');
    badges.forEach(b => {
        if (unreadCount > 0) {
            b.textContent = unreadCount > 9 ? '9+' : unreadCount;
            b.classList.add('show');
        } else {
            b.classList.remove('show');
        }
    });
    
    // Update sidebar messages badge
    const msgNav = document.querySelector('.nav-item[onclick*="messages"] .nav-badge');
    if (msgNav) {
        if (unreadCount > 0) {
            msgNav.textContent = unreadCount;
            msgNav.classList.add('show');
        } else {
            msgNav.classList.remove('show');
        }
    }
}

function showNotificationPopup(girl, message) {
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    const photoUrl = girlPhotos[girl.id];
    
    popup.innerHTML = `
        <div class="notif-popup-content" onclick="openChatFromNotif('${girl.id}')">
            <div class="notif-popup-avatar" style="background: ${avatarColors[0]}">
                ${photoUrl ? `<img src="${photoUrl}" alt="${girl.name}">` : girl.name.charAt(0)}
            </div>
            <div class="notif-popup-text">
                <div class="notif-popup-name">${girl.name}</div>
                <div class="notif-popup-msg">${message}</div>
            </div>
            <button class="notif-popup-close" onclick="event.stopPropagation(); this.parentElement.parentElement.remove();">×</button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Animate in
    requestAnimationFrame(() => popup.classList.add('show'));
    
    // Auto remove after 5s
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    }, 5000);
    
    // Play sound
    playSound('message');
}

function openChatFromNotif(girlId) {
    const popups = document.querySelectorAll('.notification-popup');
    popups.forEach(p => p.remove());
    
    unreadCount = Math.max(0, unreadCount - 1);
    updateNotificationBadge();
    
    // Find girl object from ID
    const girl = allGirls.find(g => g.id === girlId);
    if (girl) openChat(girl);
}

function playSound(type) {
    // Create subtle sound feedback
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'message') {
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.1);
        } else if (type === 'match') {
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(900, audioCtx.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.3);
        }
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
}

// ====== ANIMATIONS ======
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 5px var(--neon-cyan); } 50% { box-shadow: 0 0 20px var(--neon-cyan), 0 0 30px var(--neon-pink); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes heartBeat { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.2); } 50% { transform: scale(1); } 75% { transform: scale(1.1); } }
        @keyframes floatHeart { 
            0% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); } 
            100% { opacity: 0; transform: translateY(-200px) scale(0.5) rotate(45deg); } 
        }
        
        .notification-popup {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notification-popup.show {
            opacity: 1;
            transform: translateX(0);
        }
        .notif-popup-content {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(15, 15, 40, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid var(--neon-cyan);
            border-radius: 16px;
            padding: 12px 16px;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            min-width: 280px;
        }
        .notif-popup-content:hover {
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        }
        .notif-popup-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 700;
            overflow: hidden;
        }
        .notif-popup-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .notif-popup-text {
            flex: 1;
        }
        .notif-popup-name {
            font-weight: 600;
            color: var(--neon-cyan);
        }
        .notif-popup-msg {
            font-size: 14px;
            color: var(--text-secondary);
        }
        .notif-popup-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 24px;
            cursor: pointer;
            padding: 0 4px;
        }
        .notif-popup-close:hover {
            color: var(--text-primary);
        }
        
        .nav-badge, .notif-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: var(--hot-pink);
            color: white;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            animation: pulse 2s infinite;
        }
        .nav-badge.show, .notif-badge.show {
            display: flex;
        }
    `;
    document.head.appendChild(style);
}

// ====== QUICK ACTIONS ======
document.addEventListener('click', e => {
    if (e.target.classList.contains('quick-btn')) {
        const text = e.target.textContent;
        if (text.includes('Photo')) requestPhoto();
        else if (text.includes('Video')) requestVideo();
        else if (text.includes('Coquin')) {
            const input = document.getElementById('chatInput');
            if (input) input.value = 'Tu me montres quelque chose de coquin?';
        }
    }
});

// ====== KEYBOARD ======
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeProfile();
        closeChat();
        closeBuyTokens();
        closeMatch();
        closeUnlock();
        closeStory();
        closeFantasyModal();
    }
});

// ====== GIRLFRIEND CREATOR WIZARD ======
let creatingGirlfriend = false;
let currentWizardStep = 0; // 0: vetements, 1: personnage, 2: creating, 3: result
let createdGirlData = null;

// Initialize wizard on page load
let creationProgressInterval = null;

function initCreatorWizard() {
    // Initialize wizard to first step
    showWizardStep(0);
    
    // Chip selection handlers
    document.querySelectorAll('.chip-grid:not(.multi)').forEach(grid => {
        grid.addEventListener('click', e => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            grid.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
    });
    
    // Multi-select chip grids (max 3)
    document.querySelectorAll('.chip-grid.multi').forEach(grid => {
        const maxSelect = parseInt(grid.dataset.max) || 3;
        grid.addEventListener('click', e => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            
            if (chip.classList.contains('selected')) {
                chip.classList.remove('selected');
            } else {
                const selected = grid.querySelectorAll('.chip.selected').length;
                if (selected < maxSelect) {
                    chip.classList.add('selected');
                } else {
                    showToast(`Maximum ${maxSelect} selections`);
                }
            }
        });
    });
    
    // Voice card selection
    document.querySelectorAll('.voice-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });
    
    // Sub-tab navigation
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const subtab = tab.dataset.subtab;
            document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.subtab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById('subtab' + subtab.charAt(0).toUpperCase() + subtab.slice(1)).classList.remove('hidden');
        });
    });
    
    // Progress tab clicks
    document.querySelectorAll('.progress-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const step = tab.dataset.step;
            if (step === 'vetements') {
                showWizardStep(0);
            } else if (step === 'personnage') {
                showWizardStep(1);
            }
        });
    });
    
    // Search filters for professions and kinks
    const searchProfession = document.getElementById('searchProfession');
    if (searchProfession) {
        searchProfession.addEventListener('input', e => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('#chipProfession .chip').forEach(chip => {
                const text = chip.textContent.toLowerCase();
                chip.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
    
    const searchKinks = document.getElementById('searchKinks');
    if (searchKinks) {
        searchKinks.addEventListener('input', e => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('#chipKinks .chip').forEach(chip => {
                const text = chip.textContent.toLowerCase();
                chip.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
}

function showWizardStep(step) {
    currentWizardStep = step;
    
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    
    // Update progress tabs
    const progressTabs = document.querySelectorAll('.progress-tab');
    progressTabs.forEach(t => {
        t.classList.remove('active', 'completed');
    });
    
    // Show current step
    if (step === 0) {
        document.getElementById('stepVetements').classList.remove('hidden');
        progressTabs[0].classList.add('active');
        document.getElementById('wizardNext').textContent = 'SUIVANT →';
        document.getElementById('wizardBack').style.visibility = 'hidden';
        document.querySelector('.wizard-footer').style.display = 'flex';
    } else if (step === 1) {
        document.getElementById('stepPersonnage').classList.remove('hidden');
        progressTabs[0].classList.add('completed');
        progressTabs[1].classList.add('active');
        document.getElementById('wizardNext').innerHTML = 'APERCU <span>→</span>';
        document.getElementById('wizardBack').style.visibility = 'visible';
        document.querySelector('.wizard-footer').style.display = 'flex';
    } else if (step === 2) {
        document.getElementById('stepCreating').classList.remove('hidden');
        document.querySelector('.wizard-footer').style.display = 'none';
        startCreationAnimation();
    } else if (step === 3) {
        document.getElementById('stepResult').classList.remove('hidden');
        document.querySelector('.wizard-footer').style.display = 'none';
    }
}

function wizardNext() {
    if (currentWizardStep === 0) {
        // Validate name
        const name = document.getElementById('gfName').value.trim();
        if (!name) {
            showToast('Choisis un prenom pour ta copine');
            return;
        }
        showWizardStep(1);
    } else if (currentWizardStep === 1) {
        // Start creation
        startGirlfriendCreation();
    }
}

function wizardPrev() {
    if (currentWizardStep === 1) {
        showWizardStep(0);
    }
}

function getChipValue(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return '';
    const selected = grid.querySelector('.chip.selected');
    return selected ? selected.dataset.value : '';
}

function getMultiChipValues(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return [];
    return Array.from(grid.querySelectorAll('.chip.selected')).map(c => c.dataset.value);
}

function selectImageOption(element, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    const isMulti = grid.classList.contains('multi');
    const maxSelections = parseInt(grid.dataset.max) || 3;
    
    if (isMulti) {
        if (element.classList.contains('selected')) {
            element.classList.remove('selected');
        } else {
            const currentSelected = grid.querySelectorAll('.image-option.selected').length;
            if (currentSelected >= maxSelections) {
                showToast(`Maximum ${maxSelections} selections`);
                return;
            }
            element.classList.add('selected');
        }
    } else {
        grid.querySelectorAll('.image-option').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
    }
}

function getImageGridValue(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return '';
    const selected = grid.querySelector('.image-option.selected');
    return selected ? selected.dataset.value : '';
}

function getMultiImageGridValues(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return [];
    return Array.from(grid.querySelectorAll('.image-option.selected')).map(opt => opt.dataset.value);
}

function updateAgeDisplay(value) {
    const display = document.getElementById('ageValue');
    if (display) {
        display.textContent = value >= 55 ? '55+' : value;
    }
}

function getAgeValue() {
    const slider = document.getElementById('ageSlider');
    return slider ? slider.value : '25';
}

async function startGirlfriendCreation() {
    if (creatingGirlfriend) {
        console.log('[CREATE] Already creating, skipping');
        return;
    }
    creatingGirlfriend = true;
    
    console.log('[CREATE] Starting girlfriend creation...');
    showWizardStep(2);
    
    const data = {
        name: document.getElementById('gfName')?.value?.trim() || 'Ma Copine',
        ethnicity: getImageGridValue('gridEthnicity') || getChipValue('chipEthnicity') || 'european',
        age: getAgeValue() || '25',
        body: getImageGridValue('gridBody') || getChipValue('chipBody') || 'slim',
        breasts: getImageGridValue('gridBreasts') || getChipValue('chipBreasts') || 'medium',
        hair: getImageGridValue('gridHair') || getChipValue('chipHair') || 'brunette',
        style: getImageGridValue('gridStyle') || getChipValue('chipStyle') || 'casual',
        eyes: getImageGridValue('gridEyes') || 'brown',
        personality: getChipValue('chipPersonality') || 'playful',
        character: getMultiChipValues('chipCharacter') || [],
        relation: getChipValue('chipRelation') || 'girlfriend',
        profession: getChipValue('chipProfession') || '',
        kinks: getMultiChipValues('chipKinks') || [],
        voice: document.querySelector('.voice-card.selected')?.dataset.value || 'voix1'
    };
    
    console.log('[CREATE] Data:', data);
    
    try {
        showToast('Creation en cours...');
        const res = await fetch('/api/create_girlfriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        console.log('[CREATE] Response status:', res.status);
        const result = await res.json();
        console.log('[CREATE] Result:', result);
        
        if (result.success && result.profile_photo) {
            createdGirlData = {
                ...data,
                id: result.girlfriend_id || 'custom_' + Date.now(),
                photo: result.profile_photo
            };
            
            showToast('Creation reussie!');
            // Show result after animation completes
            setTimeout(() => {
                showCreationResult();
            }, 500);
        } else {
            throw new Error(result.error || 'Erreur de creation');
        }
    } catch (err) {
        console.error('[CREATE] Error:', err);
        stopCreationAnimation();
        showToast('Erreur: ' + (err.message || 'API indisponible'));
        showWizardStep(1);
    }
    
    creatingGirlfriend = false;
}

function startCreationAnimation() {
    // Clear any existing interval
    if (creationProgressInterval) {
        clearInterval(creationProgressInterval);
        creationProgressInterval = null;
    }
    
    const progressBar = document.getElementById('creationProgress');
    const percentText = document.getElementById('creationPercent');
    
    let progress = 0;
    const circumference = 2 * Math.PI * 54;
    
    // Reset progress
    progressBar.style.strokeDashoffset = circumference;
    percentText.textContent = '0%';
    
    creationProgressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95;
        
        const offset = circumference - (progress / 100) * circumference;
        progressBar.style.strokeDashoffset = offset;
        percentText.textContent = Math.round(progress) + '%';
        
        if (progress >= 95) {
            clearInterval(creationProgressInterval);
            creationProgressInterval = null;
        }
    }, 300);
}

function stopCreationAnimation() {
    if (creationProgressInterval) {
        clearInterval(creationProgressInterval);
        creationProgressInterval = null;
    }
}

function showCreationResult() {
    if (!createdGirlData) return;
    
    showWizardStep(3);
    
    // Complete progress animation
    const progressBar = document.getElementById('creationProgress');
    const percentText = document.getElementById('creationPercent');
    const circumference = 2 * Math.PI * 54;
    progressBar.style.strokeDashoffset = 0;
    percentText.textContent = '100%';
    
    // Populate result
    document.getElementById('resultImage').innerHTML = `<img src="${createdGirlData.photo}" alt="${createdGirlData.name}">`;
    
    const ageNum = createdGirlData.age.split('-')[0];
    document.getElementById('resultName').textContent = `${createdGirlData.name}, ${ageNum}`;
    
    const relationLabels = {
        'girlfriend': 'Petite amie',
        'wife': 'Epouse',
        'mistress': 'Maitresse',
        'friend': 'Amie proche',
        'stranger': 'Inconnue',
        'ex': 'Ex-copine',
        'neighbor': 'Voisine',
        'colleague': 'Collegue'
    };
    document.getElementById('resultRelation').textContent = relationLabels[createdGirlData.relation] || 'Petite amie';
}

async function giveLifeToAI() {
    if (!createdGirlData) return;
    
    try {
        // Check tokens (10 tokens required)
        const tokensRes = await fetch('/api/tokens');
        const tokensData = await tokensRes.json();
        
        if (tokensData.tokens < 10) {
            showToast('Pas assez de tokens (10 requis)');
            return;
        }
        
        // Deduct tokens and verify success
        const deductRes = await fetch('/api/tokens/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10 })
        });
        
        const deductData = await deductRes.json();
        if (!deductRes.ok || !deductData.success) {
            showToast('Erreur de deduction des tokens');
            return;
        }
        
        // Add to matches
        const newGirl = {
            id: createdGirlData.id,
            name: createdGirlData.name,
            age: parseInt(createdGirlData.age.split('-')[0]),
            origin: getEthnicityLabel(createdGirlData.ethnicity),
            type: getPersonalityLabel(createdGirlData.personality),
            profession: createdGirlData.profession,
            kinks: createdGirlData.kinks,
            voice: createdGirlData.voice,
            is_custom: true,
            online: true
        };
        
        allGirls.push(newGirl);
        userMatches.push(newGirl);
        girlPhotos[newGirl.id] = createdGirlData.photo;
        
        localStorage.setItem('dreamMatches', JSON.stringify(userMatches));
        
        renderMatches();
        updateTokenDisplay();
        showToast(`${createdGirlData.name} est maintenant vivante! Elle t'attend dans tes matches`);
        
        // Navigate to matches
        setTimeout(() => {
            navigateTo('matches');
            resetCreator();
        }, 1500);
    } catch (err) {
        console.error('Give life error:', err);
        showToast('Erreur lors de l\'activation');
    }
}

async function regenerateFace() {
    if (!createdGirlData || creatingGirlfriend) return;
    
    // Check tokens (1 token required)
    const tokensRes = await fetch('/api/tokens');
    const tokensData = await tokensRes.json();
    
    if (tokensData.tokens < 1) {
        showToast('Pas assez de tokens');
        return;
    }
    
    creatingGirlfriend = true;
    showToast('Generation d\'un nouveau visage...');
    
    try {
        const res = await fetch('/api/create_girlfriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: createdGirlData.name,
                ethnicity: createdGirlData.ethnicity,
                age: createdGirlData.age,
                body: createdGirlData.body,
                breasts: createdGirlData.breasts,
                hair: createdGirlData.hair,
                style: createdGirlData.style,
                personality: createdGirlData.personality
            })
        });
        
        const result = await res.json();
        
        if (result.success && result.profile_photo) {
            // Deduct token only after success
            await fetch('/api/tokens/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1 })
            });
            
            createdGirlData.photo = result.profile_photo;
            createdGirlData.id = result.girlfriend_id || createdGirlData.id;
            document.getElementById('resultImage').innerHTML = `<img src="${result.profile_photo}" alt="${createdGirlData.name}">`;
            updateTokenDisplay();
            showToast('Nouveau visage genere!');
        } else {
            throw new Error(result.error || 'Erreur');
        }
    } catch (err) {
        console.error('Regenerate face error:', err);
        showToast('Erreur de generation');
    }
    
    creatingGirlfriend = false;
}

function resetCreator() {
    currentWizardStep = 0;
    createdGirlData = null;
    
    // Reset form
    document.getElementById('gfName').value = '';
    
    // Reset all chip selections to defaults
    document.querySelectorAll('.chip-grid').forEach(grid => {
        grid.querySelectorAll('.chip').forEach((chip, i) => {
            if (i === 0 || chip.classList.contains('default')) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });
    });
    
    // Reset voice selection
    document.querySelectorAll('.voice-card').forEach((card, i) => {
        card.classList.toggle('selected', i === 0);
    });
    
    // Reset to first step
    showWizardStep(0);
    
    // Reset sub-tabs
    document.querySelectorAll('.sub-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('.subtab-content').forEach((content, i) => {
        content.classList.toggle('hidden', i !== 0);
    });
}

// Legacy function for compatibility
async function createGirlfriend() {
    startGirlfriendCreation();
}

function getEthnicityLabel(value) {
    const labels = {
        'french': 'France',
        'european': 'Europe',
        'asian': 'Asie',
        'african': 'Afrique',
        'arab': 'Moyen-Orient',
        'latina': 'Amerique Latine',
        'indian': 'Inde',
        'mixed': 'Metisse'
    };
    return labels[value] || value;
}

function getPersonalityLabel(value) {
    const labels = {
        'shy': 'Timide',
        'dominant': 'Dominante',
        'submissive': 'Soumise',
        'playful': 'Coquine',
        'romantic': 'Romantique',
        'wild': 'Perverse'
    };
    return labels[value] || value;
}

// ====== FANTASY MODE ======
let fantasyMode = false;
let fantasyContext = null;
let fantasyLevel = 0;

function activateFantasyMode() {
    fantasyMode = true;
    fantasyLevel = 1;
    fantasyContext = { category: null, keywords: [] };
    
    // Hide only the activate button, keep action buttons visible
    const activateBtn = document.getElementById('fantasyActivateBtn');
    if (activateBtn) activateBtn.style.display = 'none';
    document.getElementById('fantasyModeBar').style.display = 'flex';
    
    // Send activation message
    const activationMsg = "Mmm j'adore quand tu partages ca avec moi... Raconte-moi tout, qu'est-ce qui te fait vraiment fantasmer? Tu peux aussi me demander de te montrer des choses...";
    addChatMessage(activationMsg, 'her');
    
    showToast('Mode Fantasme active - utilise les boutons pour demander des photos');
}

function stopFantasyMode() {
    fantasyMode = false;
    fantasyContext = null;
    fantasyLevel = 0;
    
    // Show the activate button again
    const activateBtn = document.getElementById('fantasyActivateBtn');
    if (activateBtn) activateBtn.style.display = 'inline-flex';
    document.getElementById('fantasyModeBar').style.display = 'none';
    
    showToast('Mode Fantasme desactive');
}

function updateFantasyLevel(level) {
    fantasyLevel = level;
    const levelEl = document.getElementById('fantasyLevel');
    if (levelEl) {
        levelEl.textContent = 'Niveau ' + level;
    }
}

function showFantasyLevelPicker() {
    const modal = document.createElement('div');
    modal.className = 'fantasy-photo-modal';
    modal.id = 'levelPickerModal';
    modal.innerHTML = `
        <div class="fantasy-photo-content">
            <h3 class="fantasy-photo-title">Choisir le niveau d'intensite</h3>
            <div class="fantasy-photo-options">
                <button class="fantasy-option ${fantasyLevel === 1 ? 'active' : ''}" onclick="selectFantasyLevel(1)">
                    <span>Niveau 1 - Doux</span>
                    <small>Flirt et seduction</small>
                </button>
                <button class="fantasy-option ${fantasyLevel === 2 ? 'active' : ''}" onclick="selectFantasyLevel(2)">
                    <span>Niveau 2 - Sensuel</span>
                    <small>Sous-entendus coquins</small>
                </button>
                <button class="fantasy-option ${fantasyLevel === 3 ? 'active' : ''}" onclick="selectFantasyLevel(3)">
                    <span>Niveau 3 - Ose</span>
                    <small>Descriptions suggestives</small>
                </button>
                <button class="fantasy-option ${fantasyLevel === 4 ? 'active' : ''}" onclick="selectFantasyLevel(4)">
                    <span>Niveau 4 - Explicite</span>
                    <small>Contenu adulte</small>
                </button>
                <button class="fantasy-option ${fantasyLevel === 5 ? 'active' : ''}" onclick="selectFantasyLevel(5)">
                    <span>Niveau 5 - Hardcore</span>
                    <small>Sans limites</small>
                </button>
            </div>
            <button class="fantasy-cancel" onclick="closeLevelPicker()">Annuler</button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function selectFantasyLevel(level) {
    updateFantasyLevel(level);
    closeLevelPicker();
    showToast('Niveau ' + level + ' active');
}

function closeLevelPicker() {
    const modal = document.getElementById('levelPickerModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function showMeAction() {
    showFantasyModal('Montre-moi...', [
        { text: 'Ton visage', cost: 0, action: 'portrait' },
        { text: 'Ton decollete', cost: 50, action: 'cleavage' },
        { text: 'Ta lingerie', cost: 100, action: 'lingerie' },
        { text: 'Tes seins', cost: 200, action: 'topless' },
        { text: 'Ton corps nu', cost: 350, action: 'nude' },
        { text: 'Tout...', cost: 500, action: 'explicit' }
    ]);
}

function sendMeAction() {
    showFantasyModal('Envoie-moi...', [
        { text: 'Une photo sexy', cost: 50, action: 'sexy_photo' },
        { text: 'Une photo coquine', cost: 100, action: 'naughty_photo' },
        { text: 'Une photo nue', cost: 200, action: 'nude_photo' },
        { text: 'Une video', cost: 300, action: 'video' }
    ]);
}

function showFantasyModal(title, options) {
    const modal = document.createElement('div');
    modal.className = 'fantasy-photo-modal';
    modal.id = 'fantasyModal';
    modal.innerHTML = `
        <div class="fantasy-photo-content">
            <h3 class="fantasy-photo-title">${title}</h3>
            <div class="fantasy-photo-options">
                ${options.map(opt => `
                    <div class="fantasy-option" onclick="requestFantasyPhoto('${opt.action}', ${opt.cost})">
                        <span>${opt.text}</span>
                        <span class="fantasy-option-cost">${opt.cost > 0 ? opt.cost + ' tokens' : 'Gratuit'}</span>
                    </div>
                `).join('')}
            </div>
            <input type="text" class="fantasy-custom" placeholder="Ou decris ce que tu veux..." id="fantasyCustom">
            <button class="fantasy-submit" onclick="requestCustomFantasy()">Demander</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', e => {
        if (e.target === modal) closeFantasyModal();
    });
}

function closeFantasyModal() {
    const modal = document.getElementById('fantasyModal');
    if (modal) modal.remove();
}

async function requestFantasyPhoto(action, cost) {
    closeFantasyModal();
    
    if (!currentGirl || !currentGirl.id) {
        console.error('No current girl selected for fantasy photo');
        showToast('Erreur: aucune fille selectionnee');
        return;
    }
    
    if (cost > 0 && userTokens < cost) {
        showToast('Pas assez de tokens');
        showBuyTokens();
        return;
    }
    
    if (cost > 0) {
        userTokens -= cost;
        updateTokenDisplay();
    }
    
    // Show typing indicator
    addTypingIndicator();
    
    console.log('[FANTASY] Requesting photo for girl:', currentGirl.id, 'action:', action);
    
    try {
        const res = await fetch('/api/fantasy_photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl_id: currentGirl.id,
                action: action,
                fantasy_context: fantasyContext
            })
        });
        
        console.log('[FANTASY] Response status:', res.status);
        const data = await res.json();
        console.log('[FANTASY] Response data:', data);
        removeTypingIndicator();
        
        if (data.success && data.url) {
            addChatPhotoMessage(data.url);
            
            if (fantasyLevel < 5) {
                updateFantasyLevel(fantasyLevel + 1);
            }
        } else {
            console.error('[FANTASY] Error:', data.error || 'Unknown error');
            addChatMessage("Desole, j'ai pas pu generer la photo...", 'her');
        }
    } catch (err) {
        console.error('[FANTASY] Exception:', err);
        removeTypingIndicator();
        addChatMessage("Mmm il y a eu un souci...", 'her');
    }
}

async function requestCustomFantasy() {
    const input = document.getElementById('fantasyCustom');
    const request = input?.value.trim();
    
    if (!request) {
        showToast('Decris ce que tu veux');
        return;
    }
    
    if (!currentGirl || !currentGirl.id) {
        showToast('Erreur: aucune fille selectionnee');
        return;
    }
    
    closeFantasyModal();
    
    const cost = 100;
    
    if (userTokens < cost) {
        showToast('Pas assez de tokens');
        showBuyTokens();
        return;
    }
    
    userTokens -= cost;
    updateTokenDisplay();
    
    addTypingIndicator();
    console.log('[FANTASY CUSTOM] Requesting for girl:', currentGirl.id, 'request:', request);
    
    try {
        const res = await fetch('/api/fantasy_photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl_id: currentGirl.id,
                action: 'custom',
                custom_request: request,
                fantasy_context: fantasyContext
            })
        });
        
        console.log('[FANTASY CUSTOM] Response status:', res.status);
        const data = await res.json();
        console.log('[FANTASY CUSTOM] Response:', data);
        removeTypingIndicator();
        
        if (data.success && data.url) {
            addChatPhotoMessage(data.url);
            if (fantasyLevel < 5) updateFantasyLevel(fantasyLevel + 1);
        } else {
            console.error('[FANTASY CUSTOM] Error:', data.error);
            addChatMessage("Je peux pas faire ca...", 'her');
        }
    } catch (err) {
        console.error('[FANTASY CUSTOM] Exception:', err);
        removeTypingIndicator();
        addChatMessage("Oops, probleme technique...", 'her');
    }
}

function addChatPhotoMessage(url) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message her';
    msgDiv.innerHTML = `
        <div class="chat-photo" onclick="openPhotoViewer('${url}')">
            <img src="${url}" alt="Photo">
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function openPhotoViewer(url) {
    const viewer = document.createElement('div');
    viewer.className = 'photo-viewer';
    viewer.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:500;display:flex;align-items:center;justify-content:center;cursor:pointer';
    viewer.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:10px">`;
    viewer.onclick = () => viewer.remove();
    document.body.appendChild(viewer);
}

function addTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const existing = container.querySelector('.typing-indicator');
    if (existing) return;
    
    const div = document.createElement('div');
    div.className = 'chat-message her typing-indicator';
    div.innerHTML = `
        <div style="display:flex;gap:5px;padding:10px">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const indicator = container.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}

// Quick action handlers
function requestQuickPhoto() {
    if (currentGirl) {
        showMeAction();
    }
}

async function requestQuickVideo() {
    if (!currentGirl) return;
    
    const videoCost = 50;
    if (userTokens < videoCost) {
        showToast('Pas assez de tokens pour une video (50 requis)');
        showBuyTokens();
        return;
    }
    
    showToast('Generation de video en cours... (peut prendre 1-2 min)');
    
    try {
        const res = await fetch('/api/generate_video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl_id: currentGirl.id,
                type: 'intro',
                tokens: userTokens
            })
        });
        
        const result = await res.json();
        console.log('[VIDEO] Result:', result);
        
        if (result.video_url) {
            userTokens -= result.cost || videoCost;
            updateTokenDisplay();
            showVideoModal(result.video_url, currentGirl.name);
            showToast('Video generee!');
        } else {
            showToast('Erreur: ' + (result.error || 'Video non disponible'));
        }
    } catch (err) {
        console.error('[VIDEO] Error:', err);
        showToast('Erreur de generation video');
    }
}

function showVideoModal(videoUrl, girlName) {
    const modal = document.createElement('div');
    modal.className = 'video-modal-overlay';
    modal.id = 'videoModal';
    modal.innerHTML = `
        <div class="video-modal-content">
            <button class="video-modal-close" onclick="closeVideoModal()">&times;</button>
            <h3 style="color:#fff;margin-bottom:15px">${girlName}</h3>
            <video src="${videoUrl}" controls autoplay loop playsinline style="max-width:100%;max-height:70vh;border-radius:12px"></video>
        </div>
    `;
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
    document.body.appendChild(modal);
    
    modal.addEventListener('click', e => {
        if (e.target === modal) closeVideoModal();
    });
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) modal.remove();
}

function sendCoquinMessage() {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = 'Tu me montres quelque chose de coquin?';
        input.focus();
    }
}

// ============================================
// TINDER STORIES & ONLINE CAMGIRLS
// ============================================

function renderTinderStories() {
    const container = document.getElementById('tinderStoriesContainer');
    if (!container) return;
    
    // Get random girls for stories
    const storyGirls = allGirls.slice(0, 15);
    
    container.innerHTML = storyGirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id] || '/api/placeholder/70/70';
        const viewed = Math.random() > 0.6; // Random viewed status
        
        return `
        <div class="tinder-story-bubble" onclick="openStory('${girl.id}')" style="animation: fadeIn 0.3s ease ${i * 0.05}s both">
            <div class="tinder-story-avatar animated-avatar glow-avatar ${viewed ? 'viewed' : ''}">
                <img src="${photoUrl}" alt="${girl.name}" loading="lazy">
            </div>
            <span class="tinder-story-name">${girl.name}</span>
        </div>`;
    }).join('');
}

function renderOnlineCamgirls() {
    const container = document.getElementById('onlineCamgirlsContainer');
    if (!container) return;
    
    // Filter camgirls and randomize online status
    const camgirls = allGirls.filter(g => g.is_camgirl).slice(0, 12);
    
    container.innerHTML = camgirls.map((girl, i) => {
        const photoUrl = girlPhotos[girl.id] || '/api/placeholder/60/60';
        const isOnline = Math.random() > 0.4; // 60% chance online
        const isLive = isOnline && Math.random() > 0.7; // 30% of online are live
        
        return `
        <div class="online-camgirl-bubble" onclick="openCamgirlProfile('${girl.id}')" style="animation: fadeIn 0.3s ease ${i * 0.05}s both">
            <div class="online-camgirl-avatar animated-avatar">
                <img src="${photoUrl}" alt="${girl.name}" loading="lazy">
                <div class="online-indicator ${isOnline ? '' : 'offline'}"></div>
                ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
            </div>
            <span class="online-camgirl-name">${girl.name}</span>
            <span class="online-camgirl-status ${isOnline ? '' : 'offline'}">${isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>`;
    }).join('');
}

function openCamgirlProfile(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (!girl) return;
    
    // Show camgirl profile with video intro
    showProfileModal(girl, true);
}

function showProfileModal(girl, withVideo = false) {
    const photoUrl = girlPhotos[girl.id] || '/api/placeholder/300/400';
    
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:400;overflow-y:auto;padding:20px';
    
    modal.innerHTML = `
        <div style="max-width:400px;margin:0 auto">
            <button onclick="this.closest('.profile-modal').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:#fff;font-size:24px;cursor:pointer">x</button>
            
            ${withVideo ? `
            <div class="profile-intro-animated">
                <img src="${photoUrl}" alt="${girl.name}">
                <div class="intro-overlay"></div>
                <div class="intro-info">
                    <div class="intro-name">${girl.name}, ${girl.age}</div>
                    <div class="intro-job">${girl.job || girl.bio || 'Camgirl'}</div>
                </div>
            </div>
            ` : `
            <img src="${photoUrl}" style="width:100%;border-radius:15px;margin-bottom:15px">
            `}
            
            <h2 style="color:#fff;font-size:24px;margin-bottom:10px">${girl.name}, ${girl.age}</h2>
            <p style="color:#a0a0c0;margin-bottom:20px">${girl.bio || girl.job || ''}</p>
            
            <div style="display:flex;gap:10px">
                <button onclick="startChat('${girl.id}');this.closest('.profile-modal').remove()" style="flex:1;padding:15px;background:linear-gradient(135deg, #00ffff, #ff00ff);border:none;border-radius:25px;color:#000;font-weight:600;cursor:pointer">
                    Discuter
                </button>
                <button onclick="requestProfileVideo('${girl.id}')" style="flex:1;padding:15px;background:linear-gradient(135deg, #ff0080, #ff00ff);border:none;border-radius:25px;color:#fff;font-weight:600;cursor:pointer">
                    Voir sa video
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function requestProfileVideo(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (!girl) return;
    
    if (userTokens < 500) {
        showToast('Il faut 500 tokens pour voir sa video');
        showBuyTokens();
        return;
    }
    
    showToast('Chargement de la video...');
    // Here we would call the video generation API
    // For now, show a placeholder message
    setTimeout(() => {
        showToast('Video de ' + girl.name + ' en preparation...');
    }, 1000);
}

// Update initApp to also render these new sections
const originalInitApp = typeof initApp === 'function' ? initApp : null;

function initTinderSections() {
    renderTinderStories();
    renderOnlineCamgirls();
}

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initTinderSections, 500);
});

// ============================================
// PIXEL DOJO VIDEO GENERATION
// ============================================

async function generateProfileVideo(girlId, videoType = 'intro') {
    showToast('Generation de la video en cours...');
    
    try {
        const response = await fetch('/api/generate_video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl_id: girlId,
                type: videoType
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.url) {
            showToast('Video generee!');
            showVideoPlayer(data.url, girlId);
            return data.url;
        } else {
            showToast(data.error || 'Erreur de generation');
            return null;
        }
    } catch (err) {
        showToast('Erreur de connexion');
        return null;
    }
}

function showVideoPlayer(videoUrl, girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    const name = girl ? girl.name : 'Video';
    
    const player = document.createElement('div');
    player.className = 'video-player-modal';
    player.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
    
    player.innerHTML = `
        <button onclick="this.closest('.video-player-modal').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:#fff;font-size:28px;cursor:pointer;z-index:10">x</button>
        <div style="text-align:center;margin-bottom:15px">
            <h2 style="color:#fff;font-size:20px">${name}</h2>
        </div>
        <video controls autoplay loop playsinline style="max-width:100%;max-height:70vh;border-radius:15px;box-shadow:0 0 30px rgba(0,255,255,0.3)">
            <source src="${videoUrl}" type="video/mp4">
        </video>
        <div style="margin-top:20px;display:flex;gap:10px">
            <button onclick="generateProfileVideo('${girlId}', 'sexy')" style="padding:12px 25px;background:linear-gradient(135deg, #ff0080, #ff00ff);border:none;border-radius:25px;color:#fff;font-weight:600;cursor:pointer">
                Video Sexy (5 credits)
            </button>
            <button onclick="startChat('${girlId}');this.closest('.video-player-modal').remove()" style="padding:12px 25px;background:linear-gradient(135deg, #00ffff, #ff00ff);border:none;border-radius:25px;color:#000;font-weight:600;cursor:pointer">
                Lui parler
            </button>
        </div>
    `;
    
    document.body.appendChild(player);
}

// Update requestProfileVideo to use Pixel Dojo
function requestProfileVideo(girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    if (!girl) return;
    
    if (userTokens < 50) {
        showToast('Il faut 50 tokens pour voir sa video');
        showBuyTokens();
        return;
    }
    
    // Deduct tokens and generate video
    userTokens -= 50;
    updateTokenDisplay();
    generateProfileVideo(girlId, 'intro');
}

// ============================================
// PHOTO/VIDEO GENERATOR PAGE
// ============================================

function showGeneratePhoto() {
    // Get all girls (not just matched) for better UX
    const availableGirls = allGirls.filter(g => !g.is_camgirl).slice(0, 30);
    
    const modal = document.createElement('div');
    modal.className = 'generator-modal';
    modal.innerHTML = `
        <div class="generator-content">
            <button class="close-btn" onclick="this.closest('.generator-modal').remove()">x</button>
            <h2>Generer une Photo</h2>
            <p class="generator-sub">Choisis une copine et decris la photo souhaitee</p>
            
            <div class="generator-form">
                <label>Choisir une copine</label>
                <div class="girl-selector" id="photoGirlSelector">
                    ${availableGirls.length > 0 ? availableGirls.map(g => {
                        const photoUrl = girlPhotos[g.id] || '/static/placeholder.jpg';
                        return `
                        <div class="girl-option" data-id="${g.id}" onclick="selectGeneratorGirl(this, '${g.id}')">
                            <img src="${photoUrl}" alt="${g.name}" onerror="this.src='/static/placeholder.jpg'">
                            <span>${g.name}</span>
                        </div>
                    `;}).join('') : '<p class="no-match-msg">Aucune fille disponible</p>'}
                </div>
                
                <label>Type de photo</label>
                <select id="photoTypeSelect">
                    <option value="portrait">Portrait elegant</option>
                    <option value="sexy">Tenue sexy</option>
                    <option value="lingerie">Lingerie</option>
                    <option value="bikini">Bikini</option>
                    <option value="nude">Nue (intimite)</option>
                </select>
                
                <label>Description (optionnel)</label>
                <textarea id="photoPromptInput" placeholder="Ex: sur la plage au coucher de soleil, dans sa chambre..."></textarea>
                
                <div class="generator-cost">
                    <span>Cout: 20 tokens</span>
                    <span>Balance: ${userTokens} tokens</span>
                </div>
                
                <button class="generate-btn" onclick="executePhotoGeneration()">
                    Generer la photo
                </button>
            </div>
            
            <div class="generator-result" id="photoResult" style="display:none">
                <img id="generatedPhotoImg" src="" alt="Photo generee">
                <div class="result-actions">
                    <button onclick="saveToCollection()">Sauvegarder</button>
                    <button onclick="showGeneratePhoto()">Autre photo</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

let selectedGeneratorGirl = null;

function selectGeneratorGirl(el, girlId) {
    document.querySelectorAll('.girl-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedGeneratorGirl = girlId;
}

async function executePhotoGeneration() {
    if (!selectedGeneratorGirl) {
        showToast('Choisis une copine');
        return;
    }
    
    if (userTokens < 20) {
        showToast('Il te faut 20 tokens');
        showBuyTokens();
        return;
    }
    
    const photoType = document.getElementById('photoTypeSelect').value;
    const customPrompt = document.getElementById('photoPromptInput').value;
    
    showToast('Generation en cours...');
    
    try {
        // Deduct tokens first
        const deductRes = await fetch('/api/tokens/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 20 })
        });
        
        if (!deductRes.ok) {
            showToast('Erreur de tokens');
            return;
        }
        
        userTokens -= 20;
        updateTokenDisplay();
        
        // Generate the photo
        const response = await fetch('/api/fantasy_photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl_id: selectedGeneratorGirl,
                pose_type: photoType,
                custom_prompt: customPrompt
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.url) {
            const resultDiv = document.getElementById('photoResult');
            const img = document.getElementById('generatedPhotoImg');
            img.src = data.url;
            resultDiv.style.display = 'block';
            document.querySelector('.generator-form').style.display = 'none';
            showToast('Photo generee!');
            
            // Save to collection
            addToGeneratedPhotos(data.url, selectedGeneratorGirl);
        } else {
            showToast(data.error || 'Erreur de generation');
        }
    } catch (err) {
        console.error('Generation error:', err);
        showToast('Erreur de connexion');
    }
}

function showGenerateVideo() {
    const availableGirls = allGirls.filter(g => !g.is_camgirl).slice(0, 30);
    
    const modal = document.createElement('div');
    modal.className = 'generator-modal';
    modal.innerHTML = `
        <div class="generator-content">
            <button class="close-btn" onclick="this.closest('.generator-modal').remove()">x</button>
            <h2>Generer une Video</h2>
            <p class="generator-sub">Cree une video animee de ta copine</p>
            
            <div class="generator-form">
                <label>Choisir une copine</label>
                <div class="girl-selector" id="videoGirlSelector">
                    ${availableGirls.length > 0 ? availableGirls.map(g => {
                        const photoUrl = girlPhotos[g.id] || '/static/placeholder.jpg';
                        return `
                        <div class="girl-option" data-id="${g.id}" onclick="selectGeneratorGirl(this, '${g.id}')">
                            <img src="${photoUrl}" alt="${g.name}" onerror="this.src='/static/placeholder.jpg'">
                            <span>${g.name}</span>
                        </div>
                    `;}).join('') : '<p class="no-match-msg">Aucune fille disponible</p>'}
                </div>
                
                <label>Type de video</label>
                <select id="videoTypeSelect">
                    <option value="intro">Presentation</option>
                    <option value="sexy">Dance sexy</option>
                    <option value="tease">Teasing</option>
                    <option value="strip">Strip tease</option>
                </select>
                
                <div class="generator-cost">
                    <span>Cout: 50 tokens</span>
                    <span>Balance: ${userTokens} tokens</span>
                </div>
                
                <button class="generate-btn" onclick="executeVideoGeneration()">
                    Generer la video
                </button>
            </div>
            
            <div class="generator-result" id="videoResult" style="display:none">
                <video id="generatedVideo" controls autoplay loop playsinline></video>
                <div class="result-actions">
                    <button onclick="saveVideoToCollection()">Sauvegarder</button>
                    <button onclick="showGenerateVideo()">Autre video</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function executeVideoGeneration() {
    if (!selectedGeneratorGirl) {
        showToast('Choisis une copine');
        return;
    }
    
    if (userTokens < 50) {
        showToast('Il te faut 50 tokens');
        showBuyTokens();
        return;
    }
    
    const videoType = document.getElementById('videoTypeSelect').value;
    
    showToast('Generation de la video... (30-60 sec)');
    
    try {
        const deductRes = await fetch('/api/tokens/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 50 })
        });
        
        if (!deductRes.ok) {
            showToast('Erreur de tokens');
            return;
        }
        
        userTokens -= 50;
        updateTokenDisplay();
        
        const response = await fetch('/api/generate_video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl_id: selectedGeneratorGirl,
                type: videoType
            })
        });
        
        const data = await response.json();
        console.log('[VIDEO GEN] Response:', data);
        
        const videoUrl = data.video_url || data.url;
        if (videoUrl) {
            const resultDiv = document.getElementById('videoResult');
            const video = document.getElementById('generatedVideo');
            video.src = videoUrl;
            resultDiv.style.display = 'block';
            document.querySelector('.generator-form').style.display = 'none';
            showToast('Video generee!');
        } else {
            showToast(data.error || 'Erreur de generation video');
        }
    } catch (err) {
        console.error('Video generation error:', err);
        showToast('Erreur de connexion');
    }
}

// Collection storage
function addToGeneratedPhotos(url, girlId) {
    let photos = JSON.parse(localStorage.getItem('generatedPhotos') || '[]');
    photos.unshift({ url, girlId, date: new Date().toISOString() });
    localStorage.setItem('generatedPhotos', JSON.stringify(photos.slice(0, 100)));
}

function saveToCollection() {
    showToast('Photo sauvegardee dans ta collection!');
    document.querySelector('.generator-modal').remove();
}

function saveVideoToCollection() {
    showToast('Video sauvegardee!');
    document.querySelector('.generator-modal').remove();
}

// ============================================
// NEW TABBED GENERATOR (Embedded in Page)
// ============================================

let generatorType = 'photo';
let generatorSelectedGirl = null;

function initGeneratorPage() {
    populateGeneratorGirls();
}

function populateGeneratorGirls() {
    const container = document.getElementById('generatorGirlSelect');
    if (!container) return;
    
    const availableGirls = [...allGirls.filter(g => !g.is_camgirl).slice(0, 20), ...myCreatedGirls];
    
    if (availableGirls.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">Aucune copine disponible</p>';
        return;
    }
    
    container.innerHTML = availableGirls.map((g, i) => {
        const photoUrl = g.photo || girlPhotos[g.id] || '/static/placeholder.jpg';
        const isFirst = i === 0;
        if (isFirst) generatorSelectedGirl = g.id;
        return `
            <div class="girl-select-item ${isFirst ? 'selected' : ''}" data-id="${g.id}" onclick="selectGenGirl(this, '${g.id}')">
                <img class="girl-select-img" src="${photoUrl}" alt="${g.name}" onerror="this.src='/static/placeholder.jpg'">
                <span class="girl-select-name">${g.name}</span>
            </div>
        `;
    }).join('');
}

function selectGenGirl(el, girlId) {
    document.querySelectorAll('.girl-select-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    generatorSelectedGirl = girlId;
}

function setGeneratorType(type) {
    generatorType = type;
    const cost = type === 'video' ? 50 : 20;
    
    document.getElementById('btnGenPhoto').classList.toggle('active', type === 'photo');
    document.getElementById('btnGenVideo').classList.toggle('active', type === 'video');
    document.getElementById('genCost').textContent = `${cost} tokens`;
}

function showGeneratorTab(tabName, clickedEl) {
    const tabs = document.querySelectorAll('.generator-tab');
    const contents = document.querySelectorAll('.generator-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    if (clickedEl) {
        clickedEl.classList.add('active');
    }
    
    const tabId = `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
    const content = document.getElementById(tabId);
    if (content) content.classList.add('active');
}

async function generateMedia() {
    if (!generatorSelectedGirl) {
        showToast('Choisis une copine');
        return;
    }
    
    const cost = generatorType === 'video' ? 50 : 20;
    
    if (userTokens < cost) {
        showToast(`Il te faut ${cost} tokens`);
        showBuyTokens();
        return;
    }
    
    // Collect all selections from all tabs
    const clothes = getImageGridValue('gridGenClothes');
    const lingerie = getImageGridValue('gridGenLingerie');
    const bikini = getImageGridValue('gridGenBikinis');
    const costume = getImageGridValue('gridGenCostumes');
    const luxe = getImageGridValue('gridGenLuxe');
    const sport = getImageGridValue('gridGenSportwear');
    const soiree = getImageGridValue('gridGenSoiree');
    const pose = getImageGridValue('gridGenPoses');
    const scene = getImageGridValue('gridGenScenes');
    const vehicule = getImageGridValue('gridGenVehicules');
    const eclairage = getImageGridValue('gridGenEclairages');
    const angle = getImageGridValue('gridGenAngles');
    const accessories = getMultiImageGridValues('gridGenAccessoires') || [];
    const jeu = getImageGridValue('gridGenJeux');
    
    // Build prompt from all selections (only non-empty values)
    const promptParts = [
        clothes, lingerie, bikini, costume, luxe, sport, soiree,
        pose, scene, vehicule, eclairage, angle, ...accessories, jeu
    ].filter(Boolean);
    
    const prompt = promptParts.length > 0 ? promptParts.join(', ') : 'sexy pose, lingerie';
    
    showToast('Generation en cours...');
    
    try {
        const deductRes = await fetch('/api/tokens/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: cost })
        });
        
        if (!deductRes.ok) {
            showToast('Erreur de tokens');
            return;
        }
        
        userTokens -= cost;
        updateTokenDisplay();
        
        if (generatorType === 'photo') {
            const response = await fetch('/api/fantasy_photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    girl_id: generatorSelectedGirl,
                    pose_type: clothes,
                    custom_prompt: prompt
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.url) {
                showToast('Photo generee!');
                addToGeneratedPhotos(data.url, generatorSelectedGirl);
                showGeneratedResult(data.url, 'photo');
            } else {
                showToast(data.error || 'Erreur de generation');
            }
        } else {
            const response = await fetch('/api/generate_video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    girl_id: generatorSelectedGirl,
                    type: 'custom',
                    prompt: prompt
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.url) {
                showToast('Video generee!');
                showGeneratedResult(data.url, 'video');
            } else {
                showToast(data.error || 'Erreur de generation');
            }
        }
    } catch (err) {
        console.error('Generation error:', err);
        showToast('Erreur de connexion');
    }
}

function showGeneratedResult(url, type) {
    const modal = document.createElement('div');
    modal.className = 'generator-modal';
    modal.innerHTML = `
        <div class="generator-content">
            <button class="close-btn" onclick="this.closest('.generator-modal').remove()">x</button>
            <h2>${type === 'photo' ? 'Photo Generee' : 'Video Generee'}</h2>
            ${type === 'photo' 
                ? `<img src="${url}" style="max-width:100%; border-radius:15px; margin: 20px 0;">`
                : `<video src="${url}" controls autoplay loop playsinline style="max-width:100%; border-radius:15px; margin: 20px 0;"></video>`
            }
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="cta-btn" onclick="this.closest('.generator-modal').remove()">Fermer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// MICRO-VIDEO (Animate Photo) for Action en Direct
// ============================================

async function animatePhotoToVideo(photoUrl, girlId) {
    if (userTokens < 30) {
        showToast('Il faut 30 tokens pour animer cette photo');
        showBuyTokens();
        return;
    }
    
    showToast('Animation en cours... (20-40 sec)');
    
    try {
        const deductRes = await fetch('/api/tokens/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 30 })
        });
        
        if (!deductRes.ok) {
            showToast('Erreur de tokens');
            return;
        }
        
        userTokens -= 30;
        updateTokenDisplay();
        
        const response = await fetch('/api/animate_photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: photoUrl,
                girl_id: girlId
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.video_url) {
            showMicroVideo(data.video_url, girlId);
            showToast('Photo animee!');
        } else {
            showToast(data.error || 'Erreur animation');
        }
    } catch (err) {
        console.error('Animate photo error:', err);
        showToast('Erreur de connexion');
    }
}

function showMicroVideo(videoUrl, girlId) {
    const girl = allGirls.find(g => g.id === girlId);
    const name = girl ? girl.name : 'Video';
    
    const player = document.createElement('div');
    player.className = 'micro-video-modal';
    player.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
    
    player.innerHTML = `
        <button onclick="this.closest('.micro-video-modal').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:#fff;font-size:28px;cursor:pointer;z-index:10">x</button>
        <div style="text-align:center;margin-bottom:15px">
            <h2 style="color:#fff;font-size:20px">${name} - Video animee</h2>
        </div>
        <video controls autoplay loop playsinline style="max-width:100%;max-height:70vh;border-radius:15px;box-shadow:0 0 30px rgba(255,0,128,0.5)">
            <source src="${videoUrl}" type="video/mp4">
        </video>
        <div style="margin-top:20px">
            <button onclick="this.closest('.micro-video-modal').remove()" style="padding:12px 30px;background:linear-gradient(135deg, #ff0080, #ff00ff);border:none;border-radius:25px;color:#fff;font-weight:600;cursor:pointer">
                Fermer
            </button>
        </div>
    `;
    
    document.body.appendChild(player);
}

// ====== XP PROGRESSION SYSTEM (Candy AI Style) ======
const XP_LEVELS = [35, 75, 120, 180, 250, 350, 500, 700];

const XP_REQUESTS_BY_PERSONALITY = {
    'dominante': [
        { level: 1, text: "Je te chauffe en douceur" },
        { level: 2, text: "Je te montre mes seins" },
        { level: 2, text: "Je te donne des ordres" },
        { level: 3, text: "Je t'attache et je joue avec toi" },
        { level: 4, text: "Je te chevauche et je te domine" },
        { level: 5, text: "Tu me supplies de te toucher" },
        { level: 6, text: "Je te monte dessus et je controle" },
        { level: 7, text: "Tu fais tout ce que je dis" },
        { level: 8, text: "Je te fais jouir quand je decide" }
    ],
    'soumise': [
        { level: 1, text: "Je te chauffe en douceur" },
        { level: 2, text: "Je te montre mes seins timidement" },
        { level: 2, text: "Je fais tout ce que tu veux" },
        { level: 3, text: "Je me deshabille pour toi" },
        { level: 4, text: "Je me mets a genoux devant toi" },
        { level: 5, text: "Je te suce avec devotion" },
        { level: 6, text: "Tu me prends comme tu veux" },
        { level: 7, text: "Je suis ta petite esclave" },
        { level: 8, text: "Tu jouis ou tu veux sur moi" }
    ],
    'nympho': [
        { level: 1, text: "Je te chauffe intensement" },
        { level: 2, text: "Je te montre tout mon corps" },
        { level: 2, text: "J'ai tellement envie de toi" },
        { level: 3, text: "Je me touche devant toi" },
        { level: 4, text: "Je veux te sentir en moi" },
        { level: 5, text: "Je te chevauche sans arret" },
        { level: 6, text: "On fait l'amour toute la nuit" },
        { level: 7, text: "Je veux jouir avec toi" },
        { level: 8, text: "Tu me remplis completement" }
    ],
    'romantique': [
        { level: 1, text: "Je te fais des caresses douces" },
        { level: 2, text: "Je me deshabille sensuellement" },
        { level: 2, text: "Je t'embrasse passionnement" },
        { level: 3, text: "On fait l'amour tendrement" },
        { level: 4, text: "Je te regarde dans les yeux" },
        { level: 5, text: "Je te murmure des mots doux" },
        { level: 6, text: "On s'enlace apres l'amour" },
        { level: 7, text: "Je jouis dans tes bras" },
        { level: 8, text: "Tu me fais l'amour passionnement" }
    ],
    'default': [
        { level: 1, text: "Je te chauffe en douceur" },
        { level: 2, text: "Je te montre mon cul" },
        { level: 2, text: "Je montre mes seins" },
        { level: 3, text: "J'enleve absolument tout" },
        { level: 4, text: "J'ecarte mon cul" },
        { level: 5, text: "Je te fais jouir avec mes mains" },
        { level: 6, text: "Je te monte dessus et je bouge" },
        { level: 7, text: "Missionnaire puis tu finis sur moi" },
        { level: 8, text: "Je te suce et je prends tout" }
    ]
};

let currentXPLevel = 1;
let currentXP = 0;
let currentGirlPersonality = 'default';

function getGirlPersonality(girl) {
    if (!girl) return 'default';
    const type = (girl.type || girl.tagline || '').toLowerCase();
    if (type.includes('dominante') || type.includes('domina')) return 'dominante';
    if (type.includes('soumise') || type.includes('timide')) return 'soumise';
    if (type.includes('nympho') || type.includes('insatiable')) return 'nympho';
    if (type.includes('romantique') || type.includes('douce')) return 'romantique';
    return 'default';
}

function getGirlRequests() {
    return XP_REQUESTS_BY_PERSONALITY[currentGirlPersonality] || XP_REQUESTS_BY_PERSONALITY['default'];
}

function loadGirlXP(girlId) {
    const xpData = JSON.parse(localStorage.getItem(`xp_${girlId}`) || '{"level":1,"xp":0}');
    currentXPLevel = xpData.level;
    currentXP = xpData.xp;
    if (currentGirl) {
        currentGirlPersonality = getGirlPersonality(currentGirl);
    }
    renderXPSection();
}

function saveGirlXP(girlId) {
    localStorage.setItem(`xp_${girlId}`, JSON.stringify({level: currentXPLevel, xp: currentXP}));
}

function addXP(amount) {
    const girlId = currentGirl?.id || window.currentGirlId;
    if (!girlId) return;
    
    // Show XP popup animation (Candy AI style)
    if (typeof showXpPopup === 'function') {
        showXpPopup(amount);
    }
    if (typeof showXpPopupCandy === 'function') {
        showXpPopupCandy(amount);
    }
    
    currentXP += amount;
    const maxXP = XP_LEVELS[currentXPLevel - 1] || 35;
    if (currentXP >= maxXP && currentXPLevel < 8) {
        currentXPLevel++;
        currentXP = 0;
        showLevelUpNotification(currentXPLevel);
    }
    saveGirlXP(girlId);
    
    // Sync with server
    const xpType = amount >= 8 ? 'hot' : (amount >= 5 ? 'compliment' : 'sexy');
    console.log('[XP] Sending XP request for girl:', girlId, 'amount:', amount);
    fetch('/api/action/add-xp', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'same-origin',
        body: JSON.stringify({ girl_id: girlId, type: xpType })
    }).then(r => r.json()).then(data => {
        console.log('[XP] Response:', data);
        if (data.success) {
            // Update Candy AI style bubble
            if (typeof updateXpBubble === 'function') {
                updateXpBubble(data.level, data.xp_in_level, data.xp_for_next);
            }
            if (typeof updateXpBubbleCandy === 'function') {
                updateXpBubbleCandy(data.level, data.xp_in_level, data.xp_for_next);
            }
            if (typeof updateFixedActionPanel === 'function') {
                updateFixedActionPanel();
            }
        }
    }).catch(e => console.log('XP sync error:', e));
}

function calculateXPGain(userMessage, aiReply) {
    const reply = aiReply.toLowerCase();
    const msg = userMessage.toLowerCase();
    
    // Positive keywords = she likes it = more XP
    const positiveWords = ['mmm', 'oui', 'j\'aime', 'j\'adore', 'excite', 'envie', 'chaud', 'sexy', 'magnifique', 'beau', 'gentil', 'mignon', 'hot', 'wow', 'oh oui', 'continue', 'encore', 'plaisir', 'bien'];
    const negativeWords = ['non', 'arrete', 'stop', 'degage', 'connard', 'pervers', 'chelou', 'bizarre', 'pas envie', 'laisse-moi'];
    
    let xp = 2; // Base XP per message
    
    // Bonus for positive responses
    for (const word of positiveWords) {
        if (reply.includes(word)) xp += 1;
    }
    
    // Penalty for negative responses
    for (const word of negativeWords) {
        if (reply.includes(word)) xp -= 2;
    }
    
    // Bonus for longer engaging messages
    if (msg.length > 50) xp += 1;
    if (reply.length > 100) xp += 1;
    
    // Bonus for romantic/compliment messages
    const romanticWords = ['belle', 'magnifique', 'jolie', 'adorable', 'parfaite', 'sublime', 'princesse'];
    for (const word of romanticWords) {
        if (msg.includes(word)) xp += 2;
    }
    
    return Math.max(0, Math.min(xp, 10)); // Cap between 0 and 10
}

function showLevelUpNotification(level) {
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = `<span>Niveau ${level} debloqu\u00e9!</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function updateActionPanel() {
    const maxXP = XP_LEVELS[currentXPLevel - 1] || 35;
    const progress = maxXP > 0 ? (currentXP / maxXP * 100) : 0;
    
    const levelEl = document.getElementById('papfLevel');
    const xpFill = document.getElementById('papfXpFill');
    const xpText = document.getElementById('papfXpText');
    
    if (levelEl) levelEl.textContent = currentXPLevel;
    if (xpFill) xpFill.style.width = Math.min(100, progress) + '%';
    if (xpText) xpText.textContent = currentXP + ' / ' + maxXP + ' XP';
    
    console.log('[XP] Panel updated: Level', currentXPLevel, 'XP', currentXP, '/', maxXP);
}

function openActionPanel() {
    document.getElementById('actionDirectPanel').classList.add('open');
}

function closeActionPanel() {
    document.getElementById('actionDirectPanel').classList.remove('open');
}

function toggleMoreActions() {
    document.getElementById('moreActionsSection').classList.toggle('expanded');
}

function executeCurrentAction() {
    if (!currentGirl) return;
    const requests = getGirlRequests();
    const unlocked = requests.filter(r => r.level <= currentXPLevel);
    if (unlocked.length > 0) {
        const action = unlocked[unlocked.length - 1];
        openChat(currentGirl.id);
        setTimeout(() => {
            document.getElementById('chatInput').value = action.text;
            sendMessage();
        }, 500);
    }
    closeActionPanel();
}

function renderXPSection() {
    const badge = document.getElementById('xpLevelBadge');
    const currentLvl = document.getElementById('xpCurrentLevel');
    const targetLvl = document.getElementById('xpTargetLevel');
    const xpCurrent = document.getElementById('xpCurrentXP');
    const xpMax = document.getElementById('xpMaxXP');
    const progressFill = document.getElementById('xpProgressFill');
    const requestsList = document.getElementById('xpRequestsList');
    const levelStatus = document.getElementById('xpLevelStatus');
    const currentActionText = document.getElementById('currentActionText');
    const moreCount = document.getElementById('moreActionsCount');
    
    if (!badge || !requestsList) return;
    
    badge.textContent = currentXPLevel;
    if (currentLvl) currentLvl.textContent = currentXPLevel;
    if (targetLvl) targetLvl.textContent = Math.min(currentXPLevel + 1, 8);
    
    if (levelStatus) {
        if (currentXPLevel >= 2) {
            levelStatus.textContent = `NIVEAU ${currentXPLevel} DEVERROUILLE !`;
            levelStatus.style.color = '#10b981';
        } else {
            levelStatus.textContent = `Niveau ${currentXPLevel}`;
            levelStatus.style.color = 'rgba(255,255,255,0.6)';
        }
    }
    
    const maxXP = XP_LEVELS[currentXPLevel - 1] || 35;
    if (xpCurrent) xpCurrent.textContent = currentXP;
    if (xpMax) xpMax.textContent = maxXP;
    
    const progress = Math.min((currentXP / maxXP) * 100, 100);
    if (progressFill) progressFill.style.width = progress + '%';
    
    const requests = getGirlRequests();
    
    // Update current action text
    const unlockedRequests = requests.filter(r => r.level <= currentXPLevel);
    if (currentActionText && unlockedRequests.length > 0) {
        currentActionText.textContent = unlockedRequests[unlockedRequests.length - 1].text;
    }
    
    // Update locked count
    const lockedCount = requests.filter(r => r.level > currentXPLevel).length;
    if (moreCount) {
        moreCount.textContent = `+${lockedCount} Actions hot`;
    }
    requestsList.innerHTML = requests.map((req, i) => {
        const isUnlocked = req.level <= currentXPLevel;
        return `
            <div class="xp-request ${isUnlocked ? 'unlocked' : 'locked'}" onclick="${isUnlocked ? `executeXPRequest(${i})` : ''}">
                <span class="xp-request-text">${req.text}</span>
                ${isUnlocked ? `
                    <div class="xp-request-play">
                        <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                    </div>
                ` : `
                    <div class="xp-request-lock">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Niveau ${req.level}
                    </div>
                `}
            </div>
        `;
    }).join('');
}

async function executeXPRequest(index) {
    if (!currentGirl) return;
    const requests = getGirlRequests();
    const request = requests[index];
    if (request.level > currentXPLevel) return;
    
    openChat(currentGirl.id);
    setTimeout(() => {
        document.getElementById('chatInput').value = request.text;
        sendMessage();
    }, 500);
}

// ====== GENERATE PHOTO POPUP ======
let selectedOutfit = 'lingerie';
let selectedScene = 'chambre';
let selectedPose = 'debout';

function openGeneratePopup() {
    if (!currentGirl) return;
    const popup = document.getElementById('generatePhotoPopup');
    const previewImg = document.getElementById('generatePreviewImg');
    
    const photoUrl = girlPhotos[currentGirl.id];
    if (photoUrl) previewImg.src = photoUrl;
    
    popup.classList.add('active');
    initGenOptions();
}

function closeGeneratePopup() {
    document.getElementById('generatePhotoPopup').classList.remove('active');
}

function showGenTab(tab) {
    document.querySelectorAll('.gen-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.gen-tab[data-tab="${tab}"]`).classList.add('active');
    
    document.getElementById('genOutfit').style.display = tab === 'outfit' ? 'grid' : 'none';
    document.getElementById('genScene').style.display = tab === 'scene' ? 'grid' : 'none';
    document.getElementById('genPose').style.display = tab === 'pose' ? 'grid' : 'none';
}

function initGenOptions() {
    document.querySelectorAll('#genOutfit .gen-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('#genOutfit .gen-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedOutfit = opt.dataset.value;
        };
    });
    document.querySelectorAll('#genScene .gen-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('#genScene .gen-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedScene = opt.dataset.value;
        };
    });
    document.querySelectorAll('#genPose .gen-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('#genPose .gen-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedPose = opt.dataset.value;
        };
    });
}

async function submitGeneratePhoto() {
    if (!currentGirl) return;
    
    try {
        closeGeneratePopup();
        
        const loadingMsg = addChatMessage('system', 'Generation de ta photo personnalisee en cours...');
        
        const resp = await fetch('/api/generate_custom_photo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                girl_id: currentGirl.id,
                outfit: selectedOutfit,
                scene: selectedScene,
                pose: selectedPose
            })
        });
        
        if (resp.status === 402) {
            if (loadingMsg) loadingMsg.remove();
            showBuyTokens();
            return;
        }
        
        if (resp.ok) {
            const data = await resp.json();
            if (loadingMsg) loadingMsg.remove();
            updateTokenDisplay();
            if (data.photo_url) {
                addChatMessage('girl', `[PHOTO GENEREE]`);
                addChatPhoto(data.photo_url);
            }
        } else {
            if (loadingMsg) loadingMsg.remove();
            console.error('Generation failed:', resp.status);
        }
    } catch (e) {
        console.error('Error generating custom photo:', e);
    }
}

function addChatPhoto(url) {
    const container = document.getElementById('chatMessages');
    const photoDiv = document.createElement('div');
    photoDiv.className = 'chat-message girl';
    photoDiv.innerHTML = `<img src="${url}" class="chat-photo" onclick="openFullscreenPhoto('${url}')">`;
    container.appendChild(photoDiv);
    container.scrollTop = container.scrollHeight;
}

// ====== GAMES SYSTEM ======
let currentGame = null;
let gameState = {};

function showGamesPopup() {
    document.getElementById('gamesPopup').classList.add('active');
}

function closeGamesPopup() {
    document.getElementById('gamesPopup').classList.remove('active');
}

function startGame(gameType) {
    closeGamesPopup();
    currentGame = gameType;
    gameState = { round: 1, score: 0 };
    
    const overlay = document.getElementById('gameOverlay');
    const title = document.getElementById('gameTitle');
    const area = document.getElementById('gameArea');
    const controls = document.getElementById('gameControls');
    
    overlay.classList.add('active');
    
    switch(gameType) {
        case 'strip': initStripPoker(title, area, controls); break;
        case 'dice': initDiceGame(title, area, controls); break;
        case 'truth': initTruthDare(title, area, controls); break;
        case 'bottle': initBottleGame(title, area, controls); break;
        case 'massage': initMassageGame(title, area, controls); break;
        case 'ice': initIceGame(title, area, controls); break;
    }
}

function endGame() {
    document.getElementById('gameOverlay').classList.remove('active');
    currentGame = null;
    gameState = {};
}

// ====== STRIP POKER (Real Poker) ======
// XP-based rewards system - no tokens, must earn it!
const STRIP_CLOTHES = [
    { name: 'Haut', actionId: 'haut_off', xpRequired: 1, difficulty: 0.4 },
    { name: 'Jupe', actionId: 'jupe_off', xpRequired: 2, difficulty: 0.45 },
    { name: 'Soutien-gorge', actionId: 'soutien_gorge_off', xpRequired: 3, difficulty: 0.5 },
    { name: 'Culotte', actionId: 'culotte_off', xpRequired: 5, difficulty: 0.55 },
    { name: 'Tout', actionId: 'nue_complete', xpRequired: 7, difficulty: 0.6 }
];
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const HAND_RANKS = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Suite', 'Couleur', 'Full', 'Carre', 'Quinte flush'];

function createDeck() {
    const deck = [];
    for (let s = 0; s < 4; s++) {
        for (let v = 0; v < 13; v++) {
            deck.push({ suit: CARD_SUITS[s], value: CARD_VALUES[v], numValue: v });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function evaluateHand(cards) {
    const values = cards.map(c => c.numValue).sort((a, b) => a - b);
    const suits = cards.map(c => c.suit);
    
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = values.every((v, i) => i === 0 || v === values[i-1] + 1);
    
    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const countVals = Object.values(counts).sort((a, b) => b - a);
    
    if (isFlush && isStraight) return { rank: 8, name: 'Quinte flush', high: values[4] };
    if (countVals[0] === 4) return { rank: 7, name: 'Carre', high: values[4] };
    if (countVals[0] === 3 && countVals[1] === 2) return { rank: 6, name: 'Full', high: values[4] };
    if (isFlush) return { rank: 5, name: 'Couleur', high: values[4] };
    if (isStraight) return { rank: 4, name: 'Suite', high: values[4] };
    if (countVals[0] === 3) return { rank: 3, name: 'Brelan', high: values[4] };
    if (countVals[0] === 2 && countVals[1] === 2) return { rank: 2, name: 'Double paire', high: values[4] };
    if (countVals[0] === 2) return { rank: 1, name: 'Paire', high: values[4] };
    return { rank: 0, name: 'Carte haute', high: values[4] };
}

function initStripPoker(title, area, controls) {
    title.textContent = 'Strip Poker';
    gameState.clothesIndex = 0;
    gameState.deck = createDeck();
    gameState.playerHand = [];
    gameState.girlHand = [];
    gameState.phase = 'deal';
    gameState.held = [false, false, false, false, false];
    
    renderPokerGame(area, controls);
}

function renderPokerGame(area, controls) {
    const cloth = STRIP_CLOTHES[gameState.clothesIndex];
    const canPlay = currentXPLevel >= cloth.xpRequired;
    const difficultyPercent = Math.round(cloth.difficulty * 100);
    
    area.innerHTML = `
        <div class="poker-status">
            <span>Vetement en jeu: <strong>${cloth.name}</strong></span>
            <span class="poker-score">Manches gagnees: ${gameState.clothesIndex}/5</span>
        </div>
        
        <div class="xp-requirement ${canPlay ? 'unlocked' : 'locked'}">
            <span>Niveau requis: ${cloth.xpRequired}</span>
            <span>Ton niveau: ${currentXPLevel}</span>
            <span>Difficulte: ${difficultyPercent}%</span>
        </div>
        
        ${!canPlay ? `<div class="locked-message">Continue a chatter pour atteindre le niveau ${cloth.xpRequired}!</div>` : ''}
        
        <div class="poker-table" style="${canPlay ? '' : 'opacity:0.5;pointer-events:none'}">
            <div class="poker-hand girl-hand" id="girlHand">
                <p class="hand-label">Ses cartes</p>
                <div class="poker-cards">
                    ${gameState.girlHand.length ? gameState.girlHand.map(c => 
                        `<div class="poker-card ${gameState.phase === 'showdown' ? '' : 'flipped'}">${gameState.phase === 'showdown' ? renderCard(c) : ''}</div>`
                    ).join('') : '<div class="poker-cards-placeholder">En attente...</div>'}
                </div>
                ${gameState.phase === 'showdown' && gameState.girlHand.length ? `<p class="hand-rank">${evaluateHand(gameState.girlHand).name}</p>` : ''}
            </div>
            
            <div class="poker-hand player-hand" id="playerHand">
                <p class="hand-label">Tes cartes ${gameState.phase === 'hold' ? '(clique pour garder)' : ''}</p>
                <div class="poker-cards">
                    ${gameState.playerHand.map((c, i) => 
                        `<div class="poker-card ${gameState.held[i] ? 'held' : ''}" onclick="toggleHold(${i})">${renderCard(c)}</div>`
                    ).join('')}
                </div>
                ${gameState.playerHand.length ? `<p class="hand-rank">${evaluateHand(gameState.playerHand).name}</p>` : ''}
            </div>
        </div>
        
        <div class="poker-result" id="pokerResult"></div>
        
        <div class="poker-actions-preview" style="margin-top:20px;padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;">
            <p style="color:#a855f7;font-size:12px;margin-bottom:8px">Recompense si tu gagnes:</p>
            <p style="font-size:14px">Photo + Video automatiques!</p>
        </div>
    `;
    
    if (!canPlay) {
        controls.innerHTML = `<button class="game-btn secondary" onclick="endGame()">Retour</button>`;
    } else if (gameState.phase === 'deal') {
        controls.innerHTML = `<button class="game-btn primary" onclick="dealPoker()">Distribuer</button>`;
    } else if (gameState.phase === 'hold') {
        controls.innerHTML = `<button class="game-btn primary" onclick="drawPoker()">Echanger</button>`;
    } else if (gameState.phase === 'showdown') {
        controls.innerHTML = `<button class="game-btn primary" onclick="nextPokerRound()">Continuer</button>`;
    }
}

function renderCard(card) {
    const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#333';
    return `<span style="color:${color}">${card.value}${card.suit}</span>`;
}

function toggleHold(index) {
    if (gameState.phase !== 'hold') return;
    gameState.held[index] = !gameState.held[index];
    renderPokerGame(document.getElementById('gameArea'), document.getElementById('gameControls'));
}

function dealPoker() {
    gameState.deck = createDeck();
    gameState.playerHand = gameState.deck.splice(0, 5);
    gameState.girlHand = gameState.deck.splice(0, 5);
    gameState.held = [false, false, false, false, false];
    gameState.phase = 'hold';
    renderPokerGame(document.getElementById('gameArea'), document.getElementById('gameControls'));
}

function drawPoker() {
    const cloth = STRIP_CLOTHES[gameState.clothesIndex];
    
    // Replace non-held cards
    for (let i = 0; i < 5; i++) {
        if (!gameState.held[i]) {
            gameState.playerHand[i] = gameState.deck.pop();
        }
    }
    
    // Girl AI becomes smarter based on difficulty
    const girlCounts = {};
    gameState.girlHand.forEach(c => girlCounts[c.numValue] = (girlCounts[c.numValue] || 0) + 1);
    const keepThreshold = Math.floor(10 * cloth.difficulty); // Higher difficulty = keeps more cards
    for (let i = 0; i < 5; i++) {
        // AI keeps pairs and high cards based on difficulty
        const shouldKeep = girlCounts[gameState.girlHand[i].numValue] >= 2 || 
                          gameState.girlHand[i].numValue >= keepThreshold ||
                          Math.random() < cloth.difficulty * 0.5;
        if (!shouldKeep) {
            gameState.girlHand[i] = gameState.deck.pop();
        }
    }
    
    gameState.phase = 'showdown';
    renderPokerGame(document.getElementById('gameArea'), document.getElementById('gameControls'));
    
    // Determine winner with difficulty modifier
    const playerEval = evaluateHand(gameState.playerHand);
    const girlEval = evaluateHand(gameState.girlHand);
    
    const result = document.getElementById('pokerResult');
    // Difficulty gives girl slight advantage on ties
    let won = playerEval.rank > girlEval.rank;
    if (playerEval.rank === girlEval.rank) {
        // On tie, player needs higher card to win (harder at higher difficulty)
        const tieBreaker = Math.random() < cloth.difficulty ? 1 : 0;
        won = playerEval.high > girlEval.high + tieBreaker;
    }
    
    if (won) {
        result.className = 'poker-result win';
        result.innerHTML = `Tu gagnes avec ${playerEval.name}! Elle enleve son ${cloth.name}`;
        
        // Award XP for winning
        addXP(5 + gameState.clothesIndex * 2);
        
        if (currentGirl) {
            sendGameMessage(`*enleve son ${cloth.name} lentement pour toi*`);
            // Auto-generate photo as reward (no tokens!)
            generateGameReward('poker', cloth.actionId);
        }
        
        gameState.clothesIndex = Math.min(gameState.clothesIndex + 1, STRIP_CLOTHES.length - 1);
    } else {
        result.className = 'poker-result lose';
        result.innerHTML = `Elle gagne avec ${girlEval.name}! Recommence...`;
        // Small XP for trying
        addXP(1);
    }
}

function nextPokerRound() {
    if (gameState.clothesIndex >= 5) {
        endGame();
        return;
    }
    gameState.phase = 'deal';
    gameState.playerHand = [];
    gameState.girlHand = [];
    gameState.held = [false, false, false, false, false];
    renderPokerGame(document.getElementById('gameArea'), document.getElementById('gameControls'));
}

// Generate photo + video as reward (no tokens, earned through gameplay!)
async function generateGameReward(gameType, actionId) {
    if (!currentGirl) return;
    
    // Add to chat as loading
    chatMessages.push({ sender: 'her', text: '[Tu as merite ta recompense! Chargement...]', time: 'Maintenant' });
    renderChatMessages();
    
    try {
        // Fetch photo reward from local library or generate
        const resp = await fetch('/api/generate_game_reward', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                girl_id: currentGirl.id,
                game: gameType,
                action_id: actionId
            })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            chatMessages[chatMessages.length - 1] = { sender: 'her', text: 'Voila ta recompense...', time: 'Maintenant' };
            renderChatMessages();
            
            if (data.photo_url) {
                addChatPhoto(data.photo_url);
            }
            if (data.video_url) {
                addChatVideo(data.video_url);
            }
        } else {
            chatMessages[chatMessages.length - 1] = { sender: 'her', text: '*te fait un clin d oeil coquin*', time: 'Maintenant' };
            renderChatMessages();
        }
    } catch (e) {
        console.error('Game reward generation error:', e);
        chatMessages[chatMessages.length - 1] = { sender: 'her', text: '*te montre ce que tu as gagne*', time: 'Maintenant' };
        renderChatMessages();
    }
}

async function generateGamePhoto(prompt) {
    if (!currentGirl) return;
    
    chatMessages.push({ sender: 'her', text: '[Generation de photo...]', time: 'Maintenant' });
    renderChatMessages();
    
    try {
        const resp = await fetch('/api/generate_custom_photo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                girl_id: currentGirl.id,
                outfit: prompt,
                scene: 'bedroom intimate lighting',
                pose: 'seductive'
            })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            if (data.photo_url) {
                chatMessages[chatMessages.length - 1] = { sender: 'her', text: '[PHOTO]', time: 'Maintenant', photo: data.photo_url };
                renderChatMessages();
                addChatPhoto(data.photo_url);
            }
        }
    } catch (e) {
        console.error('Game photo generation error:', e);
    }
}

// ====== DICE GAME ======
const DICE_ACTIONS = [
    { action: 'Embrasse', zone: 'le cou', actionId: 'embrasse_cou', xpRequired: 1 },
    { action: 'Caresse', zone: 'les seins', actionId: 'caresse_seins', xpRequired: 2 },
    { action: 'Leche', zone: 'le ventre', actionId: 'leche_ventre', xpRequired: 2 },
    { action: 'Mordille', zone: 'les cuisses', actionId: 'mordille_cuisses', xpRequired: 3 },
    { action: 'Masse', zone: 'les fesses', actionId: 'masse_fesses', xpRequired: 4 },
    { action: 'Souffle sur', zone: 'le sexe', actionId: 'souffle_sexe', xpRequired: 5 }
];

function initDiceGame(title, area, controls) {
    title.textContent = 'Des Coquins';
    gameState.rollCount = 0;
    gameState.winStreak = 0;
    
    area.innerHTML = `
        <p style="color:#888;margin-bottom:20px">Lance les des! Enchaine les bonnes actions pour debloquer les recompenses.</p>
        <div class="xp-requirement">
            <span>Ton niveau: ${currentXPLevel}</span>
            <span>Serie: ${gameState.winStreak || 0}/3</span>
        </div>
        <div class="dice-container">
            <div class="dice" id="dice1">?</div>
            <div class="dice" id="dice2">?</div>
        </div>
        <div class="dice-action" id="diceAction" style="display:none">
            <div class="dice-action-title">Action:</div>
            <div class="dice-action-text" id="diceActionText"></div>
            <div class="game-media-preview" id="diceMediaPreview"></div>
        </div>
    `;
    controls.innerHTML = `<button class="game-btn primary" onclick="rollDice()">Lancer les des</button>`;
}

function rollDice() {
    const dice1 = document.getElementById('dice1');
    const dice2 = document.getElementById('dice2');
    const actionDiv = document.getElementById('diceAction');
    const actionText = document.getElementById('diceActionText');
    const mediaPreview = document.getElementById('diceMediaPreview');
    
    dice1.classList.add('rolling');
    dice2.classList.add('rolling');
    actionDiv.style.display = 'none';
    
    let rolls = 0;
    const rollInterval = setInterval(() => {
        dice1.textContent = Math.floor(Math.random() * 6) + 1;
        dice2.textContent = Math.floor(Math.random() * 6) + 1;
        rolls++;
        if (rolls > 10) {
            clearInterval(rollInterval);
            dice1.classList.remove('rolling');
            dice2.classList.remove('rolling');
            
            const val1 = Math.floor(Math.random() * 6);
            dice1.textContent = val1 + 1;
            dice2.textContent = Math.floor(Math.random() * 6) + 1;
            
            const diceAction = DICE_ACTIONS[val1];
            const actionStr = `${diceAction.action} ${diceAction.zone}`;
            const canUnlock = currentXPLevel >= diceAction.xpRequired;
            
            actionText.textContent = actionStr;
            
            if (canUnlock) {
                gameState.winStreak = (gameState.winStreak || 0) + 1;
                addXP(3);
                
                if (gameState.winStreak >= 3) {
                    // Reward after 3 successful actions!
                    mediaPreview.innerHTML = `
                        <p style="color:#2ecc71;font-size:14px;margin-top:12px">Serie de 3! Recompense debloquee!</p>
                    `;
                    generateGameReward('dice', diceAction.actionId);
                    gameState.winStreak = 0;
                } else {
                    mediaPreview.innerHTML = `
                        <p style="color:#a855f7;font-size:12px;margin-top:12px">Encore ${3 - gameState.winStreak} pour la recompense!</p>
                    `;
                }
            } else {
                gameState.winStreak = 0;
                mediaPreview.innerHTML = `
                    <p style="color:#e74c3c;font-size:12px;margin-top:12px">Niveau ${diceAction.xpRequired} requis! Continue a chatter.</p>
                `;
            }
            actionDiv.style.display = 'block';
            
            if (currentGirl && canUnlock) {
                sendGameMessage(`*${actionStr}*`);
            }
        }
    }, 100);
}

// ====== TRUTH OR DARE - VERSION ADULTE HARDCORE ======
const TRUTHS = [
    { text: "Tu aimes te faire prendre par derriere?", photo: 'doggy position nude bent over', video: 'moaning in doggy position' },
    { text: "Tu avales ou tu recraches?", photo: 'cum on face open mouth', video: 'swallowing and licking lips' },
    { text: "Tu as deja joui en te faisant lecher?", photo: 'spread legs orgasm face', video: 'receiving oral climaxing' },
    { text: "Tu aimes qu'on te tire les cheveux?", photo: 'hair pulled arched back moaning', video: 'hair pulled rough sex' },
    { text: "Tu as deja pris deux mecs en meme temps?", photo: 'double penetration fantasy pose', video: 'threesome fantasy' },
    { text: "Tu aimes te faire gifler les fesses?", photo: 'red spanked ass bent over', video: 'getting spanked moaning' },
    { text: "Tu mouilles deja la?", photo: 'wet pussy closeup fingers', video: 'showing wet fingers' },
    { text: "Tu veux que je te baise maintenant?", photo: 'begging for sex spread legs', video: 'begging to be fucked' },
    { text: "Tu as deja fait une pipe en public?", photo: 'public blowjob pose', video: 'public oral confession' },
    { text: "Tu jouis plus fort en levrette ou missionnaire?", photo: 'comparing positions collage', video: 'demonstrating both positions' },
    { text: "Tu aimes sentir le sperme sur toi?", photo: 'covered in cum satisfied', video: 'receiving facial' },
    { text: "Tu as deja crie trop fort en baisant?", photo: 'screaming orgasm expression', video: 'loud moaning orgasm' }
];

const DARES = [
    { text: "Ecarte bien les jambes pour moi", photo: 'spread eagle nude', video: 'spreading legs slowly' },
    { text: "Suce tes doigts comme tu sucerais ma queue", photo: 'sucking fingers seductively', video: 'deepthroating fingers' },
    { text: "Montre-moi comment tu te doigtes", photo: 'fingering herself closeup', video: 'masturbating with fingers' },
    { text: "Fais-moi une pipe imaginaire", photo: 'blowjob pose mouth open', video: 'simulating blowjob' },
    { text: "Mets-toi a quatre pattes le cul en l'air", photo: 'ass up face down pose', video: 'getting on all fours' },
    { text: "Jouis pour moi maintenant", photo: 'intense orgasm face', video: 'climaxing loudly' },
    { text: "Montre-moi ta chatte mouillee", photo: 'wet pussy spread open', video: 'showing wet pussy' },
    { text: "Leche tes seins pour moi", photo: 'licking own nipples', video: 'licking breasts' },
    { text: "Fais comme si je te baisais", photo: 'sex position simulation', video: 'riding invisible partner' },
    { text: "Crie mon nom en jouissant", photo: 'orgasm face screaming', video: 'screaming orgasm' },
    { text: "Supplie-moi de te baiser", photo: 'begging submissive pose', video: 'begging on knees' },
    { text: "Montre comment tu aimes qu'on te prenne", photo: 'favorite position demonstration', video: 'demonstrating favorite way' }
];

function initTruthDare(title, area, controls) {
    title.textContent = 'Action ou Verite';
    area.innerHTML = `
        <p style="color:#888;margin-bottom:30px">Choisis: Verite ou Action?</p>
        <div class="truth-dare-choice">
            <button class="truth-dare-btn truth" onclick="chooseTruthDare('truth')">Verite</button>
            <button class="truth-dare-btn dare" onclick="chooseTruthDare('dare')">Action</button>
        </div>
        <div class="truth-dare-result" id="truthDareResult" style="display:none"></div>
    `;
    controls.innerHTML = '';
}

function chooseTruthDare(type) {
    const result = document.getElementById('truthDareResult');
    const list = type === 'truth' ? TRUTHS : DARES;
    const item = list[Math.floor(Math.random() * list.length)];
    
    result.style.display = 'block';
    result.innerHTML = `
        <h3>${type === 'truth' ? 'Verite' : 'Action'}</h3>
        <p>${item.text}</p>
        <div style="margin-top:16px">
            <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGamePhoto('${item.photo}')">Photo (20 tokens)</button>
            <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGameVideo('${item.video}')">Video (50 tokens)</button>
        </div>
    `;
    
    if (currentGirl) {
        const msg = type === 'truth' 
            ? `Je veux savoir: ${item.text}` 
            : `Je te donne un defi: ${item.text}`;
        sendGameMessage(msg);
    }
}

// ====== BOTTLE GAME - VERSION HARDCORE ======
const BOTTLE_ACTIONS = [
    { text: "Elle te suce la queue pendant 1 minute", photo: 'blowjob pov deepthroat', video: 'giving deep blowjob' },
    { text: "Elle ecarte les jambes et te montre sa chatte", photo: 'spread pussy closeup wet', video: 'spreading legs showing pussy' },
    { text: "Elle se doigte devant toi", photo: 'fingering herself moaning', video: 'masturbating with fingers' },
    { text: "Elle se met a quatre pattes et ecarte ses fesses", photo: 'ass spread on all fours', video: 'presenting ass doggy' },
    { text: "Elle te chevauche et gemit", photo: 'cowgirl riding moaning', video: 'riding cock moaning' },
    { text: "Elle te supplie de la baiser", photo: 'begging for sex submissive', video: 'begging to be fucked' },
    { text: "Elle jouit en criant ton nom", photo: 'intense orgasm screaming', video: 'loud climax orgasm' },
    { text: "Elle te fait une branlette avec ses seins", photo: 'titfuck between breasts', video: 'titjob bouncing' },
    { text: "Elle leche tes couilles", photo: 'licking balls closeup', video: 'ball licking tongue' },
    { text: "Elle avale tout ton sperme", photo: 'swallowing cum satisfied', video: 'swallowing and licking' },
    { text: "Elle te laisse jouir sur son visage", photo: 'facial cum covered face', video: 'receiving facial' },
    { text: "Elle prend tout dans sa gorge", photo: 'deepthroat gagging', video: 'deep throating' }
];

function initBottleGame(title, area, controls) {
    title.textContent = 'La Bouteille';
    gameState.spinning = false;
    
    area.innerHTML = `
        <p style="color:#888;margin-bottom:20px">Fais tourner la bouteille!</p>
        <div class="bottle-container">
            <div class="bottle" id="bottle">🍾</div>
        </div>
        <div class="dice-action" id="bottleResult" style="display:none;margin-top:30px">
            <div class="dice-action-text" id="bottleActionText"></div>
            <div id="bottleMediaPreview"></div>
        </div>
    `;
    controls.innerHTML = `<button class="game-btn primary" onclick="spinBottle()">Tourner</button>`;
}

function spinBottle() {
    if (gameState.spinning) return;
    gameState.spinning = true;
    
    const bottle = document.getElementById('bottle');
    const result = document.getElementById('bottleResult');
    const actionText = document.getElementById('bottleActionText');
    const mediaPreview = document.getElementById('bottleMediaPreview');
    
    result.style.display = 'none';
    const rotation = 1440 + Math.random() * 720;
    bottle.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    
    setTimeout(() => {
        const action = BOTTLE_ACTIONS[Math.floor(Math.random() * BOTTLE_ACTIONS.length)];
        actionText.textContent = action.text;
        mediaPreview.innerHTML = `
            <div style="margin-top:16px">
                <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGamePhoto('${action.photo}')">Photo (20 tokens)</button>
                <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGameVideo('${action.video}')">Video (50 tokens)</button>
            </div>
        `;
        result.style.display = 'block';
        gameState.spinning = false;
        
        if (currentGirl) {
            sendGameMessage(`*${action.text.toLowerCase()}*`);
        }
    }, 2500);
}

// ====== MASSAGE GAME ======
const MASSAGE_ZONES = [
    { zone: 'cou', photo: 'neck massage oil sensual', video: 'massaging neck slowly' },
    { zone: 'epaules', photo: 'shoulder massage from behind', video: 'rubbing shoulders oil' },
    { zone: 'dos', photo: 'back massage lying down oiled', video: 'full back massage sensual' },
    { zone: 'reins', photo: 'lower back massage arched', video: 'massaging lower back' },
    { zone: 'fesses', photo: 'butt massage oiled cheeks', video: 'massaging buttocks oil' },
    { zone: 'cuisses', photo: 'inner thigh massage spread', video: 'massaging thighs sensual' },
    { zone: 'seins', photo: 'breast massage oiled nipples', video: 'massaging breasts slowly' }
];

function initMassageGame(title, area, controls) {
    title.textContent = 'Massage Sensuel';
    gameState.intensity = 1;
    gameState.selectedZone = null;
    
    area.innerHTML = `
        <p style="color:#888;margin-bottom:20px">Choisis une zone a masser</p>
        <div class="games-grid" style="max-width:400px">
            ${MASSAGE_ZONES.map((z, i) => `
                <div class="game-card" onclick="selectMassageZone(${i})" style="padding:16px">
                    <div class="game-name">${z.zone.charAt(0).toUpperCase() + z.zone.slice(1)}</div>
                </div>
            `).join('')}
        </div>
        <div class="dice-action" id="massageResult" style="display:none;margin-top:20px">
            <div class="dice-action-text" id="massageText"></div>
            <div id="massageMediaPreview"></div>
        </div>
    `;
    controls.innerHTML = `
        <button class="game-btn secondary" onclick="setMassageIntensity(1)">Doux</button>
        <button class="game-btn secondary" onclick="setMassageIntensity(2)">Sensuel</button>
        <button class="game-btn secondary" onclick="setMassageIntensity(3)">Intense</button>
    `;
}

function setMassageIntensity(level) {
    gameState.intensity = level;
    document.querySelectorAll('.game-controls .game-btn').forEach((btn, i) => {
        btn.classList.toggle('primary', i === level - 1);
        btn.classList.toggle('secondary', i !== level - 1);
    });
}

function selectMassageZone(index) {
    const zoneData = MASSAGE_ZONES[index];
    const intensities = ['doucement', 'sensuellement', 'intensement'];
    const reactions = [
        ['Mmm c\'est agreable...', 'Continue comme ca...', 'J\'aime tes mains...'],
        ['Ooh oui...', 'Tu me fais du bien...', 'Tes mains sont magiques...'],
        ['Aaah... c\'est trop bon...', 'Je fonds sous tes mains...', 'Tu me rends folle...']
    ];
    
    const intensity = intensities[gameState.intensity - 1];
    const reaction = reactions[gameState.intensity - 1][Math.floor(Math.random() * 3)];
    
    const result = document.getElementById('massageResult');
    const text = document.getElementById('massageText');
    const mediaPreview = document.getElementById('massageMediaPreview');
    
    text.textContent = reaction;
    mediaPreview.innerHTML = `
        <div style="margin-top:16px">
            <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGamePhoto('${zoneData.photo}')">Photo (20 tokens)</button>
            <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGameVideo('${zoneData.video}')">Video (50 tokens)</button>
        </div>
    `;
    result.style.display = 'block';
    
    if (currentGirl) {
        sendGameMessage(`*masse son ${zoneData.zone} ${intensity}*`);
    }
}

// ====== ICE GAME ======
const ICE_ZONES = [
    { zone: 'cou', photo: 'ice cube on neck dripping water', video: 'ice sliding down neck sensual' },
    { zone: 'poitrine', photo: 'ice on breasts nipples hard cold', video: 'ice melting on breasts' },
    { zone: 'ventre', photo: 'ice cube on belly button melting', video: 'ice trailing down stomach' },
    { zone: 'cuisses', photo: 'ice on inner thighs wet cold', video: 'ice sliding up thighs' },
    { zone: 'dos', photo: 'ice cube on back arched cold', video: 'ice tracing spine slowly' },
    { zone: 'levres', photo: 'ice cube on lips wet sensual', video: 'licking ice cube seductively' }
];

function initIceGame(title, area, controls) {
    title.textContent = 'Jeu des Glacons';
    
    area.innerHTML = `
        <p style="color:#888;margin-bottom:20px">Fais glisser le glacon sur son corps</p>
        <div class="games-grid" style="max-width:400px">
            ${ICE_ZONES.map((z, i) => `
                <div class="game-card" onclick="selectIceZone(${i})" style="padding:16px">
                    <div class="game-icon" style="font-size:24px">🧊</div>
                    <div class="game-name">${z.zone.charAt(0).toUpperCase() + z.zone.slice(1)}</div>
                </div>
            `).join('')}
        </div>
        <div class="dice-action" id="iceResult" style="display:none;margin-top:20px">
            <div class="dice-action-text" id="iceText"></div>
            <div id="iceMediaPreview"></div>
        </div>
    `;
    controls.innerHTML = '';
}

function selectIceZone(index) {
    const zoneData = ICE_ZONES[index];
    const reactions = [
        'Aaah! C\'est froid!',
        'Mmm... ca fait du bien...',
        'Oh la sensation...',
        'Tu me donnes des frissons...',
        'C\'est tellement bon...'
    ];
    
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    const result = document.getElementById('iceResult');
    const text = document.getElementById('iceText');
    const mediaPreview = document.getElementById('iceMediaPreview');
    
    text.textContent = reaction;
    mediaPreview.innerHTML = `
        <div style="margin-top:16px">
            <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGamePhoto('${zoneData.photo}')">Photo (20 tokens)</button>
            <button class="game-btn secondary" style="padding:8px 16px;font-size:12px;margin:4px" onclick="generateGameVideo('${zoneData.video}')">Video (50 tokens)</button>
        </div>
    `;
    result.style.display = 'block';
    
    if (currentGirl) {
        sendGameMessage(`*fait glisser un glacon sur son ${zoneData.zone}*`);
    }
}

// Generate video for games
async function generateGameVideo(prompt) {
    if (!currentGirl) return;
    
    // Check tokens first
    try {
        const tokenResp = await fetch('/api/tokens');
        const tokenData = await tokenResp.json();
        if (tokenData.tokens < 50) {
            showBuyTokens();
            return;
        }
    } catch (e) {
        console.error('Token check error:', e);
        return;
    }
    
    // Deduct tokens
    await fetch('/api/tokens/deduct', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({amount: 50, reason: 'game_video'})
    });
    updateTokenDisplay();
    
    // Add loading message
    chatMessages.push({ sender: 'her', text: '[Generation de video en cours...]', time: 'Maintenant' });
    renderChatMessages();
    
    try {
        const resp = await fetch('/api/generate_video', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                girl_id: currentGirl.id,
                prompt: prompt
            })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            if (data.video_url) {
                chatMessages[chatMessages.length - 1] = { sender: 'her', text: '[VIDEO]', time: 'Maintenant', video: data.video_url };
                renderChatMessages();
                addChatVideo(data.video_url);
            }
        }
    } catch (e) {
        console.error('Game video generation error:', e);
    }
}

function addChatVideo(url) {
    const container = document.getElementById('chatMessages');
    const videoDiv = document.createElement('div');
    videoDiv.className = 'chat-message girl';
    videoDiv.innerHTML = `<video src="${url}" class="chat-video" controls style="max-width:250px;border-radius:12px"></video>`;
    container.appendChild(videoDiv);
    container.scrollTop = container.scrollHeight;
}

// Helper to send game message to chat
function sendGameMessage(msg) {
    if (!currentGirl) return;
    
    // Add XP for playing games
    addXP(3);
    
    // Send to chat
    chatMessages.push({ sender: 'me', text: msg, time: 'Maintenant' });
    localStorage.setItem(`chat_${currentGirl.id}`, JSON.stringify(chatMessages));
}

// ============ GIRL PROFILE OVERLAY ============

// Video/Photo actions available per level
const PROFILE_ACTIONS = [
    { id: 'warm_up', text: 'Je te chauffe en douceur', level: 1, type: 'video' },
    { id: 'show_ass', text: 'Je te montre mon cul', level: 1, type: 'video' },
    { id: 'show_tits', text: 'Je montre mes seins', level: 2, type: 'video' },
    { id: 'strip_all', text: "J'enleve absolument tout", level: 3, type: 'video' },
    { id: 'spread_ass', text: 'J\'ecarte mon cul', level: 4, type: 'video' },
    { id: 'hands_play', text: 'Je te fais jouir avec mes mains', level: 5, type: 'video' },
    { id: 'ride_you', text: 'Je te monte dessus et je bouge', level: 6, type: 'video' },
    { id: 'doggy', text: 'Prends-moi en levrette', level: 7, type: 'video' },
    { id: 'facial', text: 'Jouis sur mon visage', level: 8, type: 'video' },
    { id: 'anal', text: 'Prends-moi par derriere', level: 9, type: 'video' },
    { id: 'fantasy', text: 'Realise ton fantasme ultime', level: 10, type: 'video' }
];

// XP required for each level
const LEVEL_XP = {
    1: 0,
    2: 100,
    3: 250,
    4: 450,
    5: 700,
    6: 1000,
    7: 1400,
    8: 1900,
    9: 2500,
    10: 3200
};

function getGirlXP(girlId) {
    const stored = localStorage.getItem('girl_xp_' + girlId);
    return stored ? parseInt(stored) : 0;
}

function setGirlXP(girlId, xp) {
    localStorage.setItem('girl_xp_' + girlId, xp.toString());
}

function addGirlXP(girlId, amount) {
    const current = getGirlXP(girlId);
    setGirlXP(girlId, current + amount);
    return current + amount;
}

function getLevelFromXP(xp) {
    let level = 1;
    for (let l = 10; l >= 1; l--) {
        if (xp >= LEVEL_XP[l]) {
            level = l;
            break;
        }
    }
    return level;
}

function getXPForNextLevel(currentLevel) {
    if (currentLevel >= 10) return LEVEL_XP[10];
    return LEVEL_XP[currentLevel + 1];
}

function getXPProgress(xp, level) {
    const currentLevelXP = LEVEL_XP[level];
    const nextLevelXP = level >= 10 ? LEVEL_XP[10] : LEVEL_XP[level + 1];
    const progressXP = xp - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    return Math.min(100, (progressXP / neededXP) * 100);
}

function openGirlProfile() {
    if (!currentGirl) return;
    
    const girlId = currentGirl.id;
    const xp = getGirlXP(girlId);
    const level = getLevelFromXP(xp);
    const nextLevel = Math.min(level + 1, 10);
    const progress = getXPProgress(xp, level);
    const currentLevelXP = LEVEL_XP[level];
    const nextLevelXP = LEVEL_XP[nextLevel];
    
    // Update XP bar display
    document.getElementById('profileLevelBadge').textContent = level;
    document.getElementById('profileLevelText').textContent = 'Niveau ' + level;
    document.getElementById('profileXpBar').style.width = progress + '%';
    document.getElementById('profileXpCurrent').textContent = xp;
    document.getElementById('profileXpMax').textContent = nextLevelXP;
    document.getElementById('profileNextLevel').textContent = nextLevel;
    
    // Render actions list
    renderProfileActions(level);
    
    // Load gallery
    renderProfileGallery(girlId);
    
    // Show overlay
    document.getElementById('girlProfileOverlay').classList.add('active');
}

function closeGirlProfile() {
    document.getElementById('girlProfileOverlay').classList.remove('active');
}

function switchProfileTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.profile-tab[data-tab="${tab}"]`).classList.add('active');
    
    // Show/hide content
    if (tab === 'profil') {
        document.getElementById('profileTabContent').style.display = 'block';
        document.getElementById('galerieTabContent').style.display = 'none';
    } else {
        document.getElementById('profileTabContent').style.display = 'none';
        document.getElementById('galerieTabContent').style.display = 'block';
    }
}

function renderProfileActions(userLevel) {
    const container = document.getElementById('profileActionsList');
    
    container.innerHTML = PROFILE_ACTIONS.map(action => {
        const unlocked = userLevel >= action.level;
        return `
            <div class="action-item ${unlocked ? '' : 'locked'}" onclick="${unlocked ? `playProfileAction('${action.id}')` : ''}">
                <div class="action-text">${action.text}</div>
                ${unlocked ? 
                    `<div class="action-play">▶</div>` : 
                    `<div class="action-lock">🔒 Niveau ${action.level}</div>`
                }
            </div>
        `;
    }).join('');
}

function renderProfileGallery(girlId) {
    const container = document.getElementById('galerieGrid');
    
    // Get received photos for this girl
    const receivedPhotos = JSON.parse(localStorage.getItem('receivedPhotos') || '{}');
    const girlPhotos = receivedPhotos[girlId] || [];
    
    if (girlPhotos.length === 0) {
        container.innerHTML = `<div class="galerie-empty">Pas encore de photos. Joue aux jeux pour en debloquer!</div>`;
        return;
    }
    
    container.innerHTML = girlPhotos.map(url => `
        <div class="galerie-item" onclick="openFullPhoto('${url}')">
            <img src="${url}" alt="Photo">
        </div>
    `).join('');
}

function playProfileAction(actionId) {
    if (!currentGirl) return;
    
    const action = PROFILE_ACTIONS.find(a => a.id === actionId);
    if (!action) return;
    
    closeGirlProfile();
    
    // Show loading and request video
    showToast('Generation de la video...');
    
    // For now, show message that video is generating
    chatMessages.push({ 
        sender: 'her', 
        text: `Mmm tu veux que ${action.text.toLowerCase()}... Ca arrive bebe... 🔥`,
        time: 'Maintenant' 
    });
    renderChatMessages();
    localStorage.setItem(`chat_${currentGirl.id}`, JSON.stringify(chatMessages));
    
    // TODO: Call video generation API when available
}

// ====== CHAT INTEGRE AU PROFIL - Etape 3 ======
async function sendProfileMessage() {
    const input = document.getElementById('profileChatInput');
    const messagesContainer = document.getElementById('profileMessages');
    const message = input.value.trim();
    if (!message || !currentGirl) return;
    
    input.value = '';
    
    // Forcer affichage du conteneur
    messagesContainer.style.display = 'flex';
    
    // Afficher message utilisateur
    messagesContainer.innerHTML += `<div class="profile-msg user">${message}</div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    console.log('[PROFILE CHAT] Message envoye:', message);
    
    // Afficher typing
    messagesContainer.innerHTML += `<div class="profile-msg girl typing" id="typingMsg">...</div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Get affection
    const match = userMatches.find(m => m.girl_id === currentGirl.id);
    const affection = match?.affection || 20;
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl: currentGirl.id,
                messages: [{ role: 'user', content: message }],
                affection: affection
            })
        });
        const data = await response.json();
        console.log('[PROFILE CHAT] Reponse recue:', data);
        
        // Retirer typing et afficher reponse
        document.getElementById('typingMsg')?.remove();
        if (data.reply) {
            messagesContainer.innerHTML += `<div class="profile-msg girl">${data.reply}</div>`;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Add XP
            const xpGain = 3 + Math.floor(Math.random() * 3);
            if (typeof addXP === 'function') addXP(xpGain);
        }
    } catch (err) {
        console.log('[PROFILE CHAT] Erreur:', err);
        document.getElementById('typingMsg')?.remove();
        messagesContainer.innerHTML += `<div class="profile-msg girl">Desolee, je n'ai pas pu repondre...</div>`;
    }
}

function useProfileSuggestion(text) {
    document.getElementById('profileChatInput').value = text;
    sendProfileMessage();
}

// ====== PROFILE DETAIL PAGE - Tache 2 ======
let detailMediaIndex = 0;
let detailMediaItems = [];

function openProfileDetail(girlId) {
    const girl = allGirls.find(g => g.id === girlId) || currentGirl;
    if (!girl) return;
    
    currentGirl = girl;
    window.currentGirlId = girl.id;
    
    // Remplir les infos
    document.getElementById('detailName').textContent = `${girl.name}, ${girl.age}`;
    document.getElementById('detailLocation').textContent = girl.origin || girl.location || 'France';
    document.getElementById('detailAge').textContent = girl.age;
    document.getElementById('detailHeight').textContent = girl.height || '168cm';
    
    // Bio
    const personality = (girl.type || girl.tagline || '').toLowerCase();
    const bio = `Je suis ${girl.name}, ${girl.age} ans. ${personality ? personality.charAt(0).toUpperCase() + personality.slice(1) + '. ' : ''}J'adore faire de nouvelles rencontres...`;
    document.getElementById('detailBio').textContent = bio;
    
    // Affection (safe access)
    const match = (typeof userData !== 'undefined' && userData?.matches) ? userData.matches.find(m => m.girl_id === girl.id) : null;
    const affection = match?.affection || 0;
    document.getElementById('detailAffection').textContent = affection + '%';
    
    // Tags
    const tagsContainer = document.getElementById('detailTags');
    const tags = girl.tags || [girl.type, girl.fantasy].filter(Boolean);
    tagsContainer.innerHTML = tags.map(t => `<span class="detail-tag">${t}</span>`).join('');
    
    // Media carousel (video, photos, video)
    buildDetailMediaCarousel(girl);
    
    // Afficher
    document.getElementById('profileDetailOverlay').classList.add('active');
}

async function buildDetailMediaCarousel(girl) {
    detailMediaItems = [];
    const slidesContainer = document.getElementById('detailMediaSlides');
    const indicatorsContainer = document.getElementById('detailMediaIndicators');
    const girlId = girl.id;
    
    // Try to load from API for camgirls
    try {
        // Load profile photo
        const photoRes = await fetch(`/api/profile_photo/${girlId}`);
        const photoData = await photoRes.json();
        if (photoData.url) {
            detailMediaItems.push({ type: 'photo', url: photoData.url });
        }
        
        // Load intro video
        const videoRes = await fetch(`/api/intro_video/${girlId}`);
        const videoData = await videoRes.json();
        if (videoData.url) {
            detailMediaItems.push({ type: 'video', url: videoData.url });
        }
        
        // Load additional photos
        const allPhotosRes = await fetch(`/api/camgirl_photo/${girlId}`);
        const allPhotosData = await allPhotosRes.json();
        if (allPhotosData.all_photos && allPhotosData.all_photos.length > 1) {
            allPhotosData.all_photos.slice(1, 4).forEach(url => {
                detailMediaItems.push({ type: 'photo', url: url });
            });
        }
    } catch(e) {
        console.log('API load error, using fallback:', e);
    }
    
    // Fallback to local data if API failed
    if (detailMediaItems.length === 0) {
        const videoUrl = girl.videoUrl || localStorage.getItem(`girl_video_${girl.id}`);
        if (videoUrl) {
            detailMediaItems.push({ type: 'video', url: videoUrl });
        }
        
        let photos = [];
        if (typeof profileCarouselMedia !== 'undefined' && profileCarouselMedia.length > 0) {
            photos = profileCarouselMedia.filter(m => m.type === 'photo').map(m => m.url);
        } else if (girl.photos && girl.photos.length > 0) {
            photos = girl.photos;
        }
        
        photos.slice(0, 4).forEach(photo => {
            detailMediaItems.push({ type: 'photo', url: photo });
        });
        
        if (detailMediaItems.length === 0 && girl.photoUrl) {
            detailMediaItems.push({ type: 'photo', url: girl.photoUrl });
        }
        if (detailMediaItems.length === 0 && girl.portrait) {
            detailMediaItems.push({ type: 'photo', url: girl.portrait });
        }
    }
    
    // Generer slides
    slidesContainer.innerHTML = detailMediaItems.map((item, i) => {
        if (item.type === 'video') {
            return `<div class="media-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                <video src="${item.url}" loop muted playsinline></video>
            </div>`;
        } else {
            return `<div class="media-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                <img src="${item.url}" alt="Photo">
            </div>`;
        }
    }).join('');
    
    // Indicateurs
    indicatorsContainer.innerHTML = detailMediaItems.map((item, i) => 
        `<div class="media-indicator ${i === 0 ? 'active' : ''} ${item.type === 'video' ? 'video' : ''}" onclick="goToDetailMedia(${i})"></div>`
    ).join('');
    
    detailMediaIndex = 0;
    playCurrentDetailMedia();
    
    // Add touch swipe support
    setupDetailCarouselSwipe();
}

function setupDetailCarouselSwipe() {
    const container = document.getElementById('detailMediaCarousel');
    if (!container) return;
    
    let startX = 0;
    let startY = 0;
    
    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = Math.abs(startY - endY);
        
        // Only swipe if horizontal movement is greater than vertical
        if (Math.abs(diffX) > 50 && diffY < 100) {
            if (diffX > 0) {
                nextDetailMedia();
            } else {
                prevDetailMedia();
            }
        }
    }, { passive: true });
}

function goToDetailMedia(index) {
    if (index < 0 || index >= detailMediaItems.length) return;
    
    // Pause ancien
    const oldSlide = document.querySelector('.media-slide.active video');
    if (oldSlide) oldSlide.pause();
    
    // Changer
    document.querySelectorAll('.media-slide').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.media-indicator').forEach(i => i.classList.remove('active'));
    
    document.querySelector(`.media-slide[data-index="${index}"]`)?.classList.add('active');
    document.querySelectorAll('.media-indicator')[index]?.classList.add('active');
    
    detailMediaIndex = index;
    playCurrentDetailMedia();
}

function playCurrentDetailMedia() {
    const currentSlide = document.querySelector('.media-slide.active video');
    if (currentSlide) {
        currentSlide.play().catch(() => {});
    }
}

function closeProfileDetail() {
    // Pause videos
    document.querySelectorAll('#detailMediaSlides video').forEach(v => v.pause());
    document.getElementById('profileDetailOverlay').classList.remove('active');
}

function prevDetailMedia() {
    if (detailMediaIndex > 0) {
        goToDetailMedia(detailMediaIndex - 1);
    }
}

function nextDetailMedia() {
    if (detailMediaIndex < detailMediaItems.length - 1) {
        goToDetailMedia(detailMediaIndex + 1);
    }
}

function startChatFromDetail() {
    closeProfileDetail();
    if (currentGirl) {
        openChat(currentGirl);
    }
}

// ====== TOGGLE CHAT VISIBILITY ======
let chatVisible = true;
function toggleChatVisibility() {
    chatVisible = !chatVisible;
    const chatOverlay = document.getElementById('photoChatOverlay');
    if (chatOverlay) {
        chatOverlay.style.display = chatVisible ? 'block' : 'none';
    }
}

// ====== CHAT SUR LA PHOTO ======
async function sendPhotoMessage() {
    const input = document.getElementById('photoChatInput');
    const messagesContainer = document.getElementById('photoMessages');
    const message = input.value.trim();
    if (!message || !currentGirl) return;
    
    input.value = '';
    messagesContainer.style.display = 'flex';
    
    // Afficher message utilisateur
    messagesContainer.innerHTML += `<div class="photo-msg user">${message}</div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Afficher typing
    messagesContainer.innerHTML += `<div class="photo-msg girl typing" id="photoTyping">...</div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Get affection
    const match = userMatches.find(m => m.girl_id === currentGirl.id);
    const affection = match?.affection || 20;
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                girl: currentGirl.id,
                messages: [{ role: 'user', content: message }],
                affection: affection
            })
        });
        const data = await response.json();
        console.log('[PHOTO CHAT] Reponse:', data);
        
        document.getElementById('photoTyping')?.remove();
        if (data.reply) {
            messagesContainer.innerHTML += `<div class="photo-msg girl">${data.reply}</div>`;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Add XP
            const xpGain = 3 + Math.floor(Math.random() * 3);
            if (typeof addXP === 'function') addXP(xpGain);
        }
    } catch (err) {
        console.log('[PHOTO CHAT] Erreur:', err);
        document.getElementById('photoTyping')?.remove();
        messagesContainer.innerHTML += `<div class="photo-msg girl">Desolee...</div>`;
    }
}

// ====== SCENARIO CHAT VIEW ======
let scenarioGirlId = null;
let scenarioMessages = [];

function openScenarioChat() {
    const view = document.getElementById('scenarioChatView');
    const avatar = document.getElementById('scenarioAvatar');
    const name = document.getElementById('scenarioName');
    const video = document.getElementById('scenarioVideo');
    const firstMsg = document.getElementById('scenarioFirstMessage');
    const messagesContainer = document.getElementById('scenarioMessages');
    
    // Reset message history
    scenarioMessages = [];
    
    // Get girl data from profile overlay elements
    const profileName = document.getElementById('profileNameOverlay')?.textContent || 'Inconnue';
    let profileAvatar = document.querySelector('#profileCarousel .candy-photo.active')?.src || '';
    
    // Fallback: try to get from candy-profile-photo or other sources
    if (!profileAvatar || profileAvatar === '') {
        profileAvatar = document.querySelector('.candy-profile-photo')?.src || '';
    }
    if (!profileAvatar || profileAvatar === '') {
        profileAvatar = document.querySelector('#profileCarousel .candy-photo')?.src || '';
    }
    if (!profileAvatar || profileAvatar === '') {
        // Try to get from current girl data
        const girlId = window.currentGirlId;
        if (girlId && window.girlsData && window.girlsData[girlId]) {
            const photos = window.girlsData[girlId].photos;
            if (photos && photos.length > 0) {
                profileAvatar = photos[0].url || photos[0];
            }
        }
    }
    
    // Store photo for scenario messages
    window.currentGirlPhoto = profileAvatar;
    
    if (avatar) {
        avatar.src = profileAvatar;
    }
    if (name) {
        name.textContent = profileName.split(',')[0];
    }
    if (video) {
        video.poster = profileAvatar;
        
        // Load intro video and profile photo from API
        const girlId = window.currentGirlId;
        if (girlId) {
            // Load profile photo from API
            fetch(`/api/profile_photo/${girlId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.url) {
                        video.poster = data.url;
                        if (avatar) avatar.src = data.url;
                        const msgAvatar = document.getElementById('scenarioMsgAvatar');
                        if (msgAvatar) msgAvatar.src = data.url;
                        window.currentGirlPhoto = data.url;
                    }
                })
                .catch(e => console.log('Profile photo error:', e));
            
            // Load intro video
            fetch(`/api/intro_video/${girlId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.url) {
                        video.src = data.url;
                        video.load();
                    }
                })
                .catch(e => console.log('No intro video:', e));
        }
    }
    
    // Set avatar in first message
    const msgAvatar = document.getElementById('scenarioMsgAvatar');
    if (msgAvatar) {
        msgAvatar.src = profileAvatar;
    }
    
    // Clear previous messages except first
    if (messagesContainer) {
        const firstMsgEl = messagesContainer.querySelector('.scenario-message.girl');
        const timestamp = messagesContainer.querySelector('.scenario-timestamp');
        messagesContainer.innerHTML = '';
        if (firstMsgEl) messagesContainer.appendChild(firstMsgEl);
        if (timestamp) messagesContainer.appendChild(timestamp);
    }
    if (firstMsg) {
        const messages = [
            "Hey toi... T'as ce regard qui m'excite... Tu es curieux ? Ou tu fais juste semblant de pas me mater ?",
            "Salut beau gosse... Je t'ai remarque depuis un moment... Tu viens me parler ou tu restes la a mater ?",
            "Mmm... J'aime ton style... Tu viens souvent ici ? J'ai envie de mieux te connaitre...",
            "Coucou toi... T'as l'air interessant... Tu veux qu'on discute un peu plus intimement ?"
        ];
        firstMsg.textContent = messages[Math.floor(Math.random() * messages.length)];
    }
    
    view.classList.add('active');
}

function closeScenarioChat() {
    const view = document.getElementById('scenarioChatView');
    view.classList.remove('active');
}

function goToHome() {
    // Close all overlays and return to home
    document.getElementById('scenarioChatView')?.classList.remove('active');
    document.getElementById('camgirlProfile')?.classList.remove('active');
    document.getElementById('profileDetailOverlay')?.classList.remove('active');
    var actionPanel = document.getElementById('profileActionPanelFixed');
    if (actionPanel) actionPanel.style.display = 'none';
    var xpBubble = document.getElementById('xpBubbleCandy');
    if (xpBubble) xpBubble.style.display = 'none';
    // Go to discover/home tab
    if (typeof showPage === 'function') {
        showPage('discover');
    }
}

function openCamgirlProfileFromScenario() {
    // Open the camgirl profile detail page
    const girlId = window.currentGirlId;
    if (girlId) {
        openProfileDetail(girlId);
    }
}

function toggleScenarioVideo() {
    const video = document.getElementById('scenarioVideo');
    const overlay = document.querySelector('.scenario-video-overlay');
    if (video.paused) {
        video.play();
        overlay.style.display = 'none';
    } else {
        video.pause();
        overlay.style.display = 'flex';
    }
}

function toggleScenarioSound() {
    const video = document.getElementById('scenarioVideo');
    video.muted = !video.muted;
}

function toggleScenarioFullscreen() {
    const container = document.getElementById('scenarioVideoContainer');
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        container.requestFullscreen();
    }
}

function toggleScenarioActions() {
    console.log('Actions menu');
}

// ====== SCENARIO CHAT MESSAGING ======
function sendScenarioMessage() {
    const input = document.getElementById('scenarioInput');
    const messagesContainer = document.getElementById('scenarioMessages');
    
    if (!input || !messagesContainer) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Get girl ID from current profile
    const girlId = currentGirlId || 1;
    scenarioGirlId = girlId;
    
    // Add user message to UI
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'scenario-message user';
    userMsgEl.innerHTML = `<p>${message}</p>`;
    messagesContainer.appendChild(userMsgEl);
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add to message history
    scenarioMessages.push({ role: 'user', content: message });
    
    // Show typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'scenario-message girl typing';
    typingEl.innerHTML = '<p>...</p>';
    messagesContainer.appendChild(typingEl);
    
    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            girl_id: girlId,
            messages: scenarioMessages,
            affection: 50
        })
    })
    .then(response => response.json())
    .then(data => {
        typingEl.remove();
        
        if (data.reply) {
            const girlMsgEl = document.createElement('div');
            girlMsgEl.className = 'scenario-message girl';
            girlMsgEl.innerHTML = `<p>${data.reply}</p>`;
            messagesContainer.appendChild(girlMsgEl);
            
            scenarioMessages.push({ role: 'assistant', content: data.reply });
            
            // Add XP
            const xpGain = 3 + Math.floor(Math.random() * 3);
            if (typeof addXP === 'function') addXP(xpGain);
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    })
    .catch(error => {
        typingEl.remove();
        console.error('Scenario chat error:', error);
    });
}

// Init scenario input listener
document.addEventListener('DOMContentLoaded', function() {
    const scenarioInput = document.getElementById('scenarioInput');
    if (scenarioInput) {
        scenarioInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendScenarioMessage();
            }
        });
    }
});

// ============ CHAT MENU FUNCTIONS ============

function toggleChatMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('chatMenuDropdown');
    menu.classList.toggle('active');
    
    // Close menu when clicking outside
    if (menu.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeChatMenuOnClickOutside);
        }, 10);
    }
}

function closeChatMenuOnClickOutside(e) {
    const menu = document.getElementById('chatMenuDropdown');
    if (!menu.contains(e.target)) {
        menu.classList.remove('active');
        document.removeEventListener('click', closeChatMenuOnClickOutside);
    }
}

function closeChatMenu() {
    const menu = document.getElementById('chatMenuDropdown');
    if (menu) menu.classList.remove('active');
    document.removeEventListener('click', closeChatMenuOnClickOutside);
}

function addToFavorites() {
    closeChatMenu();
    if (!window.currentGirlId) {
        showToast('Erreur: pas de profil selectionne');
        return;
    }
    
    // Toggle favorite in localStorage
    let favorites = JSON.parse(localStorage.getItem('girl_favorites') || '[]');
    const index = favorites.indexOf(window.currentGirlId);
    let isFavorite;
    
    if (index > -1) {
        favorites.splice(index, 1);
        isFavorite = false;
    } else {
        favorites.push(window.currentGirlId);
        isFavorite = true;
    }
    
    localStorage.setItem('girl_favorites', JSON.stringify(favorites));
    showToast(isFavorite ? 'Ajoute aux favoris' : 'Retire des favoris');
    
    // Update heart icon in menu
    updateFavoriteIcon(isFavorite);
}

function updateFavoriteIcon(isFavorite) {
    const menuItem = document.querySelector('.chat-menu-item svg path[d*="20.84"]');
    if (menuItem) {
        menuItem.parentElement.setAttribute('fill', isFavorite ? '#ff6b9d' : 'none');
    }
}

function isFavoriteGirl(girlId) {
    const favorites = JSON.parse(localStorage.getItem('girl_favorites') || '[]');
    return favorites.indexOf(girlId) > -1;
}

function resetChat() {
    closeChatMenu();
    if (!window.currentGirlId) {
        showToast('Erreur: pas de profil selectionne');
        return;
    }
    
    if (!confirm('Reinitialiser le chat ? Tous les messages seront supprimes.')) {
        return;
    }
    
    fetch('/api/reset_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ girl_id: window.currentGirlId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Chat reinitialise');
            // Clear messages in UI
            const messagesContainer = document.getElementById('scenarioMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = `<div class="scenario-message girl">
                    <img class="scenario-avatar" src="${girlPhotos[window.currentGirlId] || ''}" alt="">
                    <p>Hey toi... T'as ce regard qui m'excite... Tu es curieux ? Ou tu fais juste semblant de pas me mater ?</p>
                </div>`;
            }
            // Also clear action direct chat if visible
            const actionMessages = document.getElementById('actionDirectMessages');
            if (actionMessages) {
                actionMessages.innerHTML = '';
            }
        } else {
            showToast(data.error || 'Erreur');
        }
    })
    .catch(err => showToast('Erreur reseau'));
}

function deleteChat() {
    closeChatMenu();
    if (!window.currentGirlId) {
        showToast('Erreur: pas de profil selectionne');
        return;
    }
    
    if (!confirm('Supprimer ce chat ? Cette action est irreversible.')) {
        return;
    }
    
    fetch('/api/delete_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ girl_id: window.currentGirlId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Chat supprime');
            // Return to matches view
            closeScenarioChat();
            showView('matches');
        } else {
            showToast(data.error || 'Erreur');
        }
    })
    .catch(err => showToast('Erreur reseau'));
}

// ============ MEMORY/SOUVENIR FUNCTIONS ============

function openMemoryModal() {
    closeChatMenu();
    if (!window.currentGirlId) {
        showToast('Erreur: pas de profil selectionne');
        return;
    }
    
    // Set girl name
    const girlName = currentGirl?.pseudo || currentGirl?.name || 'elle';
    document.getElementById('memoryGirlName').textContent = girlName;
    
    // Reset input
    document.getElementById('memoryInput').value = '';
    document.getElementById('memoryCharCount').textContent = '0';
    
    // Load existing memories
    loadMemories();
    
    // Show modal
    document.getElementById('memoryModalOverlay').classList.add('active');
}

function closeMemoryModal() {
    document.getElementById('memoryModalOverlay').classList.remove('active');
}

// Character count
document.addEventListener('DOMContentLoaded', function() {
    const memoryInput = document.getElementById('memoryInput');
    if (memoryInput) {
        memoryInput.addEventListener('input', function() {
            document.getElementById('memoryCharCount').textContent = this.value.length;
        });
    }
});

function loadMemories() {
    if (!window.currentGirlId) return;
    var user = JSON.parse(localStorage.getItem('dreamUser') || '{}');
    var userId = user.id;
    if (!userId) return;
    
    fetch(`/api/memories/${window.currentGirlId}`, {
        headers: {'X-User-Id': userId}
    })
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('memoriesContainer');
        const countEl = document.getElementById('memoryCount');
        const count = data.memories ? data.memories.length : 0;
        if (countEl) countEl.textContent = `${count}/10`;
        
        if (data.memories && data.memories.length > 0) {
            container.innerHTML = data.memories.map(m => `
                <div class="memory-item" data-id="${m.id}">
                    <span class="memory-item-text">${m.content}</span>
                    <button class="memory-item-menu" onclick="deleteMemory(${m.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color:#666;font-size:13px;text-align:center;padding:20px;">Aucun souvenir enregistre</p>';
        }
    })
    .catch(err => {
        console.error('Error loading memories:', err);
    });
}

function saveMemory() {
    console.log('saveMemory called, girlId:', window.currentGirlId);
    const content = document.getElementById('memoryInput').value.trim();
    console.log('Content:', content);
    if (!content) {
        showToast('Veuillez saisir un souvenir');
        return;
    }
    if (!window.currentGirlId) {
        showToast('Erreur: pas de profil selectionne');
        alert('Erreur: currentGirlId = ' + window.currentGirlId);
        return;
    }
    
    fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            girl_id: window.currentGirlId,
            content: content 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Souvenir enregistre');
            document.getElementById('memoryInput').value = '';
            document.getElementById('memoryCharCount').textContent = '0';
            loadMemories();
            // Return to list view
            if (typeof hideAddMemoryForm === 'function') hideAddMemoryForm();
        } else {
            showToast(data.error || 'Erreur');
        }
    })
    .catch(err => showToast('Erreur reseau'));
}

function deleteMemory(memoryId) {
    if (!confirm('Supprimer ce souvenir ?')) return;
    var user = JSON.parse(localStorage.getItem('dreamUser') || '{}');
    var userId = user.id;
    if (!userId) { showToast('Non connecte'); return; }
    
    fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {'X-User-Id': userId}
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Souvenir supprime');
            loadMemories();
        } else {
            showToast(data.error || 'Erreur');
        }
    })
    .catch(err => showToast('Erreur reseau'));
}

// Expose memory functions globally for onclick handlers
window.saveMemory = saveMemory;
window.loadMemories = loadMemories;
window.deleteMemory = deleteMemory;
