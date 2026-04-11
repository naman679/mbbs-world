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

window.onload = () => {
    startNewCase();
    switchPhase('history');
}

async function startNewCase() {
    // --- NON-REPEATING WHITELIST LOGIC ---

    // 1. Fetch completed diseases from Local Storage (or DB later)
    let completedDiseases = JSON.parse(localStorage.getItem('mbbs_completed_cases')) || [];

    // 2. Filter the master bank to only show diseases the user HAS NOT done
    let availableDiseases = diseaseBank.filter(disease => !completedDiseases.includes(disease));

    // 3. Handle the scenario where the user has completed all 70+ cases
    if (availableDiseases.length === 0) {
        alert("Awesome job! You have completed all available clinical cases. We will reset your progress so you can practice again.");
        completedDiseases = []; // Reset the list
        localStorage.setItem('mbbs_completed_cases', JSON.stringify(completedDiseases));
        availableDiseases = [...diseaseBank]; // Refill available diseases
    }

    // Select a random disease from the AVAILABLE list
    activeCustomDisease = availableDiseases[Math.floor(Math.random() * availableDiseases.length)];

    // Log Activity to Google Sheet
    logStudentActivity("Daily Case", activeCustomDisease);

    // 5. Save this new disease to completed list so it doesn't repeat next time
    completedDiseases.push(activeCustomDisease);
    localStorage.setItem('mbbs_completed_cases', JSON.stringify(completedDiseases));

    // --------------------------------------

    messageHistory = [];
    chatContainer.innerHTML = '';

    appendMessage("system", `🔄 **NEXT PATIENT CALLED!** \n\nA new patient has just walked into your cabin.`);

    chatInput.disabled = true;
    sendBtn.disabled = true;
    const loadingId = appendMessage("ai", "Patient is walking in and sitting down...");

    try {
        const tempHistory = [{ role: "user", parts: [{ text: "[PATIENT_ENTRY]" }] }];
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: tempHistory,
                customDisease: activeCustomDisease, // Sends the unique disease to Cloudflare
                phase: currentPhase
            })
        });

        const data = await response.json();
        document.getElementById(loadingId).remove();

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
        chatInput.value = '';
        startNewCase();
        return;
    }

    appendMessage("user", text);
    messageHistory.push({ role: "user", parts: [{ text: text }] });

    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    const loadingId = appendMessage("ai", "Processing...");

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
        document.getElementById(loadingId).remove();

        if (data.errorFromGroq) {
            appendMessage("ai", `System Error: ${data.errorFromGroq}`);
        } else if (data.candidates && data.candidates.length > 0) {
            let aiText = data.candidates[0].content.parts[0].text;
            let formattedText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            appendMessage("ai", formattedText);
            messageHistory.push({ role: "model", parts: [{ text: aiText }] });
        }

    } catch (error) {
        document.getElementById(loadingId).remove();
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
    // Set a tiny timeout to wait for the keyboard to fully animate up
    setTimeout(() => {
        // Scroll the input area into view smoothly
        chatInput.scrollIntoView({ behavior: 'smooth', block: 'end' });

        // Ensure the chat container scrolls to the very bottom so messages aren't hidden
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 300);
});

