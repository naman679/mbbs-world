// --- DATA ENGINE ---
let allData = []; // Global raw data
let mbbsData = {}; // Structured data
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSC_oD0BX4WhhLDL6e6WybIEXmvbiroBMBiGASJ2r-HdxlIOmDFqaWpUEMdDydPUHVOQNsOGGbgJR6O/pub?output=csv";

const MBBS_SUBJECTS = [
    "Anatomy", "Physiology", "Biochemistry",
    "Pharmacology", "Pathology", "Microbiology",
    "Forensic Medicine", "Community Medicine",
    "Medicine", "Surgery", "OBGY", "Pediatrics",
    "ENT", "Ophthalmology", "Orthopedics",
    "Dermatology", "Psychiatry", "Radiology", "Anaesthesia"
];

async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        let text = await response.text();

        // Remove Byte Order Mark (BOM) if present
        text = text.replace(/^\uFEFF/, '');

        // If it looks like HTML (Google login page or error), it's not a published CSV
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
            throw new Error("Invalid CSV format. Please ensure your Google Sheet is 'Published to the Web' as a CSV.");
        }

        console.log("Sheet data fetched successfully");
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) throw new Error("Spreadsheet is empty or has no data rows.");

        allData = lines.slice(1);
        mbbsData = {};
        allData.forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length < 4) return;

            // Consistent Mapping from Google Sheet (Column A=Subj, B=Type, C=Title, D=Link, E=Platform)
            const subjRaw = cols[0] || 'Other';
            const typeRaw = cols[1] || '';
            const titleRaw = cols[2] || 'Untitled';
            const linkRaw = cols[3] || '';
            const platformRaw = cols[4] || 'Other';

            const isPremium = subjRaw.toLowerCase() === "other" || !subjRaw;
            const cleanSubject = isPremium ? "Premium" : subjRaw;
            const subKey = isPremium ? "premium" : cleanSubject.toLowerCase().trim().replace(/ /g, '_');

            const typeKey = typeRaw.toLowerCase().trim();

            if (!mbbsData[subKey]) {
                mbbsData[subKey] = { videos: [], keyPoints: [], notes: [], qbank: [], quizzes: [] };
            }

            // Standardize object structure
            const item = {
                Subject: subjRaw, // Using user requested property name
                title: titleRaw,
                link: linkRaw,
                platform: platformRaw,
                Type: typeKey, // Standardizing on capital Type
                subjectName: cleanSubject,
                isPremium
            };

            if (typeKey === 'videos' || typeKey === 'video') {
                const vidId = getYoutubeVideoId(linkRaw);
                mbbsData[subKey].videos.push({ ...item, link: vidId });
            } else if (typeKey === 'notes') {
                mbbsData[subKey].notes.push(item);
            } else if (typeKey === 'qbank') {
                mbbsData[subKey].qbank.push(item);
            } else if (typeKey.includes('quiz')) {
                mbbsData[subKey].quizzes.push(item);
            } else if (typeKey === 'keypoints' || typeKey === 'keypoint') {
                mbbsData[subKey].keyPoints.push({ ...item, content: linkRaw });
            }
        });

        // Set initial UI
        showMainMenu();

    } catch (e) {
        console.error("CSV Fetch Error:", e);
        document.getElementById('contentArea').innerHTML = `
                    <div style="text-align:center; padding:5rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size:3rem; color:#ef4444; margin-bottom:1rem;"></i>
                        <h2 style="color:#ef4444; margin-bottom:0.5rem;">Data Load Failure</h2>
                        <p style="color:var(--text-light); max-width:500px; margin:0 auto;">${e.message}</p>
                        <div style="margin-top:2rem; font-size:0.9rem; color:var(--text-light)">
                            <p>Please ensure your Google Sheet is <b>Published to the Web</b>:</p>
                            <p>File -> Share -> Publish to the Web -> Link -> <b>CSV</b></p>
                        </div>
                    </div>
                `;
    }
}

function getYoutubeVideoId(url) {
    if (!url) return "";
    url = url.trim();
    if (url.length === 11 && !url.includes('.') && !url.includes('/')) return url;
    // Regex to strictly capture only 11 characters after any of the YouTube URL prefixes
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]{11}).*/;
    const match = url.match(regExp);
    const id = (match && match[2].length === 11) ? match[2] : url;
    return id;
}

// Theme Management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mbbs_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleMobileMenu() {
    const nav = id('mainNav');
    nav.classList.toggle('mobile-active');
}

function toggleSearch() {
    const bar = document.getElementById('searchBar');
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) {
        document.getElementById('globalSearch').focus();
    }
}

// Initialize Theme on load
(function initTheme() {
    const savedTheme = localStorage.getItem('mbbs_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

let currentView = 'home';
let currentSubject = null;
let currentPlatform = null;
let selectedChapterIdx = null;
let currentQuizFilter = 'all';
let players = {};
let pendingPlayers = [];
let navHistory = [];

function pushNavState() {
    navHistory.push({
        view: currentView,
        subject: currentSubject,
        platform: currentPlatform,
        chapterIdx: selectedChapterIdx,
        quizFilter: currentQuizFilter,
        scrollPos: window.scrollY
    });
}

window.goBack = () => {
    if (navHistory.length === 0) {
        showMainMenu();
        return;
    }

    // --- Bandwidth & Performance Fix: Clear background iframes ---
    cleanupIframes();

    const prevState = navHistory.pop();
    currentView = prevState.view;
    currentSubject = prevState.subject;
    currentPlatform = prevState.platform;
    selectedChapterIdx = prevState.chapterIdx;
    currentQuizFilter = prevState.quizFilter;

    // Re-render based on restored state
    if (currentView === 'home') {
        showMainMenu(true);
    } else if (currentView === 'qbank' && !currentPlatform) {
        filterCategory('qbank', true);
    } else {
        renderContent(true);
    }

    // Restore scroll position after rendering
    setTimeout(() => {
        window.scrollTo({ top: prevState.scrollPos, behavior: 'auto' });
    }, 100);
};

// --- SECURITY ENGINE ---
function initSecurity() {
    let initialHeight = window.innerHeight;
    // Block Context Menu Globally
    document.oncontextmenu = () => false;

    // Block Copy & Drag
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('dragstart', e => e.preventDefault());

    // 1. 'Volume Key' Trap (Android Best-Effort)
    window.addEventListener('keydown', e => {
        if (e.key === 'VolumeDown' || e.key === 'VolumeUp' || e.keyCode === 174 || e.keyCode === 175) {
            e.preventDefault();
            toggleCurtain(true);
            setTimeout(() => toggleCurtain(false), 2000);
        }
    });

    // Handle Privacy Curtain (Anti-Screen Record)
    const overlay = document.getElementById('security-overlay');
    const toggleCurtain = (show) => {
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
        if (show) {
            // Pause players if hidden
            Object.values(players).forEach(p => { if (p && p.pauseVideo) p.pauseVideo(); });
        }
    };

    // Events: visibilitychange, blur, focus
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) toggleCurtain(true);
        else toggleCurtain(false);
    });

    window.addEventListener('blur', (e) => {
        // Ignore focus moves to IFRAME to prevent flickering
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
        toggleCurtain(true);
    });
    window.addEventListener('focus', () => toggleCurtain(false));

    // 3. 'Resize' Trap (Toolbar/Overlay Detection)
    window.addEventListener('resize', () => {
        const heightDiff = Math.abs(initialHeight - window.innerHeight);
        if (heightDiff > 100) {
            toggleCurtain(true);
            setTimeout(() => {
                initialHeight = window.innerHeight;
                toggleCurtain(false);
            }, 1500);
        }
    });

    // 4. Manual Recovery
    if (overlay) {
        overlay.addEventListener('click', () => toggleCurtain(false));
        overlay.addEventListener('touchstart', () => toggleCurtain(false));
    }

    // Block PrintScreen & Shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'PrintScreen' || (e.ctrlKey && (e.key === 'p' || e.key === 'u' || e.key === 's'))) {
            e.preventDefault();
            console.warn("Security: Content capture blocked.");
        }
    });
}

function injectWatermark() {
    const container = document.getElementById('watermark-container');
    const watermarkText = 'Licensed to Student - Do Not Distribute';
    if (!container) return;

    container.innerHTML = '';
    // Create a dense grid of watermarks
    for (let i = 0; i < 60; i++) {
        const el = document.createElement('div');
        el.className = 'watermark-item';
        el.innerText = watermarkText;
        container.appendChild(el);
    }
}

function cleanupIframes() {
    // Stop any playing YouTube videos
    Object.values(players).forEach(p => {
        if (p && p.stopVideo) p.stopVideo();
        if (p && p.destroy) p.destroy();
    });
    players = {};
    pendingPlayers = [];
    window.activePlayerId = null;

    // Clear Quiz/PDF Iframe definately
    const viewer = document.getElementById('fileViewer');
    if (viewer) {
        viewer.src = '';
        viewer.removeAttribute('srcdoc');
    }

    // Close modal if open
    const modal = document.getElementById('fileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function handleSearch() {
    const query = document.getElementById('globalSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearch');
    const noResults = document.getElementById('noResults');
    const contentArea = document.getElementById('contentArea');

    clearBtn.style.display = query.length > 0 ? 'block' : 'none';

    let hasMatches = false;

    // Target all possible searchable elements
    const searchableItems = document.querySelectorAll('.portal-card, .chapter-card, .subject-item, .card');

    searchableItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        const match = text.includes(query);
        item.style.display = match ? '' : 'none';
        if (match) hasMatches = true;
    });

    // Special handling for section headers (Subject details view)
    const sectionHeaders = document.querySelectorAll('.section-title');
    sectionHeaders.forEach(header => {
        // In search mode, headers are shown if there's a match elsewhere or if query is empty
        // For a better experience, we show them if we are not in a deep search or if query is empty
        header.style.display = (query === '') ? 'block' : 'none';
    });

    // Handle No Results State
    if (query !== '' && !hasMatches) {
        noResults.style.display = 'block';
        contentArea.style.display = 'none';
    } else {
        noResults.style.display = 'none';
        contentArea.style.display = 'block';
    }
}

window.clearSearch = () => {
    const input = document.getElementById('globalSearch');
    input.value = '';
    handleSearch();
    input.focus();
};

// UI State Controllers
window.checkAccess = (name) => {
    if (!name) return;

    const scriptURL = "https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec";

    fetch(`${scriptURL}?name=${encodeURIComponent(name)}`)
        .then(response => response.json())
        .then(data => {
            if (data.allowed) {
                localStorage.setItem('mbbs_user', name);
                const firstName = name.split(' ')[0] || "Student";
                window.userSessionName = firstName;
                fetchSheetData();
                updateUserMenu();
            } else {
                console.error("Access validation failed");
            }
        })
        .catch(error => {
            console.error('Auth Error!', error.message);
        });
};

window.logStudentActivity = (subject, title) => {
    const userName = sessionStorage.getItem('mbbs_user');
    const scriptURL = "https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec";

    if (!userName || !subject || !title) return;

    console.log(`Logging activity: ${userName} - ${subject} - ${title}`);
    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors', // Standard for simple Apps Script POSTS
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, subject, title })
    }).catch(e => console.error("Logging failed:", e));
};

window.handleLogout = () => {
    sessionStorage.removeItem('mbbs_user');
    window.location.reload();
};

window.navigate = (view) => {
    if (view === 'home' || view === 'videos' || view === 'notes' || view === 'quizzes' || view === 'qbank') {
        const trustArea = document.getElementById('trustArea');
        const contentArea = document.getElementById('contentArea');
        if (trustArea) trustArea.style.display = 'none';
        if (contentArea) contentArea.style.display = 'block';

        if (view === 'home') showMainMenu();
        else filterCategory(view);
    }
};

window.showTrustPage = (type) => {
    const area = document.getElementById('trustArea');
    const contentArea = document.getElementById('contentArea');
    if (contentArea) contentArea.style.display = 'none';
    if (area) {
        area.style.display = 'block';
        window.scrollTo(0, 0);

        let html = `
                    <div class="welcome-section" style="padding: 1rem 0;">
                        <button class="back-btn" onclick="navigate('home')"><i class="fas fa-arrow-left"></i> Home</button>
                        <h1>${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}</h1>
                    </div>
                `;

        if (type === 'about') {
            html += `
                        <div class="minimalist-content">
                            <p>MBBS World is a premium study portal designed specifically for medical students. We provide high-quality videos, notes, and question banks to simplify your medical education journey.</p>
                            <p>Designed for focus and speed, our goal is to help you master the curriculum without distractions.</p>
                        </div>
                    `;
        } else if (type === 'disclaimer') {
            html += `
                        <div class="minimalist-content">
                            <p><b>Important Notice:</b> All content on MBBS World is for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.</p>
                            <p>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
                        </div>
                    `;
        } else {
            html += `<div class="minimalist-content"><p>Content for ${type} is coming soon.</p></div>`;
        }
        area.innerHTML = html;
    }
};

window.showMainMenu = (isBack = false) => {
    if (!isBack) pushNavState();
    currentView = 'home';
    currentSubject = null;
    currentPlatform = null;
    selectedChapterIdx = null;
    window.activePlayerId = null;
    updateOrientation();
    updateNavActive('home');
    renderHome();
};

window.filterCategory = (type, isBack = false) => {
    if (!isBack) pushNavState();
    currentView = type;
    currentPlatform = null;
    currentSubject = null;
    selectedChapterIdx = null;
    currentQuizFilter = 'all';
    window.activePlayerId = null;
    updateOrientation();
    updateNavActive(type);

    if (type === 'qbank') {
        renderPlatforms();
    } else {
        renderSubjectList();
    }
};

function renderPlatforms() {
    const area = document.getElementById('contentArea');
    const platforms = new Set();

    Object.values(mbbsData).forEach(subj => {
        subj.qbank.forEach(item => {
            if (item.platform) platforms.add(item.platform);
        });
    });

    const platformList = Array.from(platforms).sort();

    area.innerHTML = `
                <div class="welcome-section" style="padding: 1rem 0;">
                    <button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
                    <h1><i class="fas fa-layer-group"></i> Select Platform</h1>
                    <p>Choose a Question Bank provider</p>
                </div>
                <div class="portal-grid" style="margin-top:1rem;">
                    ${platformList.map(p => `
                        <div class="portal-card" onclick="setPlatform('${p}')">
                            <i class="fas fa-university"></i>
                            <h3>${p}</h3>
                        </div>
                    `).join('')}
                </div>
            `;

    if (platformList.length === 0) {
        area.innerHTML += `<div style="text-align:center; padding:2rem; color:var(--text-light)">No platforms found in Question Bank.</div>`;
    }
}

window.setPlatform = (platform) => {
    pushNavState();
    currentPlatform = platform;
    renderSubjectList();
};

function updateNavActive(view) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${view}`);
    if (activeLink) activeLink.classList.add('active');
}

function openWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
    }
}

window.closeWelcomeModal = () => {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.classList.remove('visible');
        localStorage.setItem('welcome_seen_v1', 'true');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500);
    }
};

window.onload = () => {
    const savedTheme = localStorage.getItem('mbbs_theme') || 'light';
    updateThemeIcon(savedTheme);

    const savedUser = sessionStorage.getItem('mbbs_user');
    if (!savedUser) {
        // Not logged in -> Go to Splash/Login page
        window.location.href = 'index.html';
        return;
    }

    fetchSheetData(); // Load data immediately for bots/reviewers

    // Background auth if user already exists
    const scriptURL = "https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec";
    fetch(`${scriptURL}?name=${encodeURIComponent(savedUser)}`)
        .then(r => r.json())
        .then(data => {
            if (data.allowed) {
                const firstName = savedUser.split(' ')[0] || "Student";
                window.userSessionName = firstName;
                document.getElementById('userName').innerText = savedUser;
                updateUserMenu();
            } else {
                // Access revoked or user removed from sheet -> Logout
                handleLogout();
            }
        })
        .catch(err => {
            console.error("Auth verify failed:", err);
            // If network fails, we still show data but maybe with less features
            const firstName = savedUser.split(' ')[0] || "Student";
            window.userSessionName = firstName;
            updateUserMenu();
        });

    updateUserMenu();
    initSecurity();
    injectWatermark();

    // Trigger Welcome Modal if not seen this session
    if (!localStorage.getItem('welcome_seen_v1')) {
        openWelcomeModal();
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

window.promptLogin = () => {
    const name = prompt("Please enter your name for activity tracking:");
    if (name) {
        sessionStorage.setItem('mbbs_user', name);
        window.location.reload();
    }
};

window.navigate = (view) => {
    if (view === 'home' || view === 'videos' || view === 'notes' || view === 'quizzes' || view === 'qbank') {
        document.getElementById('trustArea').style.display = 'none';
        document.getElementById('contentArea').style.display = 'block';
        if (view === 'home') showMainMenu();
        else filterCategory(view);
    }
};

window.showTrustPage = (type) => {
    const area = document.getElementById('trustArea');
    const contentArea = document.getElementById('contentArea');
    contentArea.style.display = 'none';
    area.style.display = 'block';
    window.scrollTo(0, 0);

    let html = `
                <div class="welcome-section" style="padding: 1rem 0;">
                    <button class="back-btn" onclick="navigate('home')"><i class="fas fa-arrow-left"></i> Home</button>
                    <h1>${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}</h1>
                </div>
            `;

    if (type === 'about') {
        html += `
                    <h2>About MBBS World</h2>
                    <p>MBBS World is a dedicated medical education platform created to provide medical students with structured, high-quality learning resources. As a medical student myself, I understand the challenges of navigating the vast MBBS curriculum.</p>
                    <p>Our resources are built upon the foundation of standard medical textbooks including:</p>
                    <ul>
                        <li><b>Anatomy:</b> B.D. Chaurasia, Gray's Anatomy for Students</li>
                        <li><b>Physiology:</b> Guyton and Hall Textbook of Medical Physiology, Ganong's Review of Medical Physiology</li>
                        <li><b>Biochemistry:</b> Harper's Illustrated Biochemistry</li>
                        <li><b>Pathology:</b> Robbins & Cotran Pathologic Basis of Disease</li>
                        <li><b>Internal Medicine:</b> Harrison's Principles of Internal Medicine</li>
                        <li><b>Surgery:</b> Bailey & Love's Short Practice of Surgery</li>
                    </ul>
                    <p>Our goal is to simplify medical learning through high-yield <b>MBBS notes</b>, interactive Q-Banks, and clinical video lectures.</p>
                `;
    } else if (type === 'disclaimer') {
        html += `
                    <h2>Medical Disclaimer</h2>
                     <p><b>Important:</b> The content provided on MBBS World (including videos, notes, quizzes, and Q-Bank) is for <b>educational purposes only</b> for medical students and healthcare professionals in training.</p>
                     <p>This information should NOT be used for self-diagnosis or as a substitute for professional medical advice, diagnosis, or treatment. We do not provide medical services or advice. Always seek the advice of a qualified physician or healthcare provider with any questions you may have regarding a medical condition.</p>
                     <p>While we strive for accuracy based on standard medical textbooks, medical knowledge is constantly evolving. Use this resource as a study aid, not as a clinical protocol.</p>
                `;
    } else if (type === 'privacy') {
        html += `<h2>Privacy Policy</h2><p>We respect your privacy. This portal uses minimal localStorage to save your progress and login session. We do not sell your personal data. Your activity logs are used solely for portal performance and access validation.</p>`;
    } else if (type === 'terms') {
        html += `<h2>Terms of Service</h2><p>By using MBBS World, you agree to use the content for personal study purposes only. Redistribution or unauthorized commercial use of the hosted medical resources is strictly prohibited.</p>`;
    } else if (type === 'contact') {
        html += `<h2>Contact Us</h2><p>For support or feedback, please reach out to us at <a href="mailto:support@mbbsworld.com">support@mbbsworld.com</a>. We are always looking for ways to improve our medical curriculum resources.</p>`;
    }

    area.innerHTML = html;
};

function renderSubjectList(searchQuery = '') {
    const area = document.getElementById('contentArea');
    const cleanQuery = searchQuery.toLowerCase().trim();

    // Filter subjects that actually have content for the current view and platform
    const filteredSubjects = Object.keys(mbbsData).filter(subj => {
        const data = mbbsData[subj];
        const matchesSearch = subj.replace(/_/g, ' ').toLowerCase().includes(cleanQuery);
        if (!matchesSearch) return false;

        if (currentView === 'videos') return data.videos && data.videos.length > 0;
        if (currentView === 'notes') return data.notes && data.notes.length > 0;
        if (currentView === 'quizzes') return data.quizzes && data.quizzes.length > 0;
        if (currentView === 'qbank') {
            const hasClassic = data.qbank && data.qbank.some(item => item.platform === currentPlatform);
            return hasClassic;
        }
        return false;
    });

    area.innerHTML = `
                <div class="welcome-section" style="padding: 1rem 0;">
                    <button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
                    <h1><i class="fas ${getViewIcon()}"></i> Select Subject</h1>
                    <p>Browsing ${currentView.toUpperCase()} ${currentPlatform ? `(${currentPlatform})` : ''}</p>
                </div>
                <div class="subject-sidebar">
                    ${filteredSubjects.map(subj => {
        const name = subj.replace(/_/g, ' ').toUpperCase();
        return `
                            <div class="subject-item" onclick="setSubject('${subj}')">
                                <span>${name}</span>
                            </div>`;
    }).join('')}
                </div>
            `;

    if (filteredSubjects.length === 0) {
        area.innerHTML += `<div style="text-align:center; padding:2rem; color:var(--text-light)">No subjects matching "${searchQuery}" found.</div>`;
    }
}

function getViewIcon() {
    if (currentView === 'videos') return 'fa-play-circle';
    if (currentView === 'notes') return 'fa-file-pdf';
    if (currentView === 'quizzes') return 'fa-lightbulb';
    if (currentView === 'qbank') return 'fa-tasks';
    return 'fa-folder';
}

function setSubject(subjectName) {
    pushNavState();

    if (!subjectName || subjectName.toLowerCase() === 'premium') {
        currentSubject = 'premium';
    } else {
        // Normalize for key-based lookup in mbbsData
        // This aligns with item.Subject.toLowerCase() === subjectName.toLowerCase() logic
        currentSubject = subjectName.toLowerCase().trim().replace(/ /g, '_');
    }

    selectedChapterIdx = null;
    renderContent();
}

function renderHome() {
    document.getElementById('contentArea').innerHTML = `
                <div class="welcome-section">
                    <div class="ecg-container">
                        <svg width="100%" height="100%" viewBox="0 0 1000 30" preserveAspectRatio="none">
                            <polyline class="ecg-line"
                                points="0,15 100,15 110,5 120,25 130,15 200,15 210,5 220,25 230,15 300,15 310,5 320,25 330,15 400,15 410,5 420,25 430,15 500,15 510,5 520,25 530,15 600,15 610,5 620,25 630,15 700,15 710,5 720,25 730,15 800,15 810,5 820,25 830,15 900,15 910,5 920,25 930,15 1000,15" />
                        </svg>
                    </div>
                    <h1>Welcome, <span id="welcomeNameHome">${window.userSessionName || 'Student'}</span></h1>
                    <p>What would you like to study today?</p>
                    
                    <div class="portal-grid">
                        <div class="portal-card" onclick="filterCategory('videos')">
                            <i class="fas fa-stethoscope"></i>
                            <h3>Videos</h3>
                        </div>
                        <div class="portal-card" onclick="filterCategory('notes')">
                            <i class="fas fa-clipboard-list"></i>
                            <h3>Notes</h3>
                        </div>
                        <div class="portal-card" onclick="filterCategory('quizzes')">
                            <i class="fas fa-microscope"></i>
                            <h3>Quizzes</h3>
                        </div>
                        <div class="portal-card" onclick="filterCategory('qbank')">
                            <i class="fas fa-dna"></i>
                            <h3>Q-Bank</h3>
                        </div>
                    </div>
                </div>
            `;
}

function renderContent(isBack = false) {
    const area = document.getElementById('contentArea');
    area.innerHTML = '';

    // --- Bandwidth & Performance Fix: Definitive Cleanup on every view change ---
    cleanupIframes();
    updateOrientation();

    // Header Section
    const header = document.createElement('div');
    header.innerHTML = `
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 1.5rem;">
                    <button class="back-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
                    <h1 style="margin:0; font-size:1.5rem;"><i class="fas ${getViewIcon()}"></i> ${currentView.toUpperCase()}</h1>
                </div>
            `;
    area.appendChild(header);

    if (currentView === 'videos') {
        // --- VIDEOS LOGIC (Subject Grid First) ---
        if (!currentSubject) {
            renderSubjectList();
            return;
        }

        const data = mbbsData[currentSubject];
        if (selectedChapterIdx === null) {
            // Show Chapter List
            const list = document.createElement('div');
            list.className = 'chapter-list';
            data.videos.forEach((v, idx) => {
                const vidId = v.link;
                const isDone = localStorage.getItem('completed_' + vidId) === 'true';
                const item = document.createElement('div');
                item.className = 'chapter-card';
                if (isDone) item.style.borderLeft = "4px solid #10b981";
                item.onclick = () => {
                    logStudentActivity(v.Subject || currentSubject, v.title);
                    pushNavState();
                    selectedChapterIdx = idx;
                    renderContent();
                };
                item.innerHTML = `
                            <div class="chapter-icon" style="${isDone ? 'background:rgba(16, 185, 129, 0.1); color:#10b981;' : ''}">
                                <i class="fas ${isDone ? 'fa-check-circle' : 'fa-play'}"></i>
                            </div>
                            <div style="flex-grow:1; font-weight:500;">
                                Chapter ${idx + 1}: ${v.title}
                            </div>
                            <i class="fas fa-circle-play" style="color:${isDone ? '#10b981' : 'var(--primary)'}; font-size:1.2rem;"></i>
                        `;
                list.appendChild(item);
            });
            area.appendChild(list);
        } else {
            renderVideoCard(area, data.videos[selectedChapterIdx], selectedChapterIdx);
        }
    } else if (currentView === 'notes' || currentView === 'quizzes') {
        // --- Permanent List View Level ---
        if (!currentSubject) {
            renderSubjectList();
            return;
        }

        const list = document.createElement('div');
        list.className = 'chapter-list';
        list.id = 'quiz-list-container';
        area.appendChild(list);

        renderItems();
    } else if (currentView === 'qbank') {
        // Keep legacy QBank Platform selection for now
        if (!currentPlatform) {
            renderPlatforms();
        } else if (!currentSubject) {
            renderSubjectList();
        } else {
            // Subject is selected, show the QBank items
            const list = document.createElement('div');
            list.className = 'chapter-list';
            list.id = 'quiz-list-container';
            area.appendChild(list);

            renderItems();
        }
    }
    if (area.innerHTML === '') {
        area.innerHTML = `
                    <div style="text-align:center; padding:5rem; color:var(--text-light)">
                        <i class="fas fa-search" style="font-size:3rem; opacity:0.1; margin-bottom:1rem;"></i>
                        <p>No content available for this subject yet.<br><span style="font-size:0.9rem; color:var(--primary)">✨ Try checking the Premium section!</span></p>
                    </div>
                `;
    }
}

function renderItems(searchQuery = '') {
    const container = document.getElementById('quiz-list-container');
    if (!container) return;
    container.innerHTML = '';

    const data = mbbsData[currentSubject];
    if (!data) {
        container.innerHTML = `<div style="text-align:center; padding:3.5rem; color:var(--text-light)">Subject data not found for "${currentSubject}".</div>`;
        return;
    }

    let items = [];
    if (currentView === 'notes') {
        items = data.notes;
    } else if (currentView === 'quizzes') {
        items = data.quizzes;
    } else if (currentView === 'qbank') {
        // Strict Filtering: Only show items explicitly marked as 'qbank' in Column B
        // Ensure platform matching is also respected
        items = data.qbank.filter(i => i.platform === currentPlatform && i.Type === 'qbank');
    }

    // Apply search filtering
    if (searchQuery) {
        items = items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    items.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = `chapter-card ${item.isPremium ? 'is-premium' : ''}`;

        const isQuiz = item.Type && item.Type.includes('quiz');
        card.onclick = () => {
            logStudentActivity(item.Subject || currentSubject, item.title);
            if (item.isPremium) {
                alert("👑 This high-value content is exclusive for Premium Members! Launching viewer...");
            }
            isQuiz ? openQuiz(item.link) : openFile(item.link);
        };

        const icon = isQuiz ? 'fa-lightbulb' : 'fa-file-pdf';
        const typeLabel = (item.Type && item.Type.includes('gt')) ? 'GT' : ((item.Type && item.Type.includes('pyq')) ? 'PYQ' : ((item.Type && item.Type.includes('btr')) ? 'BTR' : ''));

        card.innerHTML = `
                    <div class="chapter-icon"><i class="fas ${icon}"></i></div>
                    <div style="flex-grow:1; font-weight:500;">
                        ${typeLabel ? `<span class="quiz-type-icon">[${typeLabel}]</span> ` : ''}
                        ${item.title}
                        <div style="margin-top:4px; display:flex; align-items:center; flex-wrap:wrap; gap:5px;">
                            ${item.Subject ? `<span class="subject-badge">${item.Subject}</span>` : ''}
                            ${item.platform ? `<span class="platform-badge">${item.platform}</span>` : ''}
                        </div>
                    </div>
                    ${item.isPremium ? '<div class="premium-lock"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-external-link-alt" style="opacity:0.5;"></i>'}
                `;
        container.appendChild(card);
    });

    if (items.length === 0) {
        if (currentView === 'qbank') {
            container.innerHTML = `
                        <div style="text-align:center; padding:3.5rem; color:var(--text-light)">
                            <i class="fas fa-exclamation-circle" style="font-size:3rem; opacity:0.1; margin-bottom:1.5rem;"></i>
                            <p style="font-weight:600;">No QBank files found for this subject.</p>
                            <p style="font-size:0.85rem; margin-top:0.5rem; color:#ef4444;">Please check if <b>Column B</b> in your sheet says "qbank".</p>
                            <p style="font-size:0.8rem; margin-top:1rem; opacity:0.7;">Subject: ${currentSubject} | Platform: ${currentPlatform}</p>
                        </div>
                    `;
        } else {
            container.innerHTML = `
                        <div style="text-align:center; padding:3.5rem; color:var(--text-light)">
                            <i class="fas fa-folder-open" style="font-size:3rem; opacity:0.1; margin-bottom:1.5rem;"></i>
                            <p style="font-weight:600;">No items found in this section.</p>
                            <p style="font-size:0.85rem; margin-top:0.5rem;">Please check the 👑 <b>Premium</b> tab for more content!</p>
                        </div>
                    `;
        }
    }
}

function renderVideoCard(container, video, index) {
    const card = document.createElement('div'); card.className = 'card';
    let vid = video.link;
    const uid = `yt-${index}`;
    card.innerHTML = `
                <div class="video-wrapper">
                    <div id="${uid}"></div>
                    <div class="glass-shield"></div>
                </div>

                <!-- Moved outside wrapper for landscape flexibility -->
                <div class="custom-controls">
                    <div class="timeline-container">
                        <input type="range" class="timeline" id="seek-${uid}" min="0" value="0" oninput="userSeek('${uid}', this.value)">
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

function addSectionHeader(container, text, icon) {
    const h = document.createElement('h3'); h.className = 'section-title';
    h.innerHTML = `<i class="fas ${icon}"></i> ${text}`; container.appendChild(h);
}

// --- ADVANCED VIDEO LOGIC ---
window.handleTap = (e, uid) => {
    // Deprecated in favor of dedicated buttons
};

window.togglePlayPause = (uid) => {
    const p = players[uid];
    if (p) {
        const state = p.getPlayerState();
        if (state === YT.PlayerState.PLAYING) p.pauseVideo();
        else p.playVideo();
    }
};

function seekBy(seconds, uid) {
    const p = players[uid];
    if (p) {
        const now = p.getCurrentTime();
        p.seekTo(now + seconds, true);
    }
}


// ORIENTATION / FULLSCREEN OVERLAY
window.activePlayerId = null;
function updateOrientation() {
    const overlay = document.getElementById('landscapeOverlay');
    if (window.innerHeight < window.innerWidth && window.activePlayerId) {
        overlay.classList.add('visible');
        updateOverlaySpeedButtons();
    } else {
        overlay.classList.remove('visible');
    }
}
window.addEventListener('resize', updateOrientation);
window.addEventListener('orientationchange', updateOrientation);

function updateOverlaySpeedButtons() {
    const container = document.getElementById('overlaySpeedRow');
    const currentSpeed = localStorage.getItem('preferred_speed') || 1;
    const speeds = [0.5, 1, 1.5, 2];

    container.innerHTML = speeds.map(s => `
                <button class="speed-btn ${parseFloat(currentSpeed) === s ? 'active' : ''}" 
                        onclick="changeSpeed(${s}, '${activePlayerId}')">
                    ${s === 1 ? 'Normal' : s + 'x'}
                </button>
            `).join('');
}

window.exitLandscape = () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
    document.getElementById('landscapeOverlay').classList.remove('visible');
};

// --- PLAYER ENGINE ---
window.onYouTubeIframeAPIReady = () => { pendingPlayers.forEach(p => createPlayer(p.id, p.vid)); pendingPlayers = []; };
function createPlayer(uid, vid) {
    const cleanVidId = getYoutubeVideoId(vid);
    console.log('Playing Video ID:', cleanVidId); // Debug log for browser console

    players[uid] = new YT.Player(uid, {
        height: '100%', width: '100%', videoId: cleanVidId,
        playerVars: { 'controls': 0, 'disablekb': 1, 'modestbranding': 1, 'rel': 0, 'playsinline': 1, 'origin': window.location.origin },
        events: { 'onReady': (e) => onReady(e, uid), 'onStateChange': (e) => onStateChange(e, uid) }
    });
}
function onReady(e, uid) {
    const dur = e.target.getDuration();
    document.getElementById(`seek-${uid}`).max = dur;
    updateClock(uid, 0, dur);

    // RESUME LOGIC
    const vidData = e.target.getVideoData();
    const videoId = vidData.video_id;
    const savedTime = localStorage.getItem('resume_' + videoId);
    if (savedTime) {
        e.target.seekTo(parseFloat(savedTime), true);
    }

    // APPLY PREFERRED SPEED
    const preferredSpeed = localStorage.getItem('preferred_speed') || 1;
    changeSpeed(parseFloat(preferredSpeed), uid);
}
function onStateChange(e, uid) {
    const vidData = e.target.getVideoData();
    const videoId = vidData.video_id;

    if (e.data == YT.PlayerState.PLAYING) {
        window.activePlayerId = uid;
        updateOrientation();
        updatePlayPauseIcon(uid, true);
        e.target.setPlaybackQuality('hd720');
        if (players[uid].timer) clearInterval(players[uid].timer);
        players[uid].timer = setInterval(() => {
            const t = e.target.getCurrentTime();
            const d = e.target.getDuration();
            document.getElementById(`seek-${uid}`).value = t;
            updateClock(uid, t, d);

            // SAVE PROGRESS
            localStorage.setItem('resume_' + videoId, t);

            // TRACK COMPLETION (90%)
            if (d > 0 && t > (d * 0.9)) {
                localStorage.setItem('completed_' + videoId, 'true');
            }
        }, 1000);
    } else {
        clearInterval(players[uid].timer);
        updatePlayPauseIcon(uid, false);
    }
}

function updatePlayPauseIcon(uid, isPlaying) {
    const btn = document.getElementById(`toggle-${uid}`);
    if (btn) {
        btn.innerHTML = `<i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>`;
    }
}
function updateClock(uid, curr, dur) { document.getElementById(`time-${uid}`).innerText = `${fmt(curr)} / ${fmt(dur)}`; }
function fmt(s) { const m = Math.floor(s / 60); const sc = Math.floor(s % 60); return `${m}:${sc < 10 ? '0' : ''}${sc}`; }

window.controlPlayer = (uid, a) => players[uid][a + 'Video']();
window.userSeek = (uid, v) => players[uid].seekTo(v, true);

window.changeSpeed = (rate, uid) => {
    if (players[uid] && players[uid].setPlaybackRate) {
        players[uid].setPlaybackRate(rate);
        // Persistence
        localStorage.setItem('preferred_speed', rate);
        // UI Update Primary
        const row = document.getElementById(`speed-row-${uid}`);
        if (row) {
            row.querySelectorAll('.speed-btn').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.innerText) === rate || (rate === 1 && btn.innerText === 'Normal'));
            });
        }
        // UI Update Overlay
        updateOverlaySpeedButtons();
    }
};

window.openQuiz = (url) => {
    pushNavState(); // Save list state before opening modal
    const viewer = document.getElementById('fileViewer');
    const loader = document.getElementById('pdfLoader');

    viewer.removeAttribute('srcdoc');
    viewer.src = "about:blank";
    loader.style.display = 'block';

    const formattedUrl = formatDriveLink(url);
    viewer.src = formattedUrl;

    document.getElementById('fileModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.toggleFullScreen = (btn) => {
    const c = btn.closest('.card');
    if (!document.fullscreenElement) {
        c.requestFullscreen().then(updateOrientation).catch(e => console.error(e));
    } else {
        document.exitFullscreen();
    }
};

// --- FILE ENGINE ---
function formatDriveLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/([^\/?#]+)|id=([^\/&#?]+)/);
    const id = (match && (match[1] || match[2])) ? (match[1] || match[2]) : "";
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

window.openFile = (urlOrContent) => {
    pushNavState(); // Save list state before opening modal
    const viewer = document.getElementById('fileViewer');
    const loader = document.getElementById('pdfLoader');

    viewer.removeAttribute('srcdoc');
    viewer.src = "about:blank";
    loader.style.display = 'block';

    if (urlOrContent.startsWith('http')) {
        const formatted = formatDriveLink(urlOrContent);
        viewer.src = formatted;
    } else {
        viewer.srcdoc = urlOrContent;
    }

    document.getElementById('fileModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.togglePdfFullScreen = () => {
    const f = document.getElementById('fileModal');
    if (!document.fullscreenElement) f.requestFullscreen();
    else document.exitFullscreen();
};

window.toggleFocusMode = () => {
    const modal = document.getElementById('fileModal');
    const btn = document.getElementById('focusToggle');
    modal.classList.toggle('focus-mode');
    const isFocus = modal.classList.contains('focus-mode');
    btn.innerHTML = isFocus ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    btn.style.color = isFocus ? 'var(--accent)' : 'white';
};

window.closeModal = () => {
    // Close via goBack to restore previous list state and scroll Position
    if (navHistory.length > 0) {
        goBack();
    } else {
        cleanupIframes();
        document.getElementById('fileModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// --- SMART NETWORK & UTILS ---
function getViewIcon() {
    switch (currentView) {
        case 'home': return 'fa-house-medical';
        case 'videos': return 'fa-stethoscope';
        case 'notes': return 'fa-clipboard-list';
        case 'quizzes': return 'fa-microscope';
        case 'qbank': return 'fa-dna';
        default: return 'fa-folder-open';
    }
}

function initNetworkMonitor() {
    const banner = document.getElementById('network-banner');
    const toast = document.getElementById('network-toast');

    const updateStatus = () => {
        if (navigator.onLine) {
            banner.classList.remove('visible');
            checkSpeed();
        } else {
            banner.classList.add('visible');
        }
    };

    const checkSpeed = () => {
        if (navigator.connection) {
            const type = navigator.connection.effectiveType;
            if (type === '2g' || type === 'slow-2g') {
                toast.style.display = 'block';
                enableDataSaver();
                setTimeout(() => { toast.style.display = 'none'; }, 5000);
            }
        }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

function enableDataSaver() {
    console.log("Data Saver Mode Enabled");
    const media = document.querySelectorAll('video, iframe');
    media.forEach(m => {
        if (m.tagName === 'VIDEO') m.setAttribute('preload', 'none');
        m.removeAttribute('autoplay');
        // For YT iframes, we can't easily strip autoplay if it's in the URL, 
        // but createPlayer already handles playerVars.
    });
}

// Initialize features
initNetworkMonitor();
