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

const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');

window.onload = () => {
    activeCustomDisease = diseaseBank[Math.floor(Math.random() * diseaseBank.length)];
}

function switchPhase(phase) {
    currentPhase = phase;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.phase === currentPhase) {
            btn.classList.add('active');
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); // Auto-scrolls tabs on mobile
        }
    });

    const labels = { history: "Patient History", examination: "Physical Exam", emergency: "Vitals & Stabilize", investigation: "Investigations", management: "Prescribe & Plan", diagnosis: "Handoff & Disposition" };
    document.getElementById('phaseLabel').textContent = labels[phase];
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    const lowerText = text.toLowerCase();
    if (lowerText === "change the case" || lowerText === "change case" || lowerText === "next patient") {
        activeCustomDisease = diseaseBank[Math.floor(Math.random() * diseaseBank.length)];
        messageHistory = []; 
        chatContainer.innerHTML = '';
        appendMessage("ai", `🔄 **NEXT PATIENT CALLED!** \n\nThe previous patient left the clinic. A new patient has just walked in. What is your first question?`);
        chatInput.value = '';
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
        // Note: We intentionally DO NOT call chatInput.focus() here on mobile, 
        // otherwise the keyboard will aggressively pop back up after every message.
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
    } else {
        innerHTML = `<div class="message user">${text}</div>`;
    }
    
    wrapper.innerHTML = innerHTML;
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return uniqueId;
}

function resetSimulation() {
    if(confirm("Restart clinic session? Current progress will be lost.")) {
        location.reload();
    }
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') { 
        e.preventDefault(); 
        handleSend(); 
        chatInput.blur(); // Hides keyboard on mobile after pressing Enter
    }
});
