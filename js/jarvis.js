// jarvis.js - Pure Voice Conversational MBBS AI (Memory Enabled)
(function () {
    // ⚠️ REPLACE THIS with the exact URL Cloudflare gave you for your worker
    const WORKER_URL = "https://jarvis-brain.namanjain5359v.workers.dev/";

    const micBtn = document.getElementById('jarvis-mic-btn');
    const micIcon = document.getElementById('jarvis-mic-icon');
    const listeningRing = document.getElementById('jarvis-listening-ring');

    // Secret Background Memory (Yaad rakhegi pichli 6 baatein)
    let chatHistory = [];

    // 1. Setup Speech Synthesis (Natural Female Voice)
    const synth = window.speechSynthesis;

    function speak(text) {
        if (synth.speaking) {
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Settings to make it sound less robotic
        utterance.lang = 'hi-IN';
        utterance.rate = 0.95;    // Slower = more natural
        utterance.pitch = 1.1;    // Higher pitch = female tone

        const voices = synth.getVoices();

        // 1st Priority: High-quality Female Indian voices
        const femaleIndianVoice = voices.find(v =>
            (v.lang === 'hi-IN' || v.lang === 'en-IN') &&
            (v.name.includes('Female') || v.name.includes('Google हिन्दी') || v.name.includes('Swara') || v.name.includes('Aditi'))
        ) || voices.find(v => v.lang === 'hi-IN'); // Fallback

        if (femaleIndianVoice) {
            utterance.voice = femaleIndianVoice;
        }

        utterance.onend = () => stopListeningState();
        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            stopListeningState();
        };

        synth.speak(utterance);
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => synth.getVoices();
    }

    // 2. Process Voice & Talk to Llama (The Brain with Memory)
    async function processVoiceCommand(userText) {
        // Save what you said to memory
        chatHistory.push({ role: "user", content: userText });
        if (chatHistory.length > 6) chatHistory = chatHistory.slice(-6); // Keep last 6 messages

        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatHistory: chatHistory }) // Sending memory to Worker
            });

            if (!response.ok) throw new Error("Worker Error");

            const data = await response.json();
            const aiData = JSON.parse(data.choices[0].message.content);
            console.log("Jarvis AI Response:", aiData);

            // Save her reply to memory so she remembers context
            chatHistory.push({ role: "assistant", content: JSON.stringify(aiData) });

            // 1. Speak the reply
            speak(aiData.spoken_reply);

            // 2. Smart Navigation & Action (Only if she decides to)
            if (aiData.action && aiData.action !== "none") {
                executeJarvisCommand(aiData.action);

                if (aiData.search_query) {
                    setTimeout(() => {
                        let query = aiData.search_query.toLowerCase().trim();
                        query = query.replace(/^(open|show|play|start|dikha|dikhao)\s+/i, '').trim();

                        let isSubjectFound = false;
                        if (typeof mbbsData !== "undefined") {
                            for (let key in mbbsData) {
                                if (key.replace(/_/g, ' ') === query || key === query) {
                                    if (typeof setSubject === "function") {
                                        setSubject(key);
                                        isSubjectFound = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!isSubjectFound) {
                            const searchInput = document.getElementById('globalSearch');
                            const searchBar = document.getElementById('searchBar');
                            if (searchInput) {
                                if (searchBar) searchBar.classList.add('active');
                                searchInput.value = query;
                                if (typeof window.handleSearch === "function") {
                                    window.handleSearch();
                                }
                            }
                        }
                    }, 500);
                }
            }

        } catch (error) {
            console.error("Cloudflare Worker Error:", error);
            speak("Bhai thoda network issue lag raha hai, ek baar check kar le.");
            stopListeningState();
        }
    }

    // 3. Setup Speech Recognition (Ears)
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
            micIcon.style.color = "#a78bfa";

            await processVoiceCommand(transcript);
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

    // UI State Management 
    function startListeningState() {
        if (!micIcon || !listeningRing) return;
        micIcon.className = "fas fa-microphone";
        micIcon.style.color = "#22d3ee";
        listeningRing.style.display = "block";
    }

    function stopListeningState() {
        if (!micIcon || !listeningRing) return;
        micIcon.className = "fas fa-microphone";
        micIcon.style.color = "var(--text-main)";
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

    // 4. Hooking into your existing dashboard.js architecture
    function executeJarvisCommand(action) {
        if (action === "atrium") {
            window.location.href = "atrium.html";
        } else if (['videos', 'notes', 'quizzes', 'qbank'].includes(action)) {
            if (typeof window.filterCategory === "function") {
                window.filterCategory(action);
            } else if (typeof window.navigate === "function") {
                window.navigate(action);
            }
        }
    }

    // 5. Dynamic Time-Based Greeting on initial load
    window.addEventListener('load', () => {
        if (!sessionStorage.getItem('jarvis_greeted')) {
            setTimeout(() => {
                const hour = new Date().getHours();
                let timeGreeting = "";

                // Morning (Midnight to 12 PM)
                if (hour < 12) {
                    const morningGreetings = [
                        "Good morning yaar! Bata aaj kaise help karun teri?",
                        "Good morning! Uth gaya? Bol, aaj kis subject mein madad karun?"
                    ];
                    timeGreeting = morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
                }
                // Afternoon (12 PM to 5 PM)
                else if (hour < 17) {
                    const afternoonGreetings = [
                        "Good afternoon boss! Bata, aaj kaise help karun teri?",

                    ];
                    timeGreeting = afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
                }
                // Evening/Night (5 PM onwards)
                else {
                    const eveningGreetings = [
                        "Good evening! Bata aaj kaise help karun teri?",
                        "Good evening yaar! Din kaisa gaya? Bata kya madad karun abhi?"
                    ];
                    timeGreeting = eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
                }

                // Saving the greeting to memory so she remembers how she started the chat
                const aiDataDummy = { spoken_reply: timeGreeting, action: "none", search_query: null };
                chatHistory.push({ role: "assistant", content: JSON.stringify(aiDataDummy) });

                speak(timeGreeting);
                sessionStorage.setItem('jarvis_greeted', 'true');
            }, 1200);
        }
    });
})();