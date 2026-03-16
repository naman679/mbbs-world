// --- AUTO-LOGIN CHECK ---
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('mbbs_saved_user');
    const deviceId = localStorage.getItem('mbbs_device_id');
    
    // If they have a saved identity on this device, send straight to dashboard
    if (savedUser && deviceId) {
        sessionStorage.setItem('mbbs_user', savedUser);
        window.location.href = 'dashboard.html';
    }
});

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

    // Verify name against Google Apps Script
    fetch(`${scriptURL}?name=${encodeURIComponent(name)}`)
        .then(response => response.json())
        .then(async data => {
            if (data.allowed) {
                // Device ID & Legacy IP Restriction Check
                if (name.toLowerCase() === 'naveen') {
                    // Set an admin flag on this device so they can test other accounts later
                    localStorage.setItem('mbbs_admin_device', 'true');
                }

                if (name.toLowerCase() !== 'naveen' && localStorage.getItem('mbbs_admin_device') !== 'true') {
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        const currentIP = ipData.ip;
                        const safeName = name.replace(/[.#$\[\]]/g, '_'); // Firebase key safe
                        const dbUrl = `https://samvad-bafaa-default-rtdb.firebaseio.com/users/${encodeURIComponent(safeName)}.json`;

                        const dbResponse = await fetch(dbUrl);
                        const dbData = await dbResponse.json();

                        let localDeviceId = localStorage.getItem('mbbs_device_id');

                        if (!dbData) {
                            // NEW USER: First time login for this user OR User Renamed
                            if (!localDeviceId) {
                                localDeviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                localStorage.setItem('mbbs_device_id', localDeviceId);
                            }

                            // --- PROFILE MIGRATION LOGIC ---
                            const previousUsername = localStorage.getItem('mbbs_previous_username');
                            let migratedStats = null;

                            if (previousUsername && previousUsername !== name) {
                                try {
                                    // Check if the old username exists in Firebase and belongs to THIS physical device perfectly.
                                    const oldSafeName = previousUsername.replace(/[.#$\[\]]/g, '_');
                                    const oldDbUrl = `https://samvad-bafaa-default-rtdb.firebaseio.com/users/${encodeURIComponent(oldSafeName)}.json`;
                                    const oldDbResponse = await fetch(oldDbUrl);
                                    const oldDbData = await oldDbResponse.json();

                                    // SECURITY: Only migrate stats if the OLD acount was bound to THIS exact device ID.
                                    if (oldDbData && oldDbData.deviceId === localDeviceId && oldDbData.activityStats) {
                                        migratedStats = oldDbData.activityStats;
                                        console.log("Profile Migration: Successfully securely transferred stats from", previousUsername, "to", name);
                                    }
                                } catch (e) {
                                    console.error("Failed to migrate old profile stats:", e);
                                }
                            }

                            // Create the new user record, optionally injecting the migrated stats!
                            const newUserPayload = { deviceId: localDeviceId, registeredIp: currentIP };
                            if (migratedStats) {
                                newUserPayload.activityStats = migratedStats;
                            }

                            await fetch(dbUrl, {
                                method: 'PUT',
                                body: JSON.stringify(newUserPayload)
                            });

                        } else if (typeof dbData === 'string') {
                            // LEGACY MIGRATION: Auto-upgrade to Device ID
                            if (!localDeviceId) {
                                localDeviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                localStorage.setItem('mbbs_device_id', localDeviceId);
                            }
                            await fetch(dbUrl, {
                                method: 'PUT',
                                body: JSON.stringify({ deviceId: localDeviceId, upgradedFromIp: currentIP })
                            });
                        } else if (typeof dbData === 'object' && dbData !== null) {
                            // DEVICE ID BOUND USER: Normal check
                            if (dbData.deviceId !== localDeviceId) {
                                // Device ID Mismatch
                                if (currentIP === dbData.registeredIp || currentIP === dbData.upgradedFromIp || currentIP === dbData.lastKnownIp) {
                                    // Auto-recover! Generate new Device ID
                                    localDeviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                    localStorage.setItem('mbbs_device_id', localDeviceId);

                                    await fetch(dbUrl, {
                                        method: 'PATCH',
                                        body: JSON.stringify({ deviceId: localDeviceId, lastKnownIp: currentIP })
                                    });
                                } else {
                                    showError("Access Denied: If you cleared your browser cache, please connect to your original Home Wi-Fi to recover your account.");
                                    btn.disabled = false;
                                    btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> Access Portal';
                                    return;
                                }
                            } else {
                                await fetch(dbUrl, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ lastKnownIp: currentIP })
                                });
                            }
                        }
                    } catch (verifyError) {
                        console.error('Device/IP Verification failed:', verifyError);
                    }
                }

                // Success: Save to sessionStorage AND localStorage
                sessionStorage.setItem('mbbs_user', name);
                localStorage.setItem('mbbs_saved_user', name); // --- NEW PERSISTENT MEMORY ---

                // Track previous username for automatic precise stats migration
                if (name.toLowerCase() !== 'naveen') {
                    localStorage.setItem('mbbs_previous_username', name);
                }

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