// ==========================================
// 🚨 IMPORTANT: Paste Cloudflare Worker URL here after generation!
// ==========================================
const WORKER_URL = "https://mbbs-world-tutor.namanjain5359v.workers.dev";

let currentPhase = "history";
let messageHistory = [];
let activeCustomDisease = "";

const diseaseBank = [
    "Viral Fever", "Dengue Fever", "Typhoid Fever", "Malaria", "Chikungunya", "Pulmonary Tuberculosis", "Amoebic Dysentery", "Acute Gastroenteritis", "Food Poisoning",
    "Upper Respiratory Tract Infection (URTI)", "Acute Bronchitis", "Allergic Rhinitis", "Bronchial Asthma", "COPD Exacerbation", "Community Acquired Pneumonia",
    "GERD", "Peptic Ulcer Disease", "Irritable Bowel Syndrome", "Chronic Constipation", "Hemorrhoids", "Anal Fissure",
    "Essential Hypertension", "Stable Angina", "Congestive Heart Failure (Mild)",
    "Type 2 Diabetes Mellitus", "Hypothyroidism", "Hyperthyroidism", "Dyslipidemia", "Gout",
    "Osteoarthritis (Knee)", "Rheumatoid Arthritis", "Mechanical Low Back Pain", "Cervical Spondylosis", "Plantar Fasciitis",
    "Tinea Corporis (Ringworm)", "Scabies", "Acne Vulgaris", "Atopic Dermatitis", "Psoriasis", "Urticaria", "Cellulitis",
    "Acute Otitis Media", "Acute Sinusitis", "Acute Pharyngitis", "Acute Tonsillitis", "Impacted Cerumen",
    "Viral Conjunctivitis", "Bacterial Conjunctivitis", "Allergic Conjunctivitis", "Hordeolum (Stye)",
    "Generalized Anxiety Disorder", "Mild Depressive Episode", "Tension-type Headache", "Migraine without aura",
    "Hand Foot and Mouth Disease", "Varicella (Chickenpox)", "Measles", "Mumps",
    "Vulvovaginal Candidiasis", "Polycystic Ovarian Syndrome (PCOS)", "Primary Dysmenorrhea", "Pelvic Inflammatory Disease",
    "Uncomplicated UTI", "Benign Prostatic Hyperplasia (BPH)", "Renal Colic"
];

const phaseConfig = {
    history: { label: "Patient History", placeholder: "Ask the patient a question...", chips: ["Duration of symptoms?", "Past Medical History?", "Any allergies?"] },
    examination: { label: "Physical Exam", placeholder: "Perform an examination...", chips: ["Inspect general appearance", "Check pallor/icterus", "Auscultate chest", "Palpate abdomen"] },
    emergency: { label: "Vitals & Stabilize", placeholder: "Check vitals or stabilize...", chips: ["Check Vitals", "Check SpO2", "Give IV fluids", "Give Oxygen"] },
    investigation: { label: "Investigations", placeholder: "Order a test or scan...", chips: ["CBC", "RFT & LFT", "Chest X-Ray", "ECG", "Urine Routine"] },
    management: { label: "Prescribe & Plan", placeholder: "Prescribe medication...", chips: ["Give Paracetamol", "Prescribe Antibiotics", "Give Antacid", "Advise bed rest"] },
    diagnosis: { label: "Handoff & Disposition", placeholder: "State your final diagnosis...", chips: ["My diagnosis is...", "Admit to ward", "Discharge with meds"] }
};

const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const quickChipsDiv = document.getElementById('quickChips');

// --- DAILY LIMIT CHECK ---
function isLimitReached() {
    const currentUser = sessionStorage.getItem('mbbs_user');
    if (currentUser && currentUser.toLowerCase() === "naman") return false;

    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('daily_case_date');
    const count = parseInt(localStorage.getItem('daily_case_count') || "0");

    return (lastDate === today && count >= 2);
}

function showLimitScreen() {
    document.body.innerHTML = `
        <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0f172a; color:white; text-align:center; padding:30px; font-family: 'Inter', sans-serif;">
            <i class="fas fa-lock" style="font-size:4rem; color:#ef4444; margin-bottom:20px;"></i>
            <h1 style="margin-bottom:10px;">Daily Limit Reached</h1>
            <p style="color:#94a3b8; max-width:300px;">You have already solved 2 cases today. Come back tomorrow for more clinical practice!</p>
            <button onclick="window.location.href='dashboard.html'" style="margin-top:30px; padding:12px 24px; background:#059669; border:none; color:white; border-radius:8px; font-weight:600; cursor:pointer;">Back to Dashboard</button>
        </div>`;
}

window.onload = () => {
    if (isLimitReached()) {
        showLimitScreen();
    } else {
        startNewCase();
        switchPhase('history');
    }
}

async function startNewCase() {
    // --- UPDATE DAILY COUNT ---
    const currentUser = sessionStorage.getItem('mbbs_user');
    if (!currentUser || currentUser.toLowerCase() !== "naman") {
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem('daily_case_date');
        let count = (lastDate === today) ? parseInt(localStorage.getItem('daily_case_count') || "0") : 0;

        localStorage.setItem('daily_case_date', today);
        localStorage.setItem('daily_case_count', count + 1);
    }

    // --- NON-REPEATING WHITELIST LOGIC ---
    let completedDiseases = JSON.parse(localStorage.getItem('mbbs_completed_cases')) || [];
    let availableDiseases = diseaseBank.filter(disease => !completedDiseases.includes(disease));

    if (availableDiseases.length === 0) {
        alert("Awesome job! You have completed all available clinical cases. Progress reset.");
        completedDiseases = [];
        localStorage.setItem('mbbs_completed_cases', JSON.stringify(completedDiseases));
        availableDiseases = [...diseaseBank];
    }

    activeCustomDisease = availableDiseases[Math.floor(Math.random() * availableDiseases.length)];
    logStudentActivity("Daily Case", activeCustomDisease);

    completedDiseases.push(activeCustomDisease);
    localStorage.setItem('mbbs_completed_cases', JSON.stringify(completedDiseases));

    // Reset UI
    messageHistory = [];
    chatContainer.innerHTML = '';
    appendMessage("system", `🔄 **NEXT PATIENT CALLED!** \n\nA new patient has just walked into your cabin.`);

    chatInput.disabled = true;
    sendBtn.disabled = true;
    const loadingId = // Replace the old loadingId line with this:
        appendMessage("system", "Patient is walking in and taking a seat...");


    try {
        const tempHistory = [{ role: "user", parts: [{ text: "[PATIENT_ENTRY]" }] }];
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: tempHistory,
                customDisease: activeCustomDisease,
                phase: currentPhase
            })
        });

        const data = await response.json();
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();

        if (data.errorFromGroq) {
            appendMessage("ai", `System Error: ${data.errorFromGroq}`);
        } else if (data.candidates && data.candidates.length > 0) {
            let aiText = data.candidates[0].content.parts[0].text;
            let formattedText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            appendMessage("ai", formattedText);
            messageHistory.push({ role: "user", parts: [{ text: "Hello, please come in and tell me your problem." }] });
            messageHistory.push({ role: "model", parts: [{ text: aiText }] });
        }
    } catch (error) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        appendMessage("ai", `Connection Error. Check Cloudflare Worker.`);
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// Activity Logging to Google Sheet
function logStudentActivity(subject, title) {
    const userName = sessionStorage.getItem('mbbs_user');
    if (!userName || !subject || !title) return;
    fetch("https://script.google.com/macros/s/AKfycbyKKtYO8z3gBk1GiOHSMX8DJV7CikXupAP8sYLRoxASPFBUslRtHIQFoYsqy9ie_v6clQ/exec", {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName, subject, title })
    }).catch(e => console.error(e));
}

function switchPhase(phase) {
    currentPhase = phase;
    const config = phaseConfig[phase];

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.phase === currentPhase) {
            btn.classList.add('active');
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    });

    document.getElementById('phaseLabel').textContent = config.label;
    chatInput.placeholder = config.placeholder;

    quickChipsDiv.innerHTML = '';
    if (config.chips) {
        config.chips.forEach(chipText => {
            const btn = document.createElement('button');
            btn.className = 'quick-chip';
            btn.textContent = chipText;
            btn.onclick = () => {
                chatInput.value = chipText;
                handleSend();
            };
            quickChipsDiv.appendChild(btn);
        });
    }
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    const lowerText = text.toLowerCase();
    if (lowerText === "change the case" || lowerText === "change case" || lowerText === "next patient") {
        if (isLimitReached()) {
            showLimitScreen();
        } else {
            chatInput.value = '';
            startNewCase();
        }
        return;
    }

    appendMessage("user", text);
    messageHistory.push({ role: "user", parts: [{ text: text }] });

    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Replace the old loadingId line with this:
    const loadingId = showTypingIndicator();

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: messageHistory,
                customDisease: activeCustomDisease,
                phase: currentPhase
            })
        });

        const data = await response.json();
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();

        if (data.errorFromGroq) {
            appendMessage("ai", `System Error: ${data.errorFromGroq}`);
        } else if (data.candidates && data.candidates.length > 0) {
            let aiText = data.candidates[0].content.parts[0].text;
            let formattedText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            appendMessage("ai", formattedText);
            messageHistory.push({ role: "model", parts: [{ text: aiText }] });
        }

    } catch (error) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        appendMessage("ai", `Connection Error. Check Cloudflare Worker.`);
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
    }
}

function appendMessage(sender, text) {
    const wrapper = document.createElement('div');
    const uniqueId = 'msg-' + Date.now();
    wrapper.id = uniqueId;
    wrapper.className = `message-wrapper ${sender}`;

    let innerHTML = '';
    if (sender === 'ai') {
        innerHTML = `<div class="message ai">
                        <div class="ai-header"><i class="fas fa-robot"></i> Sim Engine</div>
                        <div class="ai-content">${text}</div>
                     </div>`;
    } else if (sender === 'system') {
        innerHTML = `<div class="message ai" style="background:#f1f5f9; text-align:center; margin: 0 auto; width: 100%;">
                        <div class="ai-content" style="color: #64748b; font-size: 0.85rem;">${text}</div>
                     </div>`;
    } else {
        innerHTML = `<div class="message user">${text}</div>`;
    }

    wrapper.innerHTML = innerHTML;
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return uniqueId;
}

function resetSimulation() {
    if (confirm("Restart clinic session? Current progress will be lost.")) {
        location.reload();
    }
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
        chatInput.blur();
    }
});

chatInput.addEventListener('focus', () => {
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 150); // Shortened the timeout slightly for better responsiveness
});
// --- MOBILE KEYBOARD FIX ---
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        // Force the body height to match the visible area above the keyboard
        document.body.style.height = `${window.visualViewport.height}px`;

        // Immediately scroll the chat to the bottom so the latest message is visible
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });
}
function showTypingIndicator() {
    const wrapper = document.createElement('div');
    const uniqueId = 'msg-' + Date.now();
    wrapper.id = uniqueId;
    wrapper.className = `message-wrapper ai`;

    wrapper.innerHTML = `
        <div class="message ai">
            <div class="ai-header"><i class="fas fa-robot"></i> Sim Engine</div>
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>`;

    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return uniqueId;
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