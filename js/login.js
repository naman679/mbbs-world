// --- Content Protection (Strict Security Developer Mode) ---
const overlay = document.getElementById('security-overlay');
let initialHeight = window.innerHeight;

const toggleCurtain = (show) => { if (overlay) overlay.style.display = show ? 'flex' : 'none'; };

window.addEventListener('keydown', e => {
    if (e.key === 'VolumeDown' || e.key === 'VolumeUp' || e.keyCode === 174 || e.keyCode === 175) {
        e.preventDefault();
        toggleCurtain(true);
        setTimeout(() => toggleCurtain(false), 2000);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) toggleCurtain(true);
    else toggleCurtain(false);
});
window.addEventListener('blur', () => toggleCurtain(true));
window.addEventListener('focus', () => toggleCurtain(false));

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

// NOTE: The old login script was removed from here because index.html 
// now handles the secure Firebase Dual-Slot login.