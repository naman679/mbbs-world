// --- AUTO-LOGIN CHECK (Instant) ---
(function checkAutoLogin() {
    const savedUser = localStorage.getItem('mbbs_saved_user');
    if (savedUser && savedUser !== 'null' && savedUser !== 'undefined' && savedUser.trim() !== '') {
        sessionStorage.setItem('mbbs_user', savedUser);
        window.location.replace('dashboard.html'); 
    }
})();

// Content Protection (Strict Security Developer Mode)
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

    fetch(`${scriptURL}?name=${encodeURIComponent(name)}`)
        .then(response => response.json())
        .then(async data => {
            if (data.allowed) {
                if (name.toLowerCase() === 'naveen') {
                    localStorage.setItem('mbbs_admin_device', 'true');
                }

                if (name.toLowerCase() !== 'naveen' && localStorage.getItem('mbbs_admin_device') !== 'true') {
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        const currentIP = ipData.ip;
                        const safeName = name.replace(/[.#$\[\]]/g, '_'); 
                        const dbUrl = `https://samvad-bafaa-default-rtdb.firebaseio.com/users/${encodeURIComponent(safeName)}.json`;

                        const dbResponse = await fetch(dbUrl);
                        const dbData = await dbResponse.json();

                        let localDeviceId = localStorage.getItem('mbbs_device_id');

                        if (!dbData) {
                            if (!localDeviceId) {
                                localDeviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                localStorage.setItem('mbbs_device_id', localDeviceId);
                            }

                            const previousUsername = localStorage.getItem('mbbs_previous_username');
                            let migratedStats = null;

                            if (previousUsername && previousUsername !== name) {
                                try {
                                    const oldSafeName = previousUsername.replace(/[.#$\[\]]/g, '_');
                                    const oldDbUrl = `https://samvad-bafaa-default-rtdb.firebaseio.com/users/${encodeURIComponent(oldSafeName)}.json`;
                                    const oldDbResponse = await fetch(oldDbUrl);
                                    const oldDbData = await oldDbResponse.json();

                                    if (oldDbData && oldDbData.deviceId === localDeviceId && oldDbData.activityStats) {
                                        migratedStats = oldDbData.activityStats;
                                    }
                                } catch (e) { console.error("Profile Migration failed:", e); }
                            }

                            const newUserPayload = { deviceId: localDeviceId, registeredIp: currentIP };
                            if (migratedStats) newUserPayload.activityStats = migratedStats;

                            await fetch(dbUrl, { method: 'PUT', body: JSON.stringify(newUserPayload) });

                        } else if (typeof dbData === 'string') {
                            if (!localDeviceId) {
                                localDeviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                localStorage.setItem('mbbs_device_id', localDeviceId);
                            }
                            await fetch(dbUrl, { method: 'PUT', body: JSON.stringify({ deviceId: localDeviceId, upgradedFromIp: currentIP }) });
                        } else if (typeof dbData === 'object' && dbData !== null) {
                            if (dbData.deviceId !== localDeviceId) {
                                if (currentIP === dbData.registeredIp || currentIP === dbData.upgradedFromIp || currentIP === dbData.lastKnownIp) {
                                    localDeviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                    localStorage.setItem('mbbs_device_id', localDeviceId);
                                    await fetch(dbUrl, { method: 'PATCH', body: JSON.stringify({ deviceId: localDeviceId, lastKnownIp: currentIP }) });
                                } else {
                                    showError("Access Denied: Please connect to your original Home Wi-Fi.");
                                    btn.disabled = false;
                                    btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> Access Portal';
                                    return;
                                }
                            } else {
                                await fetch(dbUrl, { method: 'PATCH', body: JSON.stringify({ lastKnownIp: currentIP }) });
                            }
                        }
                    } catch (verifyError) { console.error('Device Verification failed:', verifyError); }
                }

                sessionStorage.setItem('mbbs_user', name);
                localStorage.setItem('mbbs_saved_user', name);

                if (name.toLowerCase() !== 'naveen') {
                    localStorage.setItem('mbbs_previous_username', name);
                }

                window.location.replace('dashboard.html');
            } else {
                showError("Access Denied: Name not recognized.");
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> Access Portal';
            }
        })
        .catch(error => {
            showError("Connection Error: Could not reach server.");
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> Access Portal';
        });
}

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
}