// --- INSTANT SESSION RESTORE ---
(function restoreSession() {
    let savedUser = sessionStorage.getItem('mbbs_user');

    if (!savedUser || savedUser === 'undefined' || savedUser === 'null') {
        const localUser = localStorage.getItem('mbbs_saved_user');
        if (localUser && localUser !== 'undefined' && localUser !== 'null') {
            sessionStorage.setItem('mbbs_user', localUser);
        }
        // Removed global login redirect here
    }
})();

// --- DATA ENGINE ---
let allData = [];
let mbbsData = {};
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSC_oD0BX4WhhLDL6e6WybIEXmvbiroBMBiGASJ2r-HdxlIOmDFqaWpUEMdDydPUHVOQNsOGGbgJR6O/pub?output=csv";

async function fetchSheetData() {
    try {
        // --- ADD THIS LINE HERE ---
        showSkeletonLoading();

        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        let text = await response.text();

        // ... rest of your existing code stays exactly the same
        text = text.replace(/^\uFEFF/, '');
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
            throw new Error("Invalid CSV format.");
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) throw new Error("Spreadsheet is empty.");

        allData = lines.slice(1);
        mbbsData = {};
        allData.forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length < 4) return;

            const subjRaw = cols[0] || 'Other';
            const typeRaw = cols[1] || '';
            const titleRaw = cols[2] || 'Untitled';
            const linkRaw = cols[3] || '';
            const platformRaw = cols[4] || 'Other';

            const isPremium = subjRaw.toLowerCase() === "other" || !subjRaw;
            const cleanSubject = isPremium ? "Premium" : subjRaw;
            const subKey = isPremium ? "premium" : cleanSubject.toLowerCase().trim().replace(/ /g, '_');
            const typeKey = typeRaw.toLowerCase().trim();

            if (!mbbsData[subKey]) mbbsData[subKey] = { videos: [], keyPoints: [], notes: [], qbank: [], quizzes: [] };

            const isRestricted = linkRaw.includes('#restricted') || platformRaw.toLowerCase().includes('restricted');
            const item = { Subject: subjRaw, title: titleRaw, link: linkRaw, platform: platformRaw, Type: typeKey, subjectName: cleanSubject, isPremium, isRestricted };

            if (typeKey === 'videos' || typeKey === 'video') mbbsData[subKey].videos.push({ ...item, link: getYoutubeVideoId(linkRaw) });
            else if (typeKey === 'notes') mbbsData[subKey].notes.push(item);
            else if (typeKey === 'qbank') mbbsData[subKey].qbank.push(item);
            else if (typeKey.includes('quiz')) mbbsData[subKey].quizzes.push(item);
            else if (typeKey === 'keypoints' || typeKey === 'keypoint') mbbsData[subKey].keyPoints.push({ ...item, content: linkRaw });
        });

        // Check the URL to see if a specific view was requested from the landing page
        const urlParams = new URLSearchParams(window.location.search);
        const requestedView = urlParams.get('view');

        // If a valid view was requested, load it directly
        if (requestedView && ['videos', 'notes', 'quizzes', 'qbank'].includes(requestedView)) {
            filterCategory(requestedView);
            // Note: URL cleanup removed so students can safely refresh the page!
        } else {
            // No ?view= param — render the dashboard home page
            renderHome();
        }

    } catch (e) {
        document.getElementById('contentArea').innerHTML = `
            <div style="text-align:center; padding:5rem;">
                <i class="fas fa-exclamation-triangle" style="font-size:3rem; color:#ef4444; margin-bottom:1rem;"></i>
                <h2 style="color:#ef4444; margin-bottom:0.5rem;">Data Load Failure</h2>
                <p style="color:var(--text-light); max-width:500px; margin:0 auto;">${e.message}</p>
            </div>
        `;
    }
}

function getYoutubeVideoId(url) {
    if (!url) return "";
    url = url.trim();
    if (url.length === 11 && !url.includes('.') && !url.includes('/')) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]{11}).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mbbs_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleMobileMenu() { document.getElementById('mainNav').classList.toggle('mobile-active'); }
function toggleSearch() {
    const bar = document.getElementById('searchBar');
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) document.getElementById('globalSearch').focus();
}

(function initTheme() {
    const savedTheme = localStorage.getItem('mbbs_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

let currentView = 'home', currentSubject = null, currentPlatform = null, selectedChapterIdx = null, currentQuizFilter = 'all';
let players = {}, pendingPlayers = [], navHistory = [];
window.activityStats = { videos: 0, notes: 0, quizzes: 0 };
let activityTimer = null, syncTimer = null;

function formatTime(seconds) {
    if (!seconds) return "0h 0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

window.openProfile = () => {
    pushNavState();
    currentView = 'profile'; updateNavActive('profile');
    document.getElementById('trustArea').style.display = 'none';
    const area = document.getElementById('contentArea');
    area.style.display = 'block';

    const totalSecs = window.activityStats.videos + window.activityStats.notes + window.activityStats.quizzes;
    area.innerHTML = `
        <div class="welcome-section" style="padding: 1rem 0; text-align: left;">
            <button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
            <h1 style="color: var(--primary); font-size: 2.2rem; margin-bottom: 0.5rem; font-weight: 800;"><i class="fas fa-user-circle"></i> Study Profile</h1>
        </div>
        <div class="stat-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="stat-card" style="background: var(--surface); padding: 2rem; border-radius: 12px; border: 1px solid var(--border); text-align: center; box-shadow: var(--shadow-sm);">
                <i class="fas fa-play-circle" style="color: #ef4444; font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <div style="font-weight: 700; font-size: 1.5rem; color: var(--text);">${formatTime(window.activityStats.videos)}</div>
                <div style="font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Videos</div>
            </div>
            <div class="stat-card" style="background: var(--surface); padding: 2rem; border-radius: 12px; border: 1px solid var(--border); text-align: center; box-shadow: var(--shadow-sm);">
                <i class="fas fa-file-pdf" style="color: #3b82f6; font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <div style="font-weight: 700; font-size: 1.5rem; color: var(--text);">${formatTime(window.activityStats.notes)}</div>
                <div style="font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Notes</div>
            </div>
            <div class="stat-card" style="background: var(--surface); padding: 2rem; border-radius: 12px; border: 1px solid var(--border); text-align: center; box-shadow: var(--shadow-sm);">
                <i class="fas fa-lightbulb" style="color: #10b981; font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <div style="font-weight: 700; font-size: 1.5rem; color: var(--text);">${formatTime(window.activityStats.quizzes)}</div>
                <div style="font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Quizzes</div>
            </div>
        </div>
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1)); padding: 2.5rem; border-radius: 12px; text-align: center; margin-bottom: 2rem;">
            <i class="fas fa-clock" style="color: var(--primary); font-size: 3rem; margin-bottom: 1rem;"></i>
            <div style="font-size: 1rem; color: var(--text-light); text-transform: uppercase;">Total Study Time</div>
            <div style="font-weight: 800; font-size: 3rem; color: var(--text);">${formatTime(totalSecs)}</div>
            <button class="logout-btn" onclick="handleLogout()" style="margin-top:20px; padding:10px 20px; font-size:1rem;">Logout Devices</button>
        </div>
    `;
};

function pushNavState() {
    navHistory.push({ view: currentView, subject: currentSubject, platform: currentPlatform, chapterIdx: selectedChapterIdx, scrollPos: window.scrollY });
    history.pushState({ internal: true }, '', window.location.href);
}

function handleInternalBack() {
    if (navHistory.length === 0) { showMainMenu(); return; }
    cleanupIframes();
    const prevState = navHistory.pop();
    currentView = prevState.view; currentSubject = prevState.subject; currentPlatform = prevState.platform; selectedChapterIdx = prevState.chapterIdx;
    if (currentView === 'home') showMainMenu(true);
    else if (currentView === 'qbank' && !currentPlatform) filterCategory('qbank', true);
    else renderContent(true);
    setTimeout(() => window.scrollTo({ top: prevState.scrollPos, behavior: 'auto' }), 100);
}

window.goBack = () => { if (navHistory.length === 0) showMainMenu(); else history.back(); };
window.isFullscreenState = false;
window.ignoreNextPopState = false;

window.addEventListener('popstate', (e) => {
    if (window.ignoreNextPopState) {
        window.ignoreNextPopState = false;
        return;
    }

    if (window.isFullscreenState) {
        window.isFullscreenState = false;
        let ext = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (ext && (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
            ext.call(document);
        }
        return;
    }

    if (navHistory.length > 0) handleInternalBack();
});


function injectWatermark() {
    const container = document.getElementById('watermark-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 60; i++) {
        const el = document.createElement('div'); el.className = 'watermark-item'; el.innerText = 'Licensed to Student - Do Not Distribute';
        container.appendChild(el);
    }
}

function cleanupIframes() {
    Object.values(players).forEach(p => {
        if (p.timer) clearInterval(p.timer);
        if (p.stopVideo) p.stopVideo();
        if (p.destroy) p.destroy();
    });
    if (window.uiTimer) clearInterval(window.uiTimer);
    players = {}; pendingPlayers = []; window.activePlayerId = null;
    const viewer = document.getElementById('fileViewer'), modal = document.getElementById('fileModal');
    if (viewer) { viewer.src = ''; viewer.removeAttribute('srcdoc'); }
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
}

window.clearSearch = () => { document.getElementById('globalSearch').value = ''; handleSearch(); document.getElementById('globalSearch').focus(); };
window.handleSearch = () => {
    const query = document.getElementById('globalSearch').value.toLowerCase().trim();
    document.getElementById('clearSearch').style.display = query.length > 0 ? 'block' : 'none';
    let hasMatches = false;
    document.querySelectorAll('.portal-card, .chapter-card, .subject-item, .card').forEach(item => {
        const match = item.textContent.toLowerCase().includes(query);
        item.style.display = match ? '' : 'none';
        if (match) hasMatches = true;
    });
    document.querySelectorAll('.section-title').forEach(header => header.style.display = (query === '') ? 'block' : 'none');
    document.getElementById('noResults').style.display = (query !== '' && !hasMatches) ? 'block' : 'none';
    document.getElementById('contentArea').style.display = (query !== '' && !hasMatches) ? 'none' : 'block';
};

window.logStudentActivity = (subject, title) => {
    const userName = sessionStorage.getItem('mbbs_user');
    if (!userName || !subject || !title) return;
    fetch("https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec", {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName, subject, title })
    }).catch(e => console.error(e));
};

window.handleLogout = () => {
    sessionStorage.removeItem('mbbs_user');
    localStorage.removeItem('mbbs_saved_user');
    window.location.replace('index.html');
};

window.showMainMenu = (isBack = false) => {
    // The dashboard home is dead. Teleport back to the landing page hub!
    window.location.href = 'index.html';
};

window.filterCategory = (type, isBack = false) => {
    // --- VIDEO LOGIN INTERCEPTOR ---
    if (type === 'videos') {
        const isAuthorized = localStorage.getItem('mbbs_video_authorized');
        if (isAuthorized !== 'true') {
            window.location.href = 'login.html?redirect=videos';
            return;
        }
    }
    // --- NEW TUTORIAL CHECK ---
    // If they clicked 'quizzes' AND they haven't seen the tutorial yet
    if (type === 'quizzes' && !localStorage.getItem('quiz_tutorial_seen')) {
        const modal = document.getElementById('quizTutorialModal');
        if (modal) {
            modal.style.display = 'flex'; // Show the tutorial
            return; // Stop the navigation for now
        }
    }
    // --------------------------

    if (!isBack) pushNavState();
    currentView = type; currentPlatform = null; currentSubject = null; selectedChapterIdx = null; currentQuizFilter = 'all'; window.activePlayerId = null;
    updateNavActive(type);
    if (type === 'qbank') renderPlatforms(); else renderSubjectList();
};

// --- NEW FUNCTION TO CLOSE TUTORIAL ---
window.closeQuizTutorial = () => {
    // 1. Save that the user has seen it so it never shows again
    localStorage.setItem('quiz_tutorial_seen', 'true');

    // 2. Hide the modal
    const modal = document.getElementById('quizTutorialModal');
    if (modal) modal.style.display = 'none';

    // 3. Continue navigating them to the quizzes page
    filterCategory('quizzes');
};

function renderPlatforms() {
    const platforms = new Set();
    Object.values(mbbsData).forEach(subj => subj.qbank.forEach(item => { if (item.platform) platforms.add(item.platform); }));
    const pList = Array.from(platforms).sort();
    document.getElementById('contentArea').innerHTML = `
        <div class="welcome-section" style="padding: 1rem 0;">
            <button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
            <h1><i class="fas fa-layer-group"></i> Select Platform</h1>
        </div>
        <div class="portal-grid" style="margin-top:1rem;">
            ${pList.map(p => `<div class="portal-card" onclick="setPlatform('${p}')"><i class="fas fa-university"></i><h3>${p}</h3></div>`).join('')}
        </div>
    `;
}
window.setPlatform = (platform) => { pushNavState(); currentPlatform = platform; renderSubjectList(); };

function updateNavActive(view) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${view}`);
    if (activeLink) activeLink.classList.add('active');
}


window.onload = () => {
    const savedTheme = localStorage.getItem('mbbs_theme') || 'light';
    updateThemeIcon(savedTheme);

    let savedUser = sessionStorage.getItem('mbbs_user');
    let isLoggedIn = savedUser && savedUser !== 'undefined' && savedUser !== 'null' && savedUser.trim() !== '';

    if (isLoggedIn) {
        if (window.AndroidApp) {
            window.AndroidApp.loginUser(savedUser);
        }
        window.userSessionName = savedUser.split('_')[0] || "Student";
    } else {
        window.userSessionName = "Guest";
    }

    updateUserMenu();
    fetchSheetData();
    injectWatermark();

    // Only run security checks and tracking for actual logged-in students
    if (isLoggedIn) {
        // --- UPDATED BACKGROUND DATABASE CHECK (ONLY for video authorized users) ---
        const isAuthorized = localStorage.getItem('mbbs_video_authorized') === 'true';
        if (isAuthorized) {
            fetch(`https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec?name=${encodeURIComponent(savedUser)}`)
                .then(r => r.json())
                .then(async data => {
                    if (data.allowed) {
                        if (savedUser.toLowerCase() !== 'naveen' && localStorage.getItem('mbbs_admin_device') !== 'true') {
                            try {
                                const safeName = savedUser.toLowerCase().replace(/[.#$\[\]]/g, '_');
                                const dbUrl = `https://samvad-bafaa-default-rtdb.firebaseio.com/users/${encodeURIComponent(safeName)}.json`;
                                const dbData = await (await fetch(dbUrl)).json();

                                // Check against the correct new slot (app_id or web_id)
                                const isInsideApp = navigator.userAgent.includes("MBBSWorldApp");
                                const slotName = isInsideApp ? "app_id" : "web_id";
                                const localId = localStorage.getItem('mbbs_device_id');

                                if (dbData && typeof dbData === 'object' && dbData[slotName] !== localId) {
                                    console.error("Device mismatch detected.");
                                    handleLogout();
                                }
                            } catch (e) { console.error('BG verify error', e); }
                        }
                    } else { handleLogout(); }
                }).catch(e => console.error('Sheet check fail', e));
        }

        if (savedUser.toLowerCase() !== 'naveen') {
            const safeName = savedUser.toLowerCase().replace(/[.#$\[\]]/g, '_');
            const activityUrl = `https://samvad-bafaa-default-rtdb.firebaseio.com/users/${encodeURIComponent(safeName)}/activityStats.json`;
            fetch(activityUrl).then(r => r.json()).then(data => {
                if (data) { window.activityStats.videos = data.videos || 0; window.activityStats.notes = data.notes || 0; window.activityStats.quizzes = data.quizzes || 0; }
            }).catch(e => console.error(e));

            activityTimer = setInterval(() => {
                if (!document.hasFocus()) return;
                let isVideoPlaying = false;
                if (window.activePlayerId && players[window.activePlayerId] && typeof players[window.activePlayerId].getPlayerState === 'function') {
                    if (players[window.activePlayerId].getPlayerState() === 1) isVideoPlaying = true;
                }
                if (isVideoPlaying) window.activityStats.videos += 5;
                else {
                    const f = document.getElementById('fileModal');
                    if (f && f.style.display === 'block') {
                        if (currentView === 'notes') window.activityStats.notes += 5;
                        else if (currentView === 'quizzes' || currentView === 'qbank') window.activityStats.quizzes += 5;
                    }
                }
            }, 5000);
            syncTimer = setInterval(() => { fetch(activityUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(window.activityStats) }); }, 60000);
        }
    } // End of isLoggedIn check

    // Only render home if no ?view= param — fetchSheetData handles routing when view param is present
    const _initParams = new URLSearchParams(window.location.search);
    if (!_initParams.get('view')) {
        renderHome();
    }
};

