// jarvis.js - The Secure Sarcastic MBBS AI
(function() {
    // ⚠️ REPLACE THIS with the exact URL Cloudflare gave you for your worker
    const WORKER_URL = "https://jarvis-brain.namanjain5359v.workers.dev/"; 
    
    const micBtn = document.getElementById('jarvis-mic-btn');
    const micIcon = document.getElementById('jarvis-mic-icon');
    const listeningRing = document.getElementById('jarvis-listening-ring');

    // 1. Setup Speech Synthesis (Voice)
    const synth = window.speechSynthesis;
    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN'; // Force Indian Hindi Accent
        
        // Try to find a male Indian voice if available
        const voices = synth.getVoices();
        const hindiVoice = voices.find(v => v.lang === 'hi-IN' && v.name.toLowerCase().includes('male'));
        if (hindiVoice) utterance.voice = hindiVoice;

        utterance.onend = () => {
            stopListeningState();
        };
        synth.speak(utterance);
    }

    // 2. Setup Speech Recognition (Ears)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN'; // Listen for Hindi/Hinglish
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            startListeningState();
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("User said:", transcript);
            
            // Show thinking state on the UI
            micIcon.className = "fas fa-spinner fa-spin";
            micIcon.style.color = "#a78bfa"; // Purple thinking color
            
            await askGroqViaCloudflare(transcript);
        };

        recognition.onerror = (event) => {
            console.error("Jarvis Mic Error:", event.error);
            if (event.error === 'not-allowed') {
                micIcon.className = "fas fa-microphone-slash";
                micIcon.style.color = "#ff4b4b";
                alert("Bhai, mic ki permission toh de de. Settings mein jaake allow kar.");
            }
            stopListeningState();
        };
    } else {
        console.warn("Speech recognition not supported in this browser.");
    }

    // UI State Management (Quantum UI Integration)
    function startListeningState() {
        if (!micIcon || !listeningRing) return;
        micIcon.className = "fas fa-microphone";
        micIcon.style.color = "#22d3ee"; // Active Cyan
        listeningRing.style.display = "block";
    }

    function stopListeningState() {
        if (!micIcon || !listeningRing) return;
        micIcon.className = "fas fa-microphone";
        micIcon.style.color = "var(--text-main)"; // Neutral
        listeningRing.style.display = "none";
    }

    // Handle Button Click to start listening
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (recognition) {
                try {
                    recognition.start();
                } catch (e) {
                    recognition.stop();
                }
            }
        });
    }

    // 3. The Brain (Secure Cloudflare Worker API Call)
    async function askGroqViaCloudflare(userText) {
        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userText: userText })
            });
            
            if (!response.ok) {
                throw new Error("Worker responded with status: " + response.status);
            }

            const data = await response.json();
            
            // Extract the JSON that Groq generated (passed through the worker)
            const aiData = JSON.parse(data.choices[0].message.content);
            console.log("Jarvis AI Response:", aiData);

            // 1. Execute Navigation if required
            if (aiData.action && aiData.action !== "none") {
                executeJarvisCommand(aiData.action);
            }

            // 2. Speak the response out loud
            speak(aiData.spoken_reply);

        } catch (error) {
            console.error("Cloudflare Worker Error:", error);
            speak("Bhai tera internet ro raha hai ya server down hai. Refresh maar le.");
            stopListeningState();
        }
    }

    // 4. Hooking into your existing dashboard.js architecture
    function executeJarvisCommand(action) {
        if (action === "atrium") {
            window.location.href = "atrium.html";
        } else if (['videos', 'notes', 'quizzes', 'qbank'].includes(action)) {
            // This safely triggers your existing window.filterCategory function
            if (typeof window.filterCategory === "function") {
                window.filterCategory(action);
            } else if (typeof window.navigate === "function") {
                window.navigate(action);
            }
        }
    }

    // 5. Hardcoded zero-cost greeting on initial load (Only fires once per session)
    window.onload = () => {
        // Ensure we don't annoy the user by greeting them every single time they click home
        if (!sessionStorage.getItem('jarvis_greeted')) {
            setTimeout(() => {
                const greetings = [
                    "Khol diya app? Padhai kab shuru karni hai bhai?",
                    "Welcome back boss. Aaj kaun sa subject fail karna hai?",
                    "Aa gaya wapas? Chalo videos dekho chup chap."
                ];
                const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
                speak(randomGreeting);
                sessionStorage.setItem('jarvis_greeted', 'true');
            }, 1200); // Wait 1.2 seconds after dashboard UI loads
        }
    };
})();