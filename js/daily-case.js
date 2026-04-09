// ── STATE ──
let chatHistory = [];
let currentPhase = 'history';
let customDisease = '';
let completedPhases = [];

const WORKER_URL = 'https://mbbs-world-tutor.namanjain5359v.workers.dev';

const phases = ['history', 'examination', 'investigation', 'diagnosis', 'management', 'emergency'];

const phaseConfig = {
    history: {
        label: '📋 Phase 1: History Taking',
        hint: 'Ask the patient about their symptoms, duration, onset, past history, family history...',
        hintClass: '',
        chips: ['Chief complaint?', 'Duration of symptoms?', 'Any fever?', 'Past medical history?', 'Family history?', 'Drug history?'],
        placeholder: 'Ask the patient about their symptoms...'
    },
    examination: {
        label: '🩺 Phase 2: Physical Examination',
        hint: 'Request specific examinations: vitals, inspection, palpation, percussion, auscultation...',
        hintClass: 'examination',
        chips: ['Check vitals', 'Inspect abdomen', 'Palpate abdomen', 'Auscultate chest', 'Check for dehydration', 'Examine lymph nodes'],
        placeholder: 'Request a physical examination finding...'
    },
    investigation: {
        label: '🔬 Phase 3: Investigations',
        hint: 'Order investigations one by one: CBC, LFT, RFT, X-ray, USG, ECG, cultures...',
        hintClass: 'investigation',
        chips: ['Order CBC', 'Order LFT', 'Order RFT', 'Order X-ray chest', 'Order USG abdomen', 'Order ECG'],
        placeholder: 'Order an investigation...'
    },
    diagnosis: {
        label: '🏥 Phase 4: Final Diagnosis & Grand Rounds',
        hint: 'Give your final diagnosis and face the Panel of Senior Consultants!',
        hintClass: 'diagnosis',
        chips: ['My final diagnosis is...', 'Differential diagnoses are...', 'Management plan?', 'Complications?', 'Prevention?'],
        placeholder: 'State your final diagnosis...'
    },
    management: {
        label: '💊 Phase 5: Treatment & Management',
        hint: 'Prescribe treatment, write management plan, discuss follow-up and prevention...',
        hintClass: 'management',
        chips: ['Immediate management?', 'Drug of choice?', 'Dosage and duration?', 'Complications to watch?', 'Follow-up plan?', 'Prevention strategies?', 'Patient counselling?', 'Discharge criteria?'],
        placeholder: 'Ask about treatment, drugs, management plan...'
    },
    emergency: {
        label: '🚨 Emergency Mode: Live Patient Simulation',
        hint: 'Give immediate treatment — patient vitals will respond to your interventions in real time!',
        hintClass: 'emergency',
        chips: ['Give IV access', 'Start IV fluids', 'Give oxygen', 'Check airway', 'Give adrenaline', 'Start CPR', 'Check blood sugar', 'Give IV antibiotics', 'Call for help', 'Intubate'],
        placeholder: 'Give your emergency intervention now...'
    }
};

// ── DOM ──
const chatContainer = document.getElementById('chatContainer');
const chatInput     = document.getElementById('chatInput');
const sendBtn       = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const phaseLabel    = document.getElementById('phaseLabel');
const phaseHint     = document.getElementById('phaseHint');
const quickChips    = document.getElementById('quickChips');
const nextPhaseBtn  = document.getElementById('nextPhaseBtn');
const diseaseInput  = document.getElementById('diseaseInput');
const startCaseBtn  = document.getElementById('startCaseBtn');

// ── INIT ──
window.onload = () => {
    updatePhaseUI();
    chatInput.focus();
};

// ── PHASE MANAGEMENT ──
function switchPhase(phase) {
    currentPhase = phase;
    updatePhaseUI();
}



function updatePhaseUI() {
    const cfg = phaseConfig[currentPhase];

    // Update Top Header Title
    document.getElementById('phaseLabel').textContent = cfg.label;
    
    // Update input placeholder
    chatInput.placeholder = cfg.placeholder;

    // Update active state on side tabs
    document.querySelectorAll('.side-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.phase === currentPhase) {
            btn.classList.add('active');
        }
    });

    // Update Quick Chips at the bottom
    quickChips.innerHTML = '';
    cfg.chips.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = text;
        btn.onclick = () => useChip(btn);
        quickChips.appendChild(btn);
    });
}

function useChip(btn) {
    chatInput.value = btn.textContent;
    chatInput.focus();
}

// ── NEW CASE ──
startCaseBtn.addEventListener('click', () => {
    const val = diseaseInput.value.trim();
    if (!val) return;
    customDisease = val;
    chatHistory = [];
    completedPhases = [];
    currentPhase = 'history';

    // Clear chat except typing indicator
    const msgs = chatContainer.querySelectorAll('.message-wrapper');
    msgs.forEach(m => m.remove());

    updatePhaseUI();
    addMessageToUI('system', `🆕 New case started: <strong>${customDisease}</strong>. Begin history taking!`);
    diseaseInput.value = '';
    chatInput.focus();
});

// ── MESSAGES ──
function addMessageToUI(sender, html) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', sender);

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);

    if (sender === 'ai') {
        const avatar = document.createElement('div');
        avatar.classList.add('ai-avatar');
        avatar.innerHTML = '<i class="fas fa-user-md"></i>';

        const content = document.createElement('div');
        content.classList.add('ai-content');
        content.innerHTML = formatText(html);

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);
    } else if (sender === 'system') {
        msgDiv.innerHTML = html;
    } else {
        msgDiv.textContent = html;
    }

    wrapper.appendChild(msgDiv);
    chatContainer.insertBefore(wrapper, typingIndicator);
    scrollToBottom();
}

function formatText(text) {
    let h = text.replace(/\n/g, '<br>');
    h = h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.*?)\*/g, '<em>$1</em>');
    h = h.replace(/⚠️/g, '<span style="color:#f59e0b">⚠️</span>');
    h = h.replace(/✅/g, '<span style="color:#10b981">✅</span>');
    h = h.replace(/❌/g, '<span style="color:#ef4444">❌</span>');
    return h;
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// ── API CALL ──
async function fetchAIResponse() {
    try {
        console.log("Sending to Worker:", JSON.stringify({ messages: chatHistory, phase: currentPhase, customDisease: customDisease }));

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: chatHistory,
                phase: currentPhase,
                customDisease: customDisease
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Worker Error:', response.status, err);
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        let aiText = "I'm sorry, I couldn't process that. Please try again.";

        if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
            aiText = data.candidates[0].content.parts[0].text;
        }

        chatHistory.push({ role: 'model', parts: [{ text: aiText }] });
        addMessageToUI('ai', aiText);

    } catch (err) {
        console.error('FETCH FAILED:', err);
        addMessageToUI('ai', `System Error: ${err.message}. Check Console for details.`);
    } finally {
        hideTypingIndicator();
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// ── SEND ──
function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessageToUI('user', text);
    chatHistory.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    showTypingIndicator();
    fetchAIResponse();
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
});