window.updateUserMenu = () => {
    const savedUser = sessionStorage.getItem('mbbs_user');
    const firstName = savedUser ? savedUser.split(' ')[0] : 'Student';
    const userNameSpan = document.getElementById('userName');
    const welcomeModalName = document.getElementById('welcomeNameModal');
    if (userNameSpan) userNameSpan.innerText = savedUser || '';
    if (welcomeModalName) welcomeModalName.innerText = firstName;
};

window.navigate = (view) => {
    if (['home', 'videos', 'notes', 'quizzes', 'qbank'].includes(view)) {
        document.getElementById('trustArea').style.display = 'none';
        document.getElementById('contentArea').style.display = 'block';
        if (view === 'home') showMainMenu(); else filterCategory(view);
    }
};

window.showTrustPage = (type) => {
    document.getElementById('contentArea').style.display = 'none';
    const area = document.getElementById('trustArea'); area.style.display = 'block'; window.scrollTo(0, 0);
    area.innerHTML = `
        <div class="welcome-section" style="padding: 1rem 0;">
            <button class="back-btn" onclick="navigate('home')"><i class="fas fa-arrow-left"></i> Home</button>
            <h1>${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}</h1>
        </div>
        <p style="padding:20px;">This is the ${type} page for MBBS World.</p>
    `;
};

function renderSubjectList(searchQuery = '') {
    const cleanQuery = searchQuery.toLowerCase().trim();
    const filteredSubjects = Object.keys(mbbsData).filter(subj => {
        const data = mbbsData[subj];
        if (!subj.replace(/_/g, ' ').toLowerCase().includes(cleanQuery)) return false;
        if (currentView === 'videos') return data.videos.length > 0;
        if (currentView === 'notes') return data.notes.length > 0;
        if (currentView === 'quizzes') return data.quizzes.length > 0;
        if (currentView === 'qbank') return data.qbank.some(item => item.platform === currentPlatform);
        return false;
    });

    document.getElementById('contentArea').innerHTML = `
        <div class="welcome-section" style="padding: 1rem 0;">
            <button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
            <h1><i class="fas fa-folder"></i> Select Subject</h1>
        </div>
        <div class="subject-sidebar">
            ${filteredSubjects.map(subj => `<div class="subject-item" onclick="setSubject('${subj}')"><span>${subj.replace(/_/g, ' ').toUpperCase()}</span></div>`).join('')}
        </div>
    `;
}

function setSubject(subjectName) {
    pushNavState();
    currentSubject = (!subjectName || subjectName.toLowerCase() === 'premium') ? 'premium' : subjectName.toLowerCase().trim().replace(/ /g, '_');
    selectedChapterIdx = null;
    renderContent();
}

function renderHome() {
    document.getElementById('contentArea').innerHTML = `
        <div class="hero-quantum" style="min-height: auto; padding: 4rem 1rem 2rem; text-align: center; width: 100%;">
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem; text-transform: none; letter-spacing: normal;">
                Welcome, <span style="color: var(--primary); text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);">${window.userSessionName || 'Student'}</span>
            </h1>
            <p style="color: var(--text-light); font-size: 1.1rem; margin-bottom: 3rem; font-family: var(--font-mono);">
                What would you like to study today?
            </p>
            
            <div class="portal-grid" style="width: 100%; max-width: 1200px; margin: 0 auto;">
                <div class="portal-card" data-index="01" onclick="filterCategory('videos')">
                    <i class="fas fa-stethoscope"></i>
                    <h3>Videos</h3>
                </div>
                <div class="portal-card" data-index="02" onclick="filterCategory('notes')">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>Notes</h3>
                </div>
                <div class="portal-card" data-index="03" onclick="filterCategory('quizzes')">
                    <i class="fas fa-microscope"></i>
                    <h3>Quizzes</h3>
                </div>
                <div class="portal-card" data-index="04" onclick="filterCategory('qbank')">
                    <i class="fas fa-dna"></i>
                    <h3>Q-Bank</h3>
                </div>
                <div class="portal-card" data-index="05" onclick="window.location.href='atrium.html'" style="border-color: rgba(14, 165, 233, 0.4);">
                    <i class="fas fa-hospital-user" style="color: #0ea5e9;"></i>
                    <h3 style="color: #0ea5e9;">Atrium</h3>
                </div>
            </div>
        </div>
    `;
}

// Add this function to handle the requested scroll teleport animation
function setupGlitchScroll() {
    window.addEventListener('scroll', () => {
        const icons = document.querySelectorAll('.float-icon');
        const scrollPosition = window.scrollY;

        icons.forEach(icon => {
            // Trigger glitch out when user scrolls past 150px
            if (scrollPosition > 150 && !icon.classList.contains('glitch-teleport')) {
                icon.classList.add('glitch-teleport');
            } else if (scrollPosition <= 150) {
                // Remove class to "teleport back in" if they scroll back up
                icon.classList.remove('glitch-teleport');
            }
        });
    });
}

function renderContent() {
    const area = document.getElementById('contentArea'); area.innerHTML = '';
    cleanupIframes(); updateOrientation();
    area.innerHTML = `<div style="display:flex; gap:10px; margin-bottom: 1.5rem;"><button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button><h1 style="margin:0; font-size:1.5rem;">${currentView.toUpperCase()}</h1></div>`;

    if (currentView === 'videos') {
        if (!currentSubject) return renderSubjectList();
        const data = mbbsData[currentSubject];
        if (selectedChapterIdx === null) {
            const list = document.createElement('div'); list.className = 'chapter-list';
            const currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
            data.videos.forEach((v, idx) => {
                const item = document.createElement('div'); item.className = 'chapter-card';
                const videoId = getYoutubeVideoId(v.link);
                const isWatched = localStorage.getItem('completed_' + currentUser + '_' + videoId) === 'true';

                if (isWatched) {
                    item.style.backgroundColor = '#d1fae5';
                    item.style.borderColor = '#10b981';
                    item.style.color = '#065f46';
                }

                item.onclick = () => { logStudentActivity(currentSubject, v.title); pushNavState(); selectedChapterIdx = idx; renderContent(); };
                const checkIcon = isWatched ? '<i class="fas fa-check-circle" style="color:#059669; margin-left:10px; font-size:1.1rem;"></i>' : '';
                item.innerHTML = `<div class="chapter-icon"><i class="fas fa-play" style="${isWatched ? 'color:#10b981;' : ''}"></i></div><div style="flex-grow:1; font-weight:500; display:flex; justify-content:space-between; align-items:center;"><span>Chapter ${idx + 1}: ${v.title}</span> ${checkIcon}</div>`;
                list.appendChild(item);
            });
            area.appendChild(list);
        } else renderVideoCard(area, data.videos[selectedChapterIdx], selectedChapterIdx);
    } else {
        if (!currentSubject && currentView !== 'qbank') return renderSubjectList();
        if (currentView === 'qbank' && !currentPlatform) return renderPlatforms();
        if (currentView === 'qbank' && !currentSubject) return renderSubjectList();
        const list = document.createElement('div'); list.className = 'chapter-list'; list.id = 'quiz-list-container';
        area.appendChild(list); renderItems();
    }
}

function renderItems() {
    const container = document.getElementById('quiz-list-container'); if (!container) return;
    const data = mbbsData[currentSubject]; if (!data) return;
    let items = currentView === 'notes' ? data.notes : currentView === 'quizzes' ? data.quizzes : data.qbank.filter(i => i.platform === currentPlatform);
    const currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';

    items.forEach((item) => {
        const card = document.createElement('div');
        const isQuiz = item.Type && item.Type.includes('quiz');
        let isCompleted = false;

        if (isQuiz) {
            isCompleted = localStorage.getItem('completed_quiz_' + currentUser + '_' + item.title) === 'true';
        }

        card.className = `chapter-card ${item.isPremium ? 'is-premium' : ''}`;

        if (isCompleted) {
            card.style.backgroundColor = '#d1fae5';
            card.style.borderColor = '#10b981';
            card.style.color = '#065f46';
        }

        card.onclick = () => {
            logStudentActivity(currentSubject, item.title);
            if (isQuiz) {
                openQuiz(item.link);
            } else {
                openFile(item.link);
            }
        };

        const checkIcon = isCompleted ? '<i class="fas fa-check-circle" style="color:#059669; margin-left:10px; font-size:1.1rem;"></i>' : '';
        const baseIcon = isQuiz ? 'fa-lightbulb' : 'fa-file-pdf';
        const iconColor = isCompleted ? 'color:#10b981;' : '';
        card.innerHTML = `<div class="chapter-icon"><i class="fas ${baseIcon}" style="${iconColor}"></i></div><div style="flex-grow:1; font-weight:500; display:flex; justify-content:space-between; align-items:center;"><span>${item.title}</span> ${checkIcon}</div>`;
        container.appendChild(card);
    });
}
// Global object to store timers for multiple players
window.playerControlTimers = {};

// Function to reset the 5-second countdown
window.resetControlsTimer = (uid) => {
    const controls = document.getElementById(`controls-${uid}`);
    if (!controls) return;

    // 1. Make controls visible
    controls.classList.remove('hidden');

    // 2. Clear any existing timer
    if (window.playerControlTimers[uid]) {
        clearTimeout(window.playerControlTimers[uid]);
    }

    // 3. Set a new 5-second timer ONLY if the video is currently playing
    if (players[uid] && players[uid].getPlayerState && players[uid].getPlayerState() === YT.PlayerState.PLAYING) {
        window.playerControlTimers[uid] = setTimeout(() => {
            controls.classList.add('hidden');
        }, 5000);
    }
};

// Function to handle when the user taps the video screen
window.handleVideoTap = (uid) => {
    const controls = document.getElementById(`controls-${uid}`);
    if (!controls) return;

    if (controls.classList.contains('hidden')) {
        // If hidden: Show them and restart the timer
        resetControlsTimer(uid);
    } else {
        // If visible: Hide them immediately (standard tap-to-hide UX)
        controls.classList.add('hidden');
        if (window.playerControlTimers[uid]) {
            clearTimeout(window.playerControlTimers[uid]);
        }
    }
};

// --- ADVANCED VIDEO CONTROLS INTEGRATION ---
function renderVideoCard(container, video, index) {
    const card = document.createElement('div'); card.className = 'card';
    let vid = video.link;
    const cleanVidId = getYoutubeVideoId(vid);
    const uid = `yt-${index}`;

    if (video.isRestricted) {
        card.innerHTML = `
            <div class="video-wrapper" style="background-color: #050505;">
                <div style="position: absolute; top:0; left:0; width:100%; height:100%; background-image: url('https://img.youtube.com/vi/${cleanVidId}/hqdefault.jpg'); background-size: cover; background-position: center; filter: blur(15px) brightness(0.25); z-index: 1;"></div>
                
                <div style="position: absolute; top:0; left:0; width:100%; height:100%; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5%; box-sizing: border-box;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; font-size: 18px;">🔞</div>
                    <h3 style="font-family: 'Syne', sans-serif; font-weight: 800; color: #ffffff; font-size: clamp(14px, 4vw, 16px); margin: 0 0 4px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">18+ Age Restricted Lecture</h3>
                    <p style="color: #cbd5e1; font-size: clamp(11px, 3vw, 13px); line-height: 1.3; margin: 0 0 12px 0; max-width: 95%; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                        Age-restricted by YouTube. Open directly in the app to verify your age.
                    </p>
                    <a href="https://www.youtube.com/watch?v=${cleanVidId}" target="_blank" style="background: #ef4444; color: #ffffff; padding: 8px 16px; font-size: clamp(12px, 3.5vw, 14px); font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); border: none;">
                        <i class="fab fa-youtube"></i> Open in YouTube App
                    </a>
                </div>
            </div>
            <div class="card-content"><div class="card-title">${video.title}</div></div>
        `;
        container.appendChild(card);
        
        // Also log this as watched if they click the button!
        const btn = card.querySelector('a');
        if (btn) {
            btn.onclick = () => {
                const currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
                localStorage.setItem('completed_' + currentUser + '_' + cleanVidId, 'true');
                logStudentActivity(currentSubject, video.title);
            };
        }
        return;
    }

    card.innerHTML = `
        <div class="video-wrapper">
            <div id="thumb-${uid}" style="position: absolute; top:0; left:0; width:100%; height:100%; background-image: url('https://img.youtube.com/vi/${cleanVidId}/hqdefault.jpg'); background-size: cover; background-position: center; z-index: 2; transition: opacity 0.4s ease;"></div>
            
            <div id="${uid}" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index: 1;"></div>
            
            <div class="glass-shield" style="z-index: 3;" onclick="handleVideoTap('${uid}')"></div>
        </div>
        
        <div class="custom-controls" id="controls-${uid}" style="z-index: 99;" onclick="resetControlsTimer('${uid}')" ontouchstart="resetControlsTimer('${uid}')">
            <div class="timeline-container">
                <input type="range" class="timeline" id="seek-${uid}" min="0" value="0" step="0.1" oninput="userSeek('${uid}', this.value)">
                <span class="time-display" id="time-${uid}">0:00 / 0:00</span>
            </div>
            <div class="buttons-row">
                <button class="ctrl-btn primary" id="toggle-${uid}" onclick="togglePlayPause('${uid}')">
                    <i class="fas fa-play"></i>
                </button>
                <button class="ctrl-btn" onclick="seekBy(-10, '${uid}')">
                    <i class="fas fa-undo"></i>
                </button>
                <button class="ctrl-btn" onclick="seekBy(10, '${uid}')">
                    <i class="fas fa-redo"></i>
                </button>
                <div class="speed-row" id="speed-row-${uid}">
                    <button class="speed-btn active" onclick="changeSpeed(1, '${uid}')">1x</button>
                    <button class="speed-btn" onclick="changeSpeed(1.5, '${uid}')">1.5x</button>
                    <button class="speed-btn" onclick="changeSpeed(2, '${uid}')">2x</button>
                </div>
                <button class="ctrl-btn" onclick="toggleFullScreen(this)">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        </div>
        <div class="card-content"><div class="card-title">${video.title}</div></div>
    `;
    container.appendChild(card);
    if (window.YT && window.YT.Player) createPlayer(uid, vid); else pendingPlayers.push({ id: uid, vid: vid });
}

window.onYouTubeIframeAPIReady = () => { pendingPlayers.forEach(p => createPlayer(p.id, p.vid)); pendingPlayers = []; };

function createPlayer(uid, vid) {
    const cleanVidId = getYoutubeVideoId(vid);
    players[uid] = new YT.Player(uid, {
        height: '100%', width: '100%', videoId: cleanVidId,
        playerVars: {
            'controls': 0,
            'disablekb': 1,
            'modestbranding': 1,
            'rel': 0,
            'playsinline': 1,
            'origin': window.location.origin
        },
        events: { 
            'onReady': (e) => onReady(e, uid), 
            'onStateChange': (e) => onStateChange(e, uid),
            'onError': (e) => onPlayerError(e, uid)
        }
    });
    players[uid].videoId = cleanVidId;
}

function onPlayerError(e, uid) {
    console.warn(`YouTube player error caught for player ${uid} (Code: ${e.data})`);
    
    // Code 101/150: Age-restricted or embedding disabled
    // Code 100: Removed/private
    // Code 5: General HTML5 loading error
    if (e.data === 101 || e.data === 150 || e.data === 100 || e.data === 5) {
        const playerElement = document.getElementById(uid);
        if (!playerElement) return;

        const card = playerElement.closest('.card');
        if (!card) return;

        const cleanVidId = players[uid] ? players[uid].videoId : "";
        card.innerHTML = `
            <div class="video-wrapper" style="background-color: #050505;">
                <div style="position: absolute; top:0; left:0; width:100%; height:100%; background-image: url('https://img.youtube.com/vi/${cleanVidId}/hqdefault.jpg'); background-size: cover; background-position: center; filter: blur(15px) brightness(0.25); z-index: 1;"></div>
                
                <div style="position: absolute; top:0; left:0; width:100%; height:100%; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5%; box-sizing: border-box;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; font-size: 18px;">⚠️</div>
                    <h3 style="font-family: 'Syne', sans-serif; font-weight: 800; color: #ffffff; font-size: clamp(14px, 4vw, 16px); margin: 0 0 4px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">18+ Age Restricted Lecture</h3>
                    <p style="color: #cbd5e1; font-size: clamp(11px, 3vw, 13px); line-height: 1.3; margin: 0 0 12px 0; max-width: 95%; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                        Age-restricted by YouTube. Open directly in the app to verify your age.
                    </p>
                    <a href="https://www.youtube.com/watch?v=${cleanVidId}" style="background: #ef4444; color: #ffffff; padding: 8px 16px; font-size: clamp(12px, 3.5vw, 14px); font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); border: none;">
                        ▶ Open in YouTube
                    </a>
                </div>
            </div>
        `;
    }
}

function onReady(e, uid) {
    const dur = e.target.getDuration();
    document.getElementById(`seek-${uid}`).max = dur;
    updateClock(uid, 0, dur);

    // RESUME LOGIC
    const vidData = e.target.getVideoData();
    const videoId = vidData.video_id;
    const currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
    const savedTime = localStorage.getItem('resume_' + currentUser + '_' + videoId) || localStorage.getItem('resume_' + videoId);
    if (savedTime) {
        e.target.seekTo(parseFloat(savedTime), true);
    }

    // APPLY PREFERRED SPEED
    const preferredSpeed = localStorage.getItem('preferred_speed') || 1;
    changeSpeed(parseFloat(preferredSpeed), uid);

    // AUTOMATICALLY START PLAYBACK
    e.target.playVideo();
}

function onStateChange(e, uid) {
    const videoId = players[uid].videoId;
    console.log(`Player ${uid} state changed to: ${e.data}`);

    if (e.data == YT.PlayerState.PLAYING) {
        window.activePlayerId = uid;
        updateOrientation();
        updatePlayPauseIcon(uid, true);

        // --- ADDED THIS LINE: Start auto-hide timer when video plays ---
        resetControlsTimer(uid);

        // FADE OUT THE CUSTOM THUMBNAIL SEAMLESSLY
        const thumbEl = document.getElementById(`thumb-${uid}`);
        if (thumbEl) {
            thumbEl.style.opacity = '0';
            setTimeout(() => { if (thumbEl) thumbEl.style.pointerEvents = 'none'; }, 400);
        }

        if (players[uid].timer) clearInterval(players[uid].timer);
        players[uid].timer = setInterval(() => {
            const t = e.target.getCurrentTime();
            const d = e.target.getDuration();
            const seekEl = document.getElementById(`seek-${uid}`);
            if (seekEl) seekEl.value = t;
            updateClock(uid, t, d);
            const currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
            localStorage.setItem('resume_' + currentUser + '_' + videoId, t);
            if (d > 0 && t > (d * 0.9)) localStorage.setItem('completed_' + currentUser + '_' + videoId, 'true');
        }, 1000);
    } else {
        if (players[uid].timer) clearInterval(players[uid].timer);
        updatePlayPauseIcon(uid, false);

        // --- ADDED THESE LINES: Keep controls visible when paused ---
        if (window.playerControlTimers[uid]) clearTimeout(window.playerControlTimers[uid]);
        const controls = document.getElementById(`controls-${uid}`);
        if (controls) controls.classList.remove('hidden');
    }
}

function updatePlayPauseIcon(uid, isPlaying) {
    const btn = document.getElementById(`toggle-${uid}`);
    if (btn) {
        btn.innerHTML = `<i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>`;
    }
}

function updateClock(uid, curr, dur) {
    const timeEl = document.getElementById(`time-${uid}`);
    if (timeEl) timeEl.innerText = `${fmt(curr)} / ${fmt(dur)}`;
}

function fmt(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sc = Math.floor(s % 60);
    return `${m}:${sc < 10 ? '0' : ''}${sc}`;
}

window.controlPlayer = (uid, a) => players[uid][a + 'Video']();
window.userSeek = (uid, v) => players[uid].seekTo(v, true);

window.changeSpeed = (rate, uid) => {
    if (players[uid] && players[uid].setPlaybackRate) {
        players[uid].setPlaybackRate(rate);
        localStorage.setItem('preferred_speed', rate);
        const row = document.getElementById(`speed-row-${uid}`);
        if (row) {
            row.querySelectorAll('.speed-btn').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.innerText) === rate || (rate === 1 && btn.innerText === 'Normal'));
            });
        }
        updateOverlaySpeedButtons();
    }
};

window.togglePlayPause = (uid) => {
    const p = players[uid];
    if (p) {
        const state = p.getPlayerState();
        if (state === YT.PlayerState.PLAYING) p.pauseVideo();
        else p.playVideo();
    }
};

window.seekBy = (seconds, uid) => {
    const p = players[uid];
    if (p) {
        const now = p.getCurrentTime();
        p.seekTo(now + seconds, true);
    }
};

window.toggleFullScreen = (btn) => {
    const c = btn.closest('.card');
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFullscreen) {
        let req = c.requestFullscreen || c.webkitRequestFullscreen || c.mozRequestFullScreen || c.msRequestFullscreen;
        if (req) {
            let promise = req.call(c);
            window.isFullscreenState = true;
            history.pushState({ isFullscreenTrap: true }, '');
            if (promise && promise.then) {
                promise.then(() => {
                    tryLockLandscape();
                    c.classList.add('fullscreen-mode');
                    updateOrientation();
                }).catch(e => console.error(e));
            } else {
                setTimeout(() => {
                    tryLockLandscape();
                    c.classList.add('fullscreen-mode');
                    updateOrientation();
                }, 100);
            }
        } else {
            // Fallback for iOS Safari or browsers that do not support Fullscreen API
            window.isFullscreenState = true;
            history.pushState({ isFullscreenTrap: true }, '');
            c.classList.add('fullscreen-mode');
            tryLockLandscape();
            updateOrientation();
        }
    } else {
        let ext = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (ext) ext.call(document);
    }
};

function tryLockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log('Ori lock fail:', e));
        } else if (screen.lockOrientation) {
            screen.lockOrientation('landscape');
        } else if (screen.mozLockOrientation) {
            screen.mozLockOrientation('landscape');
        } else if (screen.msLockOrientation) {
            screen.msLockOrientation('landscape');
        }
    } catch (e) { console.log('Lock error:', e); }
}

function handleExitFullscreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!isFullscreen) {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            } else if (screen.unlockOrientation) {
                screen.unlockOrientation();
            } else if (screen.mozUnlockOrientation) {
                screen.mozUnlockOrientation();
            } else if (screen.msUnlockOrientation) {
                screen.msUnlockOrientation();
            }
        } catch (e) { console.log('Unlock error:', e); }

        if (window.isFullscreenState) {
            window.isFullscreenState = false;
            window.ignoreNextPopState = true;
            history.back();
        }
    }
}

document.addEventListener('fullscreenchange', handleExitFullscreen);
document.addEventListener('webkitfullscreenchange', handleExitFullscreen);
document.addEventListener('mozfullscreenchange', handleExitFullscreen);
document.addEventListener('MSFullscreenChange', handleExitFullscreen);

function updateOverlaySpeedButtons() {
    const container = document.getElementById('overlaySpeedRow');
    if (!container) return;
    const currentSpeed = localStorage.getItem('preferred_speed') || 1;
    const speeds = [0.5, 1, 1.5, 2];

    container.innerHTML = speeds.map(s => `
        <button class="speed-btn ${parseFloat(currentSpeed) === s ? 'active' : ''}" 
                onclick="changeSpeed(${s}, '${activePlayerId}')">
            ${s === 1 ? 'Normal' : s + 'x'}
        </button>
    `).join('');
}

function updateOrientation() {
    const overlay = document.getElementById('landscapeOverlay');
    const isLandscape = window.innerHeight < window.innerWidth;
    
    if (isLandscape && window.activePlayerId) {
        overlay.classList.add('visible');
        updateOverlaySpeedButtons();
    } else {
        overlay.classList.remove('visible');
    }
    
    // Automatically apply fullscreen mode styles if we are in landscape and looking at a video!
    const activeVideoCard = document.querySelector('.video-wrapper');
    if (activeVideoCard) {
        const c = activeVideoCard.closest('.card');
        if (c) {
            if (isLandscape) {
                c.classList.add('fullscreen-mode');
            } else {
                if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
                    c.classList.remove('fullscreen-mode');
                }
            }
        }
    }
}
window.addEventListener('resize', updateOrientation); window.addEventListener('orientationchange', updateOrientation);
window.exitLandscape = () => { if (document.fullscreenElement) document.exitFullscreen(); document.getElementById('landscapeOverlay').classList.remove('visible'); };

function formatDriveLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/([^\/?#]+)|id=([^\/&#?]+)/);
    return (match && (match[1] || match[2])) ? `https://drive.google.com/file/d/${match[1] || match[2]}/preview` : url;
}
function checkNetworkSpeedAndWarn() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
        showSlowNetworkToast();
    }
}

function showSlowNetworkToast() {
    let notification = document.getElementById('network-status-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'network-status-notification';
        document.body.appendChild(notification);
    }
    notification.className = 'show';
    notification.style.backgroundColor = '#fff3cd';
    notification.style.color = '#856404';
    notification.style.borderColor = '#ffeeba';
    notification.innerHTML = `
        <div class="icon"><i class="fas fa-wifi"></i></div>
        <div class="message">Weak connection detected. Loading this resource may take longer.</div>
        <button class="close-btn" aria-label="Close notification" onclick="this.parentElement.classList.remove('show')">&times;</button>
    `;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

window.openQuiz = (url) => { 
    pushNavState(); 
    const loader = document.getElementById('pdfLoader');
    if (loader) loader.style.display = 'flex';
    checkNetworkSpeedAndWarn();
    document.getElementById('fileViewer').src = formatDriveLink(url); 
    document.getElementById('fileModal').style.display = 'block'; 
    document.body.style.overflow = 'hidden'; 
};

window.openFile = (urlOrContent) => { 
    pushNavState(); 
    const loader = document.getElementById('pdfLoader');
    if (loader) loader.style.display = 'flex';
    checkNetworkSpeedAndWarn();
    document.getElementById('fileViewer').src = urlOrContent.startsWith('http') ? formatDriveLink(urlOrContent) : urlOrContent; 
    document.getElementById('fileModal').style.display = 'block'; 
    document.body.style.overflow = 'hidden'; 
};

window.closeModal = () => { if (navHistory.length > 0) goBack(); else { cleanupIframes(); if (window.uiTimer) clearInterval(window.uiTimer); document.getElementById('fileModal').style.display = 'none'; document.body.style.overflow = 'auto'; } };

window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'quiz_fully_completed') {
        const currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
        let completedItemTitle = null;
        for (const subjKey in mbbsData) {
            for (const item of mbbsData[subjKey].quizzes) {
                if (item.link.includes(e.data.url_path)) {
                    completedItemTitle = item.title;
                    break;
                }
            }
            if (completedItemTitle) break;

            for (const item of mbbsData[subjKey].qbank) {
                if (item.link.includes(e.data.url_path)) {
                    completedItemTitle = item.title;
                    break;
                }
            }
            if (completedItemTitle) break;
        }

        if (completedItemTitle) {
            localStorage.setItem('completed_quiz_' + currentUser + '_' + completedItemTitle, 'true');
            if (currentView === 'quizzes' || currentView === 'qbank') {
                renderContent();
            }
        }
    }
});

function launchGuidedTour() {
    const driver = window.driver.js.driver;

    const driverObj = driver({
        showProgress: true,
        animate: true, // Smooth transitions
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.75)', // Dimmer background for better focus
        steps: [
            {
                popover: {
                    title: 'Welcome to MBBS World! 🩺',
                    description: 'Your all-in-one clinical companion. Let’s take a quick look at your new tools.',
                    side: "center",
                    align: 'start'
                }
            },
            {
                element: '.nav-brand',
                popover: {
                    title: 'Home Base',
                    description: 'One tap to return to your main dashboard from anywhere.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#nav-atrium', // New Feature Step
                popover: {
                    title: 'The Atrium 🏛️',
                    description: 'Step into the ward! Practice real clinical cases, earn XP, and climb the leaderboard.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#btn-daily-case',
                popover: {
                    title: 'AI Clinical Tutor 🤖',
                    description: 'Practice history taking and diagnosis with our realistic AI patient simulator.',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#mainNav',
                popover: {
                    title: 'Resource Library',
                    description: 'Quickly switch between HD Video lectures, PDF Notes, and high-yield Question Banks.',
                    side: "bottom",
                    align: 'center'
                }
            },
            {
                element: '#userProfileBtn',
                popover: {
                    title: 'Your Progress',
                    description: 'Track your study hours and monitor your clinical performance here.',
                    side: "bottom",
                    align: 'end'
                }
            }
        ]
    });

    driverObj.drive();
}

// Auto-launch for New Users only
window.addEventListener('load', () => {
    const tourDone = localStorage.getItem('mbbs_tour_completed');
    if (!tourDone) {
        // Short delay to ensure everything is rendered
        setTimeout(() => {
            launchGuidedTour();
            localStorage.setItem('mbbs_tour_completed', 'true');
        }, 1500);
    }
});
function showSkeletonLoading() {
    const area = document.getElementById('contentArea');

    // Creates a fake grid that mimics your portal cards while loading
    area.innerHTML = `
        <div class="welcome-section" style="padding: 1rem 0;">
            <div class="skeleton-box skel-title"></div>
        </div>
        <div class="portal-grid" style="margin-top:1rem;">
            ${Array(6).fill().map(() => `
                <div class="skeleton-box skel-card">
                    <div class="skeleton-box skel-icon"></div>
                    <div class="skeleton-box skel-text"></div>
                </div>
            `).join('')}
        </div>
    `;
}

// -----------------------------------------------------------------------------
// MOBILE PULL-TO-REFRESH PREVENTION
// Prevents Android WebViews (SwipeRefreshLayout) from refreshing the page.
// -----------------------------------------------------------------------------
let _touchStartY = 0;
document.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
        _touchStartY = e.touches[0].pageY;
    }
}, { passive: true });

document.addEventListener('touchmove', e => {
    if (e.touches.length === 0) return;
    const y = e.touches[0].pageY;
    const isDraggingDown = y > _touchStartY;
    
    if (isDraggingDown) {
        // Find if we are actively scrolling a nested element that is NOT at the top
        let el = e.target;
        let isAtTop = true;
        
        while (el && el !== document.body && el !== document.documentElement) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
                if (el.scrollTop > 0) {
                    isAtTop = false; // We are scrolling inside a container, allow it!
                    break;
                }
            }
            el = el.parentElement;
        }
        
        // If we reached the top of all scrollable containers, block the pull-to-refresh
        if (isAtTop && window.scrollY <= 0) {
            e.preventDefault();
        }
    }
}, { passive: false });
