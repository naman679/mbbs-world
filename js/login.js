// Content Protection (Strict Security Developer Mode)
const overlay = document.getElementById('security-overlay');
let initialHeight = window.innerHeight;

const toggleCurtain = (show) => { if (overlay) overlay.style.display = show ? 'flex' : 'none'; };

// 1. 'Volume Key' Trap (Android Best-Effort)
window.addEventListener('keydown', e => {
    if (e.key === 'VolumeDown' || e.key === 'VolumeUp' || e.keyCode === 174 || e.keyCode === 175) {
        e.preventDefault();
        toggleCurtain(true);
        setTimeout(() => toggleCurtain(false), 2000);
        console.warn("Security: Hardware button interaction detected.");
    }
});

// 2. 'Focus Loss' Trap (Instant Protection)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) toggleCurtain(true);
    else toggleCurtain(false);
});
window.addEventListener('blur', () => toggleCurtain(true));
window.addEventListener('focus', () => toggleCurtain(false));

// 3. 'Resize' Trap (Toolbar/Overlay Detection)
window.addEventListener('resize', () => {
    const heightDiff = Math.abs(initialHeight - window.innerHeight);
    if (heightDiff > 100) { // Significant shift often associated with screenshot UI
        toggleCurtain(true);
        setTimeout(() => {
            initialHeight = window.innerHeight;
            toggleCurtain(false);
        }, 1500);
    }
});

// 4. Manual Recovery
if (overlay) overlay.addEventListener('click', () => toggleCurtain(false));
if (overlay) overlay.addEventListener('touchstart', () => toggleCurtain(false));

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.key === 'PrintScreen' || (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p'))) {
        e.preventDefault();
        alert("Security Alert: Screen capture and source viewing are disabled for content protection.");
    }
});
document.addEventListener('dragstart', e => e.preventDefault());

const scriptURL = "https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec";

document.getElementById('login-submit-btn').addEventListener('click', handleLogin);
document.getElementById('student-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

function handleLogin() {
    const nameInput = document.getElementById('student-name');
    const name = nameInput.value.trim();
    const errorDiv = document.getElementById('error-message');
    const btn = document.getElementById('login-submit-btn');

    if (!name) {
        showError("Please enter your name.");
        return;
    }

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 10px;"></i> Verifying...';

    // Verify name against Google Apps Script (same logic as dashboard)
    fetch(`${scriptURL}?name=${encodeURIComponent(name)}`)
        .then(response => response.json())
        .then(data => {
            if (data.allowed) {
                // Success: Save to sessionStorage and redirect
                sessionStorage.setItem('mbbs_user', name);
                window.location.href = 'dashboard.html';
            } else {
                showError("Access Denied: Name not recognized. Please contact support.");
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> Access Portal';
            }
        })
        .catch(error => {
            console.error('Auth Error!', error.message);
            showError("Connection Error: Could not reach the verification server.");
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> Access Portal';
        });
}

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
}
