/**
 * ATA - Apple iOS Inspired Secret Fortune Web Application
 * Core Application Logic & Secret Mechanic
 */

(function () {
    "use strict";

    // =========================================================================
    // CONSTANTS & CONFIGURATION
    // =========================================================================
    // The secret text must never be revealed in the UI
    const SECRET_TEXT = "ATA LÜTFEN BANA BUNU CEVAPLA";

    // Normal playful / fortune responses
    const NORMAL_RESPONSES = [
        "Bence evet.",
        "Bunun cevabı yakında ortaya çıkacak.",
        "ATA ANS düşünüyor...",
        "Kesin bir cevap vermek zor.",
        "Bunu tekrar düşünmelisin.",
        "Cevap sandığından daha yakın.",
        "Evet, olabilir.",
        "Hayır.",
        "Bence şansını dene.",
        "İşaretler olumlu yönde.",
        "Şu an bunu açıklamak için çok erken.",
        "Kalbinin sesini dinle.",
        "Zamanı geldiğinde her şeyi anlayacaksın.",
        "Büyük ihtimalle evet.",
        "Buna şüpheyle yaklaşmalısın.",
        "İç sesin sana doğruyu fısıldıyor.",
        "Gelecek henüz yazılmadı, karar senin.",
        "Kesinlikle öyle.",
        "Pek olası görünmüyor.",
        "Cevap senin içinde saklı.",
        "Bunu başka bir zaman tekrar sor.",
        "Her şey senin elinde.",
        "Gözlerini aç ve işaretleri takip et.",
        "Kader bu konuda senin yanında.",
        "Bekle ve gör, sabır en iyi cevaptır.",
        "Şüphelerin yersiz değil.",
        "Gülümse, çünkü cevap seni sevindirecek."
    ];

    // LocalStorage Keys
    const STORAGE_SETTINGS_KEY = "ata_settings_v3";
    const STORAGE_HISTORY_KEY = "ata_chat_history_v2";
    const STORAGE_KURT_LOCK_KEY = "ata_kurt_kapani_lock_v1";

    // Default Settings (İlk açılışta Tam Ekran ve Aydınlık Mod)
    const defaultSettings = {
        theme: "light", // 'light' | 'dark' | 'kurt'
        sound: true,
        animations: true,
        desktopFrame: false // false = Tam Ekran modu
    };

    let settings = Object.assign({}, defaultSettings);

    // =========================================================================
    // SECRET MECHANISM STATE (PETER ANSWERS MECHANIC)
    // =========================================================================
    let isSecretMode = false;
    let isSecretLocked = false; // When true, the full petition has been auto-completed
    let secretAnswer = ""; // Secret answer hidden behind the mask
    let lastSpaceTimestamp = 0;
    let lastKeyWasSpace = false;
    let lastHandledSpaceTime = 0;
    const PETITION_TARGET = "ATA LÜTFEN BANA BUNU CEVAPLA";

    // Kurt Kapanı Security Lockout State
    let failedAttemptsCount = 0;
    let countdownInterval = null;
    let countdownStartTimeout = null;
    let isKurtKapaniActive = false;
    let isCountingDown = false;
    let isSending = false;
    let unlockTapCount = 0;
    let lastUnlockTapTime = 0;

    // Suspicious responses for unauthorized manual petition entry
    const SUSPICIOUS_RESPONSES = [
        "Kurt Seni Tanımadı, Bu Koku Hiç Tanıdık Değil.",
        "Kurt Senden Şüphelendi, Kurt Seni Tanımıyor Kurt Sizi ATA ANS'e Bildirdi.",
        "Kan Ve Kemik Kokusu, Sendekiler Garip Hemen Uzaklaş Yoksa Sürüyü Toplarım!"
    ];
    let suspiciousIndex = 0;

    // Responses when petition is missing or written incorrectly without the secret trick
    const INVALID_PETITION_RESPONSES = [
        "Şu Rica Metnini Doğru Yazmaya Başladığında Bende Sana Doğru Cevaplar Vereceğim.",
        "Okuma Yazma Öğrenemeden Benden Müneccimlik Mi Bekliyorsun? Git Ve Şu Rica Metnini Doğru Yaz.",
        "Yoruldum Artık Doğru Yaz Şu Metni!!!"
    ];
    let invalidPetitionIndex = 0;

    /**
     * Check if someone manually typed "ATA lütfen bana bunu cevapla" or "ATA lütfen bunu cevapla"
     * Case-insensitive, handles Turkish characters (I/ı, İ/i, Ü/ü, etc.)
     */
    function isManualPetitionAttempt(text) {
        if (!text) return false;
        const norm = text
            .toLocaleLowerCase("tr-TR")
            .replace(/['".,!?;:\-_*#+~`]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return /ata\s+l[üu]tfen\s+(bana\s+)?bunu\s+cevapla/i.test(norm) ||
               /ata\s+l[üu]tfen\s+cevapla/i.test(norm) ||
               norm === "ata lütfen bana bunu cevapla" ||
               norm === "ata lütfen bunu cevapla" ||
               norm === "ata lutfen bana bunu cevapla" ||
               norm === "ata lutfen bunu cevapla";
    }

    function getMaskedText(length) {
        if (length <= 0) return "";
        let result = "";
        while (result.length < length) {
            result += PETITION_TARGET + " ";
        }
        return result.substring(0, length);
    }

    // =========================================================================
    // DOM ELEMENTS
    // =========================================================================
    const questionInput = document.getElementById("questionInput");
    const petitionInput = document.getElementById("petitionInput");
    const sendBtn = document.getElementById("sendBtn");
    const chatViewport = document.getElementById("chatViewport");
    const messagesStream = document.getElementById("messagesStream");
    const typingBubbleWrap = document.getElementById("typingBubbleWrap");
    const welcomeCard = document.getElementById("welcomeCard");
    const statusClock = document.getElementById("statusClock");
    const metaThemeColor = document.getElementById("metaThemeColor");
    const deviceWrapper = document.getElementById("deviceWrapper");
    const dockFrameToggle = document.getElementById("dockFrameToggle");
    const dockModeText = document.getElementById("dockModeText");

    // Modals & Sheets
    const settingsBtn = document.getElementById("settingsBtn");
    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const themeSegmented = document.getElementById("themeSegmented");
    const screenModeSegmented = document.getElementById("screenModeSegmented");
    const soundToggle = document.getElementById("soundToggle");
    const animToggle = document.getElementById("animToggle");
    const clearChatBtn = document.getElementById("clearChatBtn");

    const infoBtn = document.getElementById("infoBtn");
    const closeInfoBtn = document.getElementById("closeInfoBtn");
    const infoModal = document.getElementById("infoModal");

    const iosAlert = document.getElementById("iosAlert");
    const alertTitle = document.getElementById("alertTitle");
    const alertMessage = document.getElementById("alertMessage");
    const alertOkBtn = document.getElementById("alertOkBtn");

    // Kurt Kapanı & Countdown DOM Elements
    const countdownOverlay = document.getElementById("countdownOverlay");
    const countdownNumber = document.getElementById("countdownNumber");
    const countdownProgressBar = document.getElementById("countdownProgressBar");
    const kurtKapaniOverlay = document.getElementById("kurtKapaniOverlay");
    const secretUnlockTrigger = document.getElementById("secretUnlockTrigger");
    const guvenlikTrigger = document.getElementById("guvenlikTrigger");
    const slideUnlockWrapper = document.getElementById("slideUnlockWrapper");
    const slideUnlockTrack = document.getElementById("slideUnlockTrack");
    const slideUnlockProgress = document.getElementById("slideUnlockProgress");
    const slideUnlockThumb = document.getElementById("slideUnlockThumb");
    const slideUnlockText = document.getElementById("slideUnlockText");
    const unlockedScreen = document.getElementById("unlockedScreen");
    const restartBtn = document.getElementById("restartBtn");

    // Dragon Video & Canvas Elements
    const dragonVideo = document.getElementById("dragonVideo");
    const dragonCanvas = document.getElementById("dragonCanvas");
    const kurtDragonVideo = document.getElementById("kurtDragonVideo");
    const kurtDragonCanvas = document.getElementById("kurtDragonCanvas");

    // =========================================================================
    // WEB AUDIO API - APPLE STYLE SOUND SYNTHESIS
    // =========================================================================
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    }

    /**
     * Synthesize Apple iMessage 'Swoosh' Sent Sound
     */
    function playSentSound() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            // Ascending pitch swoop
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(960, now + 0.12);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {
            // Audio context not allowed or failed
        }
    }

    /**
     * Synthesize Apple iMessage 'Note' Received Sound
     */
    function playReceivedSound() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            // Dual tone marimba chime (E6 and G#6)
            const freqs = [1318.5, 1661.2];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);

                gain.gain.setValueAtTime(0, now + idx * 0.07);
                gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.36);
            });
        } catch (e) {
            // Silently ignore audio errors
        }
    }

    /**
     * Synthesize Apple iOS Countdown Tick Sound
     */
    function playCountdownTick() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(1050, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.035);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.055);
        } catch (e) { }
    }

    /**
     * Synthesize Deep Bass Warning Accord for Lockdown
     */
    function playLockdownSound() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const chords = [130.81, 155.56, 196.0]; // C3 minor chord
            chords.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.65);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.7);
            });
        } catch (e) { }
    }

    /**
     * Synthesize Apple Pay / FaceID Style Uplifting Unlock Chime
     */
    function playUnlockChime() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const freqs = [1046.5, 1567.98]; // C6 -> G6
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);

                gain.gain.setValueAtTime(0, now + idx * 0.1);
                gain.gain.linearRampToValueAtTime(0.24, now + idx * 0.1 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.52);
            });
        } catch (e) { }
    }

    // =========================================================================
    // THEME & SETTINGS CONTROLLER
    // =========================================================================
    function loadSavedSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
            if (saved) {
                settings = Object.assign({}, defaultSettings, JSON.parse(saved));
            }
        } catch (e) {
            settings = Object.assign({}, defaultSettings);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) { }
    }

    function applyTheme() {
        let activeMode = settings.theme;
        // Migrate legacy "system" value to "kurt"
        if (activeMode === "system") {
            activeMode = "kurt";
            settings.theme = "kurt";
            saveSettings();
        }

        document.documentElement.setAttribute("data-theme", activeMode);

        if (metaThemeColor) {
            let color = "#ffffff";
            if (activeMode === "dark") color = "#000000";
            if (activeMode === "kurt") color = "#130406";
            metaThemeColor.setAttribute("content", color);
        }

        // Update segmented control buttons
        if (themeSegmented) {
            const buttons = themeSegmented.querySelectorAll(".seg-btn");
            buttons.forEach(btn => {
                btn.classList.toggle("active", btn.getAttribute("data-value") === settings.theme);
            });
        }
    }

    function applySettings() {
        applyTheme();

        if (soundToggle) soundToggle.checked = settings.sound;
        if (animToggle) animToggle.checked = settings.animations;

        // Toggle frame mode (iPhone frame vs Fullscreen)
        if (deviceWrapper) {
            deviceWrapper.classList.toggle("full-mode", !settings.desktopFrame);
        }
        if (dockFrameToggle && dockModeText) {
            dockModeText.textContent = settings.desktopFrame ? "iPhone Çerçevesi" : "Tam Ekran";
            dockFrameToggle.classList.toggle("active", settings.desktopFrame);
        }
        if (screenModeSegmented) {
            const buttons = screenModeSegmented.querySelectorAll(".seg-btn");
            buttons.forEach(btn => {
                const mode = btn.getAttribute("data-mode");
                btn.classList.toggle("active", (mode === "frame" && settings.desktopFrame) || (mode === "full" && !settings.desktopFrame));
            });
        }

        // Handle animation preference
        document.body.classList.toggle("reduced-motion", !settings.animations);
    }

    // System theme change listener
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (settings.theme === "system") {
                applyTheme();
            }
        });
    }

    // =========================================================================
    // STATUS CLOCK & BATTERY INDICATOR
    // =========================================================================
    function updateClock() {
        if (!statusClock) return;
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const formatted = (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
        statusClock.textContent = formatted;
    }
    setInterval(updateClock, 1000);
    updateClock();

    function initBattery() {
        const levelBar = document.getElementById("batteryLevelBar");

        function updateBatteryDisplay(level) {
            const pct = Math.round(level * 100);
            if (levelBar) {
                levelBar.style.width = Math.max(12, Math.min(100, pct)) + "%";
            }
        }

        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                updateBatteryDisplay(battery.level, battery.charging);
                battery.addEventListener("levelchange", () => updateBatteryDisplay(battery.level, battery.charging));
                battery.addEventListener("chargingchange", () => updateBatteryDisplay(battery.level, battery.charging));
            }).catch(() => {
                updateBatteryDisplay(0.98, false);
            });
        } else {
            updateBatteryDisplay(0.98, false);
        }
    }
    initBattery();

    // =========================================================================
    // SECRET MECHANIC LOGIC (PETER ANSWERS MECHANIC)
    // =========================================================================

    /**
     * Reset secret answer state
     */
    function resetSecretFlags() {
        isSecretMode = false;
        isSecretLocked = false;
        secretAnswer = "";
        lastSpaceTimestamp = 0;
        lastKeyWasSpace = false;
        lastHandledSpaceTime = 0;
    }

    /**
     * Update Send Button Disabled state
     */
    function updateSendButton() {
        if (isSending || isCountingDown || isKurtKapaniActive) {
            sendBtn.disabled = true;
            return;
        }
        const hasText = questionInput.value.trim().length > 0;
        sendBtn.disabled = !hasText;
    }

    // -------------------------------------------------------------------------
    // 1. SORU (QUESTION) INPUT HANDLERS
    // -------------------------------------------------------------------------
    questionInput.addEventListener("keydown", function (e) {
        // Enter key moves focus to Rica (petition) input or sends if petition is filled
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (petitionInput.value.trim().length > 0) {
                handleSend();
            } else {
                petitionInput.focus();
            }
        }
    });

    questionInput.addEventListener("input", function () {
        updateSendButton();
    });

    // -------------------------------------------------------------------------
    // 2. RICA (PETITION) INPUT HANDLERS - SECRET MASKING & DOUBLE-SPACE COMPLETION
    // -------------------------------------------------------------------------

    /**
     * Start secret mode when first space is pressed on empty petition
     */
    function activateSecretMode(now) {
        isSecretMode = true;
        isSecretLocked = false;
        secretAnswer = "";
        lastKeyWasSpace = false; // Never count the activation space as the 1st space of a double-space!
        lastSpaceTimestamp = 0;
        lastHandledSpaceTime = now;
        petitionInput.value = "";
    }

    /**
     * Trigger auto-completion to full petition text (strictly double-space action)
     */
    function triggerSecretCompletion(now) {
        isSecretLocked = true;
        if (secretAnswer.endsWith(" ")) {
            secretAnswer = secretAnswer.slice(0, -1);
        }
        petitionInput.value = PETITION_TARGET;
        lastKeyWasSpace = false;
        lastSpaceTimestamp = 0;
        lastHandledSpaceTime = now;
    }

    /**
     * Handle Space input in secret mode
     */
    function handleSecretSpace(now) {
        // Prevent duplicate processing if both keydown and beforeinput fire for the same keystroke (especially on mobile)
        if (now - lastHandledSpaceTime < 80) {
            return;
        }

        const elapsedSinceLastSpace = now - lastSpaceTimestamp;
        // Double space is ONLY triggered when:
        // 1. Secret answer has content
        // 2. The immediate prior input was a space (lastKeyWasSpace is true)
        // 3. The two spaces were pressed together in rapid succession (80ms - 700ms)
        const isDoubleSpace = lastKeyWasSpace && (elapsedSinceLastSpace >= 80 && elapsedSinceLastSpace <= 700);

        if (isDoubleSpace && secretAnswer.length > 0) {
            triggerSecretCompletion(now);
        } else {
            // Single space inside the secret answer (e.g. "Ahmet Yılmaz")
            secretAnswer += " ";
            petitionInput.value = getMaskedText(secretAnswer.length);
            lastKeyWasSpace = true;
            lastSpaceTimestamp = now;
            lastHandledSpaceTime = now;
        }
    }

    /**
     * Handle Backspace in secret mode
     */
    function handleSecretBackspace() {
        if (isSecretLocked) {
            // Unlock on backspace so user can resume editing their secret answer
            isSecretLocked = false;
            lastKeyWasSpace = false;
            lastSpaceTimestamp = 0;
            petitionInput.value = getMaskedText(secretAnswer.length);
            return;
        }

        secretAnswer = secretAnswer.slice(0, -1);
        lastKeyWasSpace = false;
        lastSpaceTimestamp = 0;

        if (secretAnswer.length === 0) {
            isSecretMode = false;
            petitionInput.value = "";
        } else {
            petitionInput.value = getMaskedText(secretAnswer.length);
        }
    }

    /**
     * Handle regular text insertion in secret mode
     */
    function handleSecretText(text) {
        if (isSecretLocked) return;
        if (!text) return;

        secretAnswer += text;
        petitionInput.value = getMaskedText(secretAnswer.length);
        // Any non-space character immediately invalidates previous space tracking
        lastKeyWasSpace = false;
        lastSpaceTimestamp = 0;
    }

    /**
     * Physical Keyboard Handler on Rica Input
     */
    petitionInput.addEventListener("keydown", function (e) {
        // Enter key sends the message
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
            return;
        }

        const now = Date.now();

        // 1. If Rica field is empty and user presses Space:
        // Enter secret mode, do NOT display the space!
        if ((e.key === " " || e.key === "Spacebar") && petitionInput.value.length === 0 && !isSecretMode) {
            e.preventDefault();
            activateSecretMode(now);
            return;
        }

        // 2. If in Secret Mode:
        if (isSecretMode) {
            // If already locked, ignore all character typing except Backspace
            if (isSecretLocked) {
                if (e.key === "Backspace") {
                    e.preventDefault();
                    handleSecretBackspace();
                    return;
                }
                if (e.key.length === 1) {
                    e.preventDefault();
                }
                return;
            }

            // Handle Backspace
            if (e.key === "Backspace") {
                e.preventDefault();
                handleSecretBackspace();
                return;
            }

            // Handle Space Key
            if (e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                handleSecretSpace(now);
                return;
            }

            // Handle any other printable character
            if (e.key.length === 1) {
                e.preventDefault();
                handleSecretText(e.key);
                return;
            }
        }
    });

    /**
     * Mobile Virtual Keyboard (beforeinput) Handler on Rica Input
     */
    petitionInput.addEventListener("beforeinput", function (e) {
        const now = Date.now();

        // Enter / Line Break on virtual keyboard sends
        if (e.inputType === "insertLineBreak") {
            e.preventDefault();
            handleSend();
            return;
        }

        // Space pressed as first character on mobile keyboard -> activate secret mode
        if (!isSecretMode && petitionInput.value.length === 0 && e.data === " ") {
            e.preventDefault();
            activateSecretMode(now);
            return;
        }

        // While in secret mode on mobile
        if (isSecretMode) {
            // Backspace on virtual keyboard
            if (e.inputType === "deleteContentBackward") {
                e.preventDefault();
                handleSecretBackspace();
                return;
            }

            // If already locked, block further insertions
            if (isSecretLocked) {
                e.preventDefault();
                return;
            }

            // Mobile native double-space shortcut often inputs ". " or "  "
            if ((e.data === ". " || e.data === "  ") && secretAnswer.length > 0) {
                e.preventDefault();
                triggerSecretCompletion(now);
                return;
            }

            // Mobile space tap
            if (e.data === " ") {
                e.preventDefault();
                handleSecretSpace(now);
                return;
            }

            // Mobile character insertion
            if ((e.inputType === "insertText" || e.inputType === "insertCompositionText") && e.data) {
                e.preventDefault();
                handleSecretText(e.data);
                return;
            }
        }
    });

    /**
     * Fallback and Visual Integrity on 'input' event for Rica
     */
    petitionInput.addEventListener("input", function () {
        // If field was cleared completely
        if (petitionInput.value.length === 0) {
            if (isSecretMode) {
                resetSecretFlags();
            }
            return;
        }

        // If user typed a space at the start that bypassed keydown/beforeinput
        if (!isSecretMode && petitionInput.value.startsWith(" ")) {
            activateSecretMode(Date.now());
            return;
        }

        // Strictly maintain visual integrity: full petition if locked, masked petition if unlocked
        if (isSecretMode) {
            petitionInput.value = isSecretLocked ? PETITION_TARGET : getMaskedText(secretAnswer.length);
        }
    });

    // =========================================================================
    // CHAT & MESSAGE SYSTEM (LOCAL PERSISTENCE)
    // =========================================================================
    let chatHistory = [];

    /**
     * Format current time for message bubble
     */
    function getMessageTimeString() {
        const d = new Date();
        let h = d.getHours();
        let m = d.getMinutes();
        return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    }

    /**
     * Save chat history to localStorage
     */
    function saveChatHistory() {
        try {
            localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(chatHistory));
        } catch (e) { }
    }

    /**
     * Load chat history from localStorage
     */
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    chatHistory = parsed;
                    if (welcomeCard) {
                        welcomeCard.style.display = "none";
                    }
                    if (messagesStream) {
                        messagesStream.innerHTML = "";
                    }
                    chatHistory.forEach(msg => {
                        renderMessageBubble(msg.text, msg.isUser, msg.timeStr);
                    });
                    scrollToBottom();
                }
            }
        } catch (e) {
            chatHistory = [];
        }
    }

    /**
     * Render message bubble DOM element
     */
    function renderMessageBubble(text, isUser = false, customTimeStr = null) {
        if (welcomeCard) {
            welcomeCard.style.display = "none";
        }

        const row = document.createElement("div");
        row.className = "message-row " + (isUser ? "user-row" : "ata-row");

        const bubble = document.createElement("div");
        bubble.className = "chat-bubble " + (isUser ? "user-bubble" : "ata-bubble");
        bubble.textContent = text;

        const meta = document.createElement("div");
        meta.className = "message-meta";
        const timeStr = customTimeStr || getMessageTimeString();
        meta.textContent = isUser ? `${timeStr} • İletildi` : timeStr;

        row.appendChild(bubble);
        row.appendChild(meta);
        if (messagesStream) {
            messagesStream.appendChild(row);
        }
    }

    /**
     * Append a message bubble to the chat and persist to localStorage
     */
    function appendMessage(text, isUser = false) {
        const timeStr = getMessageTimeString();
        chatHistory.push({ text, isUser, timeStr });
        saveChatHistory();
        renderMessageBubble(text, isUser, timeStr);
        scrollToBottom();
    }

    let scrollRaf = null;
    function scrollToBottom(smooth = true) {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = requestAnimationFrame(() => {
            if (!chatViewport) return;
            chatViewport.scrollTo({
                top: chatViewport.scrollHeight,
                behavior: smooth && settings.animations ? "smooth" : "auto"
            });
        });
    }

    /**
     * Show/Hide Typing Indicator Bubble
     */
    function setTyping(isTyping) {
        if (!typingBubbleWrap) return;
        typingBubbleWrap.style.display = isTyping ? "block" : "none";
        if (isTyping) {
            scrollToBottom();
        }
    }

    /**
     * Main Send Handler
     */
    function handleSend() {
        if (isSending || isCountingDown || isKurtKapaniActive) {
            return;
        }

        const questionText = questionInput.value.trim();

        if (!questionText) {
            showAlert("Uyarı", "Lütfen önce bir soru yazın.");
            questionInput.focus();
            return;
        }

        isSending = true;
        updateSendButton();

        // Immediately authorize and unlock video audio on user interaction
        if (dragonVideo) {
            dragonVideo.muted = false;
            dragonVideo.volume = 1.0;
        }
        if (kurtDragonVideo) {
            kurtDragonVideo.muted = false;
            kurtDragonVideo.volume = 1.0;
        }

        // Cache the secret answer and raw petition text before clearing
        const hasSecretAnswer = isSecretMode && secretAnswer.trim().length > 0;
        const finalSecretAnswer = secretAnswer.trim();
        const rawPetitionText = petitionInput.value.trim();

        // Clear both input fields
        questionInput.value = "";
        petitionInput.value = "";
        resetSecretFlags();
        updateSendButton();

        // 1. Show user's question bubble
        appendMessage(questionText, true);
        playSentSound();

        // 2. Show iOS typing indicator
        setTyping(true);

        // Determine ATA's response
        let answerText = "";
        let isSecretSuccess = false;

        if (hasSecretAnswer) {
            // Reveal the secret text that was masked behind the petition!
            answerText = finalSecretAnswer;
            isSecretSuccess = true;
            failedAttemptsCount = 0;
        } else if (isManualPetitionAttempt(rawPetitionText)) {
            // Unauthorized manual petition entry detected!
            failedAttemptsCount++;
            answerText = SUSPICIOUS_RESPONSES[suspiciousIndex];
            suspiciousIndex = (suspiciousIndex + 1) % SUSPICIOUS_RESPONSES.length;
        } else {
            // Petition was not written or written incorrectly (wrong characters, empty, gibberish)
            failedAttemptsCount++;
            answerText = INVALID_PETITION_RESPONSES[invalidPetitionIndex];
            invalidPetitionIndex = (invalidPetitionIndex + 1) % INVALID_PETITION_RESPONSES.length;
        }

        // 3. Display ATA's response after realistic typing delay
        const responseDelay = settings.animations ? 1200 + Math.random() * 600 : 300;

        setTimeout(() => {
            setTyping(false);
            appendMessage(answerText, false);
            playReceivedSound();

            // If 3 consecutive failed attempts reached without the secret trick, initiate Kurt Kapanı sequence!
            if (!isSecretSuccess && failedAttemptsCount >= 3) {
                failedAttemptsCount = 0; // Immediately consume attempts so no subsequent trigger can occur
                isCountingDown = true;
                isSending = false;
                if (questionInput) questionInput.blur();
                if (petitionInput) petitionInput.blur();
                updateSendButton();

                if (countdownStartTimeout) {
                    clearTimeout(countdownStartTimeout);
                }
                countdownStartTimeout = setTimeout(() => {
                    countdownStartTimeout = null;
                    startCountdown();
                }, 850);
            } else {
                isSending = false;
                updateSendButton();
            }
        }, responseDelay);
    }

    sendBtn.addEventListener("click", handleSend);

    // =========================================================================
    // iOS ALERT CONTROLLER (Native Look Dialog)
    // =========================================================================
    function showAlert(title, message) {
        if (alertTitle) alertTitle.textContent = title;
        if (alertMessage) alertMessage.textContent = message;
        if (iosAlert) {
            iosAlert.classList.add("active");
            iosAlert.setAttribute("aria-hidden", "false");
        }
    }

    function closeAlert() {
        if (iosAlert) {
            iosAlert.classList.remove("active");
            iosAlert.setAttribute("aria-hidden", "true");
        }
    }

    if (alertOkBtn) alertOkBtn.addEventListener("click", closeAlert);
    if (iosAlert) {
        iosAlert.addEventListener("click", function (e) {
            if (e.target === iosAlert) closeAlert();
        });
    }

    // =========================================================================
    // SETTINGS MODAL / SHEET CONTROLLER
    // =========================================================================
    function openSettings() {
        if (questionInput) questionInput.blur();
        if (petitionInput) petitionInput.blur();
        if (settingsModal) {
            settingsModal.classList.add("active");
            settingsModal.setAttribute("aria-hidden", "false");
        }
    }

    function closeSettings() {
        if (settingsModal) {
            settingsModal.classList.remove("active");
            settingsModal.setAttribute("aria-hidden", "true");
        }
    }

    if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettings);
    if (settingsModal) {
        settingsModal.addEventListener("click", function (e) {
            if (e.target === settingsModal) closeSettings();
        });
    }

    // Theme Segmented Control
    if (themeSegmented) {
        themeSegmented.addEventListener("click", function (e) {
            const btn = e.target.closest(".seg-btn");
            if (!btn) return;
            const newTheme = btn.getAttribute("data-value");
            settings.theme = newTheme;
            saveSettings();
            applyTheme();
        });
    }

    // Screen Mode Segmented Control (iPhone Çerçevesi vs Tam Ekran)
    if (screenModeSegmented) {
        screenModeSegmented.addEventListener("click", function (e) {
            const btn = e.target.closest(".seg-btn");
            if (!btn) return;
            const mode = btn.getAttribute("data-mode");
            settings.desktopFrame = (mode === "frame");
            saveSettings();
            applySettings();
        });
    }

    // Preferences Toggles
    if (soundToggle) {
        soundToggle.addEventListener("change", function () {
            settings.sound = soundToggle.checked;
            saveSettings();
            if (settings.sound) {
                playReceivedSound();
            }
        });
    }

    if (animToggle) {
        animToggle.addEventListener("change", function () {
            settings.animations = animToggle.checked;
            saveSettings();
            applySettings();
        });
    }

    // Clear Chat Action
    if (clearChatBtn) {
        clearChatBtn.addEventListener("click", function () {
            chatHistory = [];
            try {
                localStorage.removeItem(STORAGE_HISTORY_KEY);
            } catch (e) { }
            if (messagesStream) {
                messagesStream.innerHTML = "";
            }
            if (welcomeCard) {
                welcomeCard.style.display = "flex";
            }
            closeSettings();
        });
    }

    // =========================================================================
    // INFO MODAL / SHEET CONTROLLER
    // =========================================================================
    function openInfo() {
        if (questionInput) questionInput.blur();
        if (petitionInput) petitionInput.blur();
        if (infoModal) {
            infoModal.classList.add("active");
            infoModal.setAttribute("aria-hidden", "false");
        }
    }

    function closeInfo() {
        if (infoModal) {
            infoModal.classList.remove("active");
            infoModal.setAttribute("aria-hidden", "true");
        }
    }

    if (infoBtn) infoBtn.addEventListener("click", openInfo);
    if (closeInfoBtn) closeInfoBtn.addEventListener("click", closeInfo);
    if (infoModal) {
        infoModal.addEventListener("click", function (e) {
            if (e.target === infoModal) closeInfo();
        });
    }

    // Plus Action Button (Quick Info or Greeting)
    const actionPlusBtn = document.getElementById("actionPlusBtn");
    if (actionPlusBtn) {
        actionPlusBtn.addEventListener("click", function () {
            openInfo();
        });
    }

    // =========================================================================
    // DESKTOP DOCK VIEW TOGGLE (iPhone Frame vs Fullscreen)
    // =========================================================================
    if (dockFrameToggle) {
        dockFrameToggle.addEventListener("click", function () {
            settings.desktopFrame = !settings.desktopFrame;
            saveSettings();
            applySettings();
        });
    }

    // Keyboard ESC key to close open sheets
    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeSettings();
            closeInfo();
            closeAlert();
        }
    });

    // =========================================================================
    // INITIALIZATION & PWA STANDALONE DETECTION
    // =========================================================================
    const isStandalone = window.navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches;

    if (isStandalone) {
        document.documentElement.classList.add("pwa-standalone");
        // Mobilde uygulama olarak açıldığında kenarlık olmadan tam ekran açılsın
        if (window.innerWidth <= 600) {
            settings.desktopFrame = false;
        }
    }

    // =========================================================================
    // MOBILE ON-SCREEN KEYBOARD & VISUAL VIEWPORT CONTROLLER
    // =========================================================================
    /**
     * Fixes mobile virtual keyboard behavior:
     * 1. Top header (Status bar, "ATA" title, settings & info section) stays 100% FIXED at top.
     * 2. Composer (Soru & Rica input boxes) lifts smoothly above the virtual keyboard.
     * 3. Messages viewport shrinks and auto-scrolls so recent messages remain readable.
     * 4. Tapping outside (on chat messages) dismisses keyboard.
     */
    function initMobileKeyboardHandler() {
        const vv = window.visualViewport;
        let isFocused = false;
        let rafId = null;

        function updateViewportMetrics() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const winH = window.innerHeight;
                const vpHeight = vv ? Math.round(vv.height) : winH;
                const activeInput = (document.activeElement === questionInput || document.activeElement === petitionInput);
                const kbDelta = Math.max(0, winH - vpHeight);
                const keyboardActive = isFocused || activeInput || (kbDelta > 60);

                if (keyboardActive && kbDelta > 40) {
                    document.documentElement.style.setProperty("--keyboard-offset", `${kbDelta}px`);
                    document.body.classList.add("keyboard-open");
                } else if (!isFocused && !activeInput && kbDelta <= 40) {
                    document.documentElement.style.setProperty("--keyboard-offset", "0px");
                    document.body.classList.remove("keyboard-open");
                }

                // Strictly prevent window from scrolling or displacement
                if (window.scrollY !== 0 || window.scrollX !== 0) {
                    window.scrollTo(0, 0);
                }
                if (document.body.scrollTop !== 0) {
                    document.body.scrollTop = 0;
                }
            });
        }

        if (vv) {
            vv.addEventListener("resize", updateViewportMetrics, { passive: true });
            vv.addEventListener("scroll", updateViewportMetrics, { passive: true });
        } else {
            window.addEventListener("resize", updateViewportMetrics, { passive: true });
        }

        window.addEventListener("scroll", function () {
            if (window.scrollY !== 0 || window.scrollX !== 0) {
                window.scrollTo(0, 0);
            }
        }, { passive: true });

        window.addEventListener("orientationchange", function () {
            setTimeout(updateViewportMetrics, 120);
        }, { passive: true });

        [questionInput, petitionInput].forEach(function (input) {
            if (!input) return;

            input.addEventListener("focus", function () {
                isFocused = true;
                updateViewportMetrics();
                setTimeout(() => {
                    if (window.scrollY !== 0) window.scrollTo(0, 0);
                    scrollToBottom();
                }, 100);
            }, { passive: true });

            input.addEventListener("blur", function () {
                setTimeout(function () {
                    const active = document.activeElement;
                    if (active !== questionInput && active !== petitionInput) {
                        isFocused = false;
                        document.documentElement.style.setProperty("--keyboard-offset", "0px");
                        document.body.classList.remove("keyboard-open");
                        updateViewportMetrics();
                    }
                }, 80);
            }, { passive: true });
        });

        // Dismiss keyboard when tapping inside the chat area (like Apple Messages / WhatsApp)
        if (chatViewport) {
            chatViewport.addEventListener("touchstart", function (e) {
                if (isFocused && e.target !== questionInput && e.target !== petitionInput && !e.target.closest(".composer-card")) {
                    if (questionInput) questionInput.blur();
                    if (petitionInput) petitionInput.blur();
                }
            }, { passive: true });

            chatViewport.addEventListener("mousedown", function (e) {
                if (isFocused && e.target !== questionInput && e.target !== petitionInput && !e.target.closest(".composer-card")) {
                    if (questionInput) questionInput.blur();
                    if (petitionInput) petitionInput.blur();
                }
            });
        }

        // Initialize immediately
        updateViewportMetrics();
    }

    // =========================================================================
    // α1Q v3.0 w.DRAGON & SECURITY COUNTDOWN CONTROLLER
    // =========================================================================

    // =========================================================================
    // 1. DRAGON VIDEO & REAL-TIME HARDWARE-ACCELERATED CHROMA KEY (WEBGL GPU 60FPS)
    // =========================================================================
    let dragonCtx = null;
    let dragonAnimFrame = null;
    let dragonVideoCallbackId = null;
    let isDragonPlaying = false;
    let gl = null;
    let webglProgram = null;
    let videoTexture = null;
    let useWebGL = false;

    function initDragonWebGL() {
        if (!dragonCanvas) return;
        try {
            const ctxOpts = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" };
            gl = dragonCanvas.getContext("webgl", ctxOpts) || dragonCanvas.getContext("experimental-webgl", ctxOpts);
        } catch (e) {
            gl = null;
        }

        if (!gl) {
            useWebGL = false;
            dragonCanvas.width = 360;
            dragonCanvas.height = 640;
            dragonCtx = dragonCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
            return;
        }

        const vsSource = `
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
                vTexCoord = aTexCoord;
            }
        `;

        // Crystal-clear chroma key: Keys out pure green background, leaves 100% natural dragon colors untouched
        const fsSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uTexture;
            void main() {
                vec4 c = texture2D(uTexture, vTexCoord);
                float maxRB = max(c.r, c.b);
                float greenDiff = c.g - maxRB;

                if (c.g > 0.22 && greenDiff > 0.07) {
                    discard;
                } else if (c.g > 0.17 && greenDiff > 0.02) {
                    float alpha = clamp(1.0 - (greenDiff - 0.02) / 0.05, 0.0, 1.0);
                    gl_FragColor = vec4(c.r, maxRB, c.b, c.a * alpha);
                } else {
                    gl_FragColor = c;
                }
            }
        `;

        function compileShader(source, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vs = compileShader(vsSource, gl.VERTEX_SHADER);
        const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
        if (!vs || !fs) {
            useWebGL = false;
            dragonCanvas.width = 360;
            dragonCanvas.height = 640;
            dragonCtx = dragonCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
            return;
        }

        webglProgram = gl.createProgram();
        gl.attachShader(webglProgram, vs);
        gl.attachShader(webglProgram, fs);
        gl.linkProgram(webglProgram);

        if (!gl.getProgramParameter(webglProgram, gl.LINK_STATUS)) {
            useWebGL = false;
            dragonCanvas.width = 360;
            dragonCanvas.height = 640;
            dragonCtx = dragonCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
            return;
        }

        gl.useProgram(webglProgram);

        const vertices = new Float32Array([
            -1,  1,  0, 0,
            -1, -1,  0, 1,
             1,  1,  1, 0,
             1, -1,  1, 1
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(webglProgram, "aPosition");
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

        const aTexCoord = gl.getAttribLocation(webglProgram, "aTexCoord");
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

        videoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        useWebGL = true;
    }

    initDragonWebGL();

    function renderDragonFrame() {
        if (!isDragonPlaying || !dragonVideo || !dragonCanvas) return;

        if (!dragonVideo.ended && dragonVideo.readyState >= 2) {
            try {
                if (useWebGL && gl && webglProgram) {
                    gl.viewport(0, 0, dragonCanvas.width, dragonCanvas.height);
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dragonVideo);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                } else if (dragonCtx) {
                    const w = dragonCanvas.width;
                    const h = dragonCanvas.height;
                    dragonCtx.drawImage(dragonVideo, 0, 0, w, h);
                    const imgData = dragonCtx.getImageData(0, 0, w, h);
                    const buf32 = new Uint32Array(imgData.data.buffer);
                    const len = buf32.length;
                    for (let i = 0; i < len; i++) {
                        const pixel = buf32[i];
                        const r = pixel & 0xFF;
                        const g = (pixel >> 8) & 0xFF;
                        const b = (pixel >> 16) & 0xFF;
                        const maxRB = r > b ? r : b;
                        const diff = g - maxRB;
                        if (diff > 16 && g > 60) {
                            buf32[i] = 0;
                        }
                    }
                    dragonCtx.putImageData(imgData, 0, 0);
                }
            } catch (e) { }
        }

        if (isDragonPlaying && !dragonVideo.ended) {
            scheduleNextDragonFrame();
        }
    }

    function scheduleNextDragonFrame() {
        if (!isDragonPlaying) return;
        dragonAnimFrame = requestAnimationFrame(renderDragonFrame);
    }

    function syncDragonCanvasSize() {
        if (!dragonVideo || !dragonCanvas) return;
        const rawW = dragonVideo.videoWidth || 540;
        const rawH = dragonVideo.videoHeight || 960;
        // Cap maximum resolution to 540 width for ultra smooth 60fps mobile rendering
        const scale = Math.min(1, 540 / rawW);
        const vw = Math.round(rawW * scale);
        const vh = Math.round(rawH * scale);
        if (dragonCanvas.width !== vw || dragonCanvas.height !== vh) {
            dragonCanvas.width = vw;
            dragonCanvas.height = vh;
            if (useWebGL && gl) {
                gl.viewport(0, 0, vw, vh);
            }
        }
    }

    if (dragonVideo) {
        dragonVideo.addEventListener("loadedmetadata", syncDragonCanvasSize);
        dragonVideo.addEventListener("canplay", syncDragonCanvasSize);
        dragonVideo.addEventListener("playing", function () {
            syncDragonCanvasSize();
            scheduleNextDragonFrame();
        });
        dragonVideo.addEventListener("ended", function () {
            if (isDragonPlaying) {
                dragonVideo.currentTime = 0;
                dragonVideo.play().catch(() => {});
            }
        });
    }

    function startDragonVideo() {
        if (!dragonVideo) return;
        isDragonPlaying = true;

        syncDragonCanvasSize();

        if (dragonVideo.readyState === 0) {
            dragonVideo.load();
        }

        try {
            dragonVideo.currentTime = 0;
        } catch (e) { }

        // Clear any lingering frames
        if (dragonAnimFrame) {
            cancelAnimationFrame(dragonAnimFrame);
            dragonAnimFrame = null;
        }
        if (dragonVideoCallbackId && "cancelVideoFrameCallback" in dragonVideo) {
            dragonVideo.cancelVideoFrameCallback(dragonVideoCallbackId);
            dragonVideoCallbackId = null;
        }

        dragonVideo.playsInline = true;
        dragonVideo.setAttribute("playsinline", "");
        dragonVideo.setAttribute("webkit-playsinline", "");
        dragonVideo.muted = false; // Directly play with sound ON
        dragonVideo.volume = 1.0;

        const playPromise = dragonVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                syncDragonCanvasSize();
                scheduleNextDragonFrame();
            }).catch(() => {
                dragonVideo.muted = true;
                dragonVideo.play().then(() => {
                    scheduleNextDragonFrame();
                }).catch(() => {});
            });
        } else {
            scheduleNextDragonFrame();
        }
    }

    function stopDragonVideo() {
        isDragonPlaying = false;
        if (dragonAnimFrame) {
            cancelAnimationFrame(dragonAnimFrame);
            dragonAnimFrame = null;
        }
        if (dragonVideo && dragonVideoCallbackId && "cancelVideoFrameCallback" in dragonVideo) {
            dragonVideo.cancelVideoFrameCallback(dragonVideoCallbackId);
            dragonVideoCallbackId = null;
        }
        if (dragonVideo) {
            dragonVideo.pause();
            try {
                dragonVideo.currentTime = 0;
            } catch (e) { }
        }
        if (useWebGL && gl) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        } else if (dragonCtx && dragonCanvas) {
            dragonCtx.clearRect(0, 0, dragonCanvas.width, dragonCanvas.height);
        }
    }

    // =========================================================================
    // 2. LOCK SCREEN DRAGON VIDEO (kilit_dragon.mp4) - HARDWARE-ACCELERATED CHROMA KEY
    // =========================================================================
    let kurtDragonCtx = null;
    let kurtDragonAnimFrame = null;
    let kurtDragonVideoCallbackId = null;
    let isKurtDragonPlaying = false;
    let kurtGl = null;
    let kurtWebglProgram = null;
    let kurtVideoTexture = null;
    let kurtBuffer = null;
    let kurtPosAttr = -1;
    let kurtTexAttr = -1;
    let useKurtWebGL = false;

    function initKurtDragonWebGL() {
        if (!kurtDragonCanvas) return;
        try {
            const ctxOpts = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" };
            kurtGl = kurtDragonCanvas.getContext("webgl", ctxOpts) || kurtDragonCanvas.getContext("experimental-webgl", ctxOpts);
        } catch (e) {
            kurtGl = null;
        }

        if (!kurtGl) {
            useKurtWebGL = false;
            kurtDragonCanvas.width = 360;
            kurtDragonCanvas.height = 640;
            kurtDragonCtx = kurtDragonCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
            return;
        }

        const vsSource = `
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
                vTexCoord = aTexCoord;
            }
        `;

        // Crystal-clear chroma key: Keys out pure green background, leaves 100% natural dragon colors untouched
        const fsSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uTexture;
            void main() {
                vec4 c = texture2D(uTexture, vTexCoord);
                float maxRB = max(c.r, c.b);
                float greenDiff = c.g - maxRB;

                if (c.g > 0.22 && greenDiff > 0.07) {
                    discard;
                } else if (c.g > 0.17 && greenDiff > 0.02) {
                    float alpha = clamp(1.0 - (greenDiff - 0.02) / 0.05, 0.0, 1.0);
                    gl_FragColor = vec4(c.r, maxRB, c.b, c.a * alpha);
                } else {
                    gl_FragColor = c;
                }
            }
        `;

        function compileShader(glContext, source, type) {
            const shader = glContext.createShader(type);
            glContext.shaderSource(shader, source);
            glContext.compileShader(shader);
            if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
                glContext.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vs = compileShader(kurtGl, vsSource, kurtGl.VERTEX_SHADER);
        const fs = compileShader(kurtGl, fsSource, kurtGl.FRAGMENT_SHADER);
        if (!vs || !fs) {
            useKurtWebGL = false;
            kurtDragonCanvas.width = 360;
            kurtDragonCanvas.height = 640;
            kurtDragonCtx = kurtDragonCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
            return;
        }

        kurtWebglProgram = kurtGl.createProgram();
        kurtGl.attachShader(kurtWebglProgram, vs);
        kurtGl.attachShader(kurtWebglProgram, fs);
        kurtGl.linkProgram(kurtWebglProgram);

        if (!kurtGl.getProgramParameter(kurtWebglProgram, kurtGl.LINK_STATUS)) {
            useKurtWebGL = false;
            kurtDragonCanvas.width = 360;
            kurtDragonCanvas.height = 640;
            kurtDragonCtx = kurtDragonCanvas.getContext("2d", { willReadFrequently: true, alpha: true });
            return;
        }

        kurtGl.useProgram(kurtWebglProgram);

        const vertices = new Float32Array([
            -1,  1,  0, 0,
            -1, -1,  0, 1,
             1,  1,  1, 0,
             1, -1,  1, 1
        ]);

        kurtBuffer = kurtGl.createBuffer();
        kurtGl.bindBuffer(kurtGl.ARRAY_BUFFER, kurtBuffer);
        kurtGl.bufferData(kurtGl.ARRAY_BUFFER, vertices, kurtGl.STATIC_DRAW);

        kurtPosAttr = kurtGl.getAttribLocation(kurtWebglProgram, "aPosition");
        kurtGl.enableVertexAttribArray(kurtPosAttr);
        kurtGl.vertexAttribPointer(kurtPosAttr, 2, kurtGl.FLOAT, false, 16, 0);

        kurtTexAttr = kurtGl.getAttribLocation(kurtWebglProgram, "aTexCoord");
        kurtGl.enableVertexAttribArray(kurtTexAttr);
        kurtGl.vertexAttribPointer(kurtTexAttr, 2, kurtGl.FLOAT, false, 16, 8);

        kurtVideoTexture = kurtGl.createTexture();
        kurtGl.bindTexture(kurtGl.TEXTURE_2D, kurtVideoTexture);
        kurtGl.texParameteri(kurtGl.TEXTURE_2D, kurtGl.TEXTURE_WRAP_S, kurtGl.CLAMP_TO_EDGE);
        kurtGl.texParameteri(kurtGl.TEXTURE_2D, kurtGl.TEXTURE_WRAP_T, kurtGl.CLAMP_TO_EDGE);
        kurtGl.texParameteri(kurtGl.TEXTURE_2D, kurtGl.TEXTURE_MIN_FILTER, kurtGl.LINEAR);
        kurtGl.texParameteri(kurtGl.TEXTURE_2D, kurtGl.TEXTURE_MAG_FILTER, kurtGl.LINEAR);

        useKurtWebGL = true;
    }

    initKurtDragonWebGL();

    function renderKurtDragonFrame() {
        if (!isKurtDragonPlaying || !kurtDragonVideo || !kurtDragonCanvas) return;

        if (!kurtDragonVideo.ended && kurtDragonVideo.readyState >= 2) {
            try {
                if (useKurtWebGL && kurtGl && kurtWebglProgram) {
                    kurtGl.viewport(0, 0, kurtDragonCanvas.width, kurtDragonCanvas.height);
                    kurtGl.clearColor(0, 0, 0, 0);
                    kurtGl.clear(kurtGl.COLOR_BUFFER_BIT);

                    kurtGl.useProgram(kurtWebglProgram);
                    if (kurtBuffer) kurtGl.bindBuffer(kurtGl.ARRAY_BUFFER, kurtBuffer);
                    if (kurtPosAttr >= 0) {
                        kurtGl.enableVertexAttribArray(kurtPosAttr);
                        kurtGl.vertexAttribPointer(kurtPosAttr, 2, kurtGl.FLOAT, false, 16, 0);
                    }
                    if (kurtTexAttr >= 0) {
                        kurtGl.enableVertexAttribArray(kurtTexAttr);
                        kurtGl.vertexAttribPointer(kurtTexAttr, 2, kurtGl.FLOAT, false, 16, 8);
                    }

                    kurtGl.bindTexture(kurtGl.TEXTURE_2D, kurtVideoTexture);
                    kurtGl.texImage2D(kurtGl.TEXTURE_2D, 0, kurtGl.RGBA, kurtGl.RGBA, kurtGl.UNSIGNED_BYTE, kurtDragonVideo);
                    kurtGl.drawArrays(kurtGl.TRIANGLE_STRIP, 0, 4);
                } else if (kurtDragonCtx) {
                    const w = kurtDragonCanvas.width;
                    const h = kurtDragonCanvas.height;
                    kurtDragonCtx.drawImage(kurtDragonVideo, 0, 0, w, h);
                    const imgData = kurtDragonCtx.getImageData(0, 0, w, h);
                    const buf32 = new Uint32Array(imgData.data.buffer);
                    const len = buf32.length;
                    for (let i = 0; i < len; i++) {
                        const pixel = buf32[i];
                        const r = pixel & 0xFF;
                        const g = (pixel >> 8) & 0xFF;
                        const b = (pixel >> 16) & 0xFF;
                        const maxRB = r > b ? r : b;
                        const diff = g - maxRB;
                        if (diff > 16 && g > 60) {
                            buf32[i] = 0;
                        }
                    }
                    kurtDragonCtx.putImageData(imgData, 0, 0);
                }
            } catch (e) { }
        }

        if (isKurtDragonPlaying && !kurtDragonVideo.ended) {
            scheduleNextKurtDragonFrame();
        }
    }

    function scheduleNextKurtDragonFrame() {
        if (!isKurtDragonPlaying) return;
        kurtDragonAnimFrame = requestAnimationFrame(renderKurtDragonFrame);
    }

    function syncKurtDragonCanvasSize() {
        if (!kurtDragonVideo || !kurtDragonCanvas) return;
        const rawW = kurtDragonVideo.videoWidth || 540;
        const rawH = kurtDragonVideo.videoHeight || 960;
        // Cap maximum resolution to 540 width for ultra smooth 60fps mobile rendering
        const scale = Math.min(1, 540 / rawW);
        const vw = Math.round(rawW * scale);
        const vh = Math.round(rawH * scale);
        if (kurtDragonCanvas.width !== vw || kurtDragonCanvas.height !== vh) {
            kurtDragonCanvas.width = vw;
            kurtDragonCanvas.height = vh;
            if (useKurtWebGL && kurtGl) {
                kurtGl.viewport(0, 0, vw, vh);
            }
        }
    }

    let kurtRestartTimeout = null;

    if (kurtDragonVideo) {
        kurtDragonVideo.addEventListener("loadedmetadata", syncKurtDragonCanvasSize);
        kurtDragonVideo.addEventListener("canplay", function () {
            syncKurtDragonCanvasSize();
            if (isKurtDragonPlaying && kurtDragonVideo.paused) {
                const p = kurtDragonVideo.play();
                if (p !== undefined) {
                    p.catch(() => {
                        kurtDragonVideo.muted = true;
                        kurtDragonVideo.play().catch(() => {});
                    });
                }
            }
        });
        kurtDragonVideo.addEventListener("loadeddata", function () {
            syncKurtDragonCanvasSize();
            if (isKurtDragonPlaying && kurtDragonVideo.paused) {
                const p = kurtDragonVideo.play();
                if (p !== undefined) {
                    p.catch(() => {
                        kurtDragonVideo.muted = true;
                        kurtDragonVideo.play().catch(() => {});
                    });
                }
            }
        });
        kurtDragonVideo.addEventListener("playing", function () {
            syncKurtDragonCanvasSize();
            scheduleNextKurtDragonFrame();
        });
        kurtDragonVideo.addEventListener("error", function () {
            console.warn("kurtDragonVideo error encountered, falling back to dragon.mp4", kurtDragonVideo.error);
            if (kurtDragonVideo.src && !kurtDragonVideo.src.includes("dragon.mp4")) {
                kurtDragonVideo.src = "dragon.mp4";
                kurtDragonVideo.load();
                kurtDragonVideo.play().catch(() => {});
            }
        });
        kurtDragonVideo.addEventListener("ended", function () {
            if (!isKurtDragonPlaying) return;

            if (useKurtWebGL && kurtGl) {
                kurtGl.clearColor(0, 0, 0, 0);
                kurtGl.clear(kurtGl.COLOR_BUFFER_BIT);
            } else if (kurtDragonCtx && kurtDragonCanvas) {
                kurtDragonCtx.clearRect(0, 0, kurtDragonCanvas.width, kurtDragonCanvas.height);
            }

            if (kurtRestartTimeout) clearTimeout(kurtRestartTimeout);
            kurtRestartTimeout = setTimeout(() => {
                if (isKurtDragonPlaying && kurtDragonVideo) {
                    kurtDragonVideo.currentTime = 0;
                    const p = kurtDragonVideo.play();
                    if (p !== undefined) {
                        p.then(() => {
                            scheduleNextKurtDragonFrame();
                        }).catch(() => {
                            kurtDragonVideo.muted = true;
                            kurtDragonVideo.play().then(() => {
                                scheduleNextKurtDragonFrame();
                            }).catch(() => {});
                        });
                    }
                }
            }, 1000);
        });
    }

    // Touch or click anywhere immediately unmutes if started muted due to cold boot restrictions
    function tryUnmuteKurtDragon() {
        if (isKurtKapaniActive && kurtDragonVideo) {
            if (kurtDragonVideo.muted) {
                kurtDragonVideo.muted = false;
                kurtDragonVideo.volume = 1.0;
            }
            if (kurtDragonVideo.paused) {
                kurtDragonVideo.play().catch(() => {});
            }
        }
    }
    window.addEventListener("pointerdown", tryUnmuteKurtDragon, { passive: true });
    window.addEventListener("touchstart", tryUnmuteKurtDragon, { passive: true });
    window.addEventListener("click", tryUnmuteKurtDragon, { passive: true });

    function startKurtDragonVideo() {
        if (!kurtDragonVideo) return;
        isKurtDragonPlaying = true;

        if (kurtRestartTimeout) {
            clearTimeout(kurtRestartTimeout);
            kurtRestartTimeout = null;
        }

        syncKurtDragonCanvasSize();

        if (kurtDragonAnimFrame) {
            cancelAnimationFrame(kurtDragonAnimFrame);
            kurtDragonAnimFrame = null;
        }
        if (kurtDragonVideoCallbackId && "cancelVideoFrameCallback" in kurtDragonVideo) {
            kurtDragonVideo.cancelVideoFrameCallback(kurtDragonVideoCallbackId);
            kurtDragonVideoCallbackId = null;
        }

        kurtDragonVideo.playsInline = true;
        kurtDragonVideo.setAttribute("playsinline", "");
        kurtDragonVideo.setAttribute("webkit-playsinline", "");

        if (kurtDragonVideo.paused) {
            // First attempt to play with sound ON
            kurtDragonVideo.muted = false;
            kurtDragonVideo.volume = 1.0;
            const playPromise = kurtDragonVideo.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    syncKurtDragonCanvasSize();
                }).catch(() => {
                    // Autoplay policy prevented unmuted play (cold boot) -> fallback immediately to muted so video plays!
                    kurtDragonVideo.muted = true;
                    kurtDragonVideo.play().then(() => {
                        syncKurtDragonCanvasSize();
                    }).catch(() => {});
                });
            }
        } else {
            syncKurtDragonCanvasSize();
        }

        // Always schedule the render loop immediately so frames draw the instant readyState >= 2
        scheduleNextKurtDragonFrame();
    }

    function stopKurtDragonVideo() {
        isKurtDragonPlaying = false;
        if (kurtRestartTimeout) {
            clearTimeout(kurtRestartTimeout);
            kurtRestartTimeout = null;
        }
        if (kurtDragonAnimFrame) {
            cancelAnimationFrame(kurtDragonAnimFrame);
            kurtDragonAnimFrame = null;
        }
        if (kurtDragonVideo && kurtDragonVideoCallbackId && "cancelVideoFrameCallback" in kurtDragonVideo) {
            kurtDragonVideo.cancelVideoFrameCallback(kurtDragonVideoCallbackId);
            kurtDragonVideoCallbackId = null;
        }
        if (kurtDragonVideo) {
            kurtDragonVideo.pause();
            try {
                kurtDragonVideo.currentTime = 0;
            } catch (e) { }
        }
        if (useKurtWebGL && kurtGl) {
            kurtGl.clearColor(0, 0, 0, 0);
            kurtGl.clear(kurtGl.COLOR_BUFFER_BIT);
        } else if (kurtDragonCtx && kurtDragonCanvas) {
            kurtDragonCtx.clearRect(0, 0, kurtDragonCanvas.width, kurtDragonCanvas.height);
        }
    }

    window.addEventListener("pointerdown", function () {
        if (dragonVideo && dragonVideo.readyState === 0) {
            dragonVideo.load();
        }
        if (kurtDragonVideo && kurtDragonVideo.readyState === 0) {
            kurtDragonVideo.load();
        }
        if (dragonVideo && isDragonPlaying && dragonVideo.muted) {
            dragonVideo.muted = false;
            dragonVideo.volume = 1.0;
        }
        if (kurtDragonVideo && isKurtDragonPlaying && kurtDragonVideo.muted) {
            kurtDragonVideo.muted = false;
            kurtDragonVideo.volume = 1.0;
        }
    }, { passive: true });

    // =========================================================================
    // 3. 10-SECOND iOS SECURITY COUNTDOWN
    // =========================================================================
    function startCountdown() {
        if (isKurtKapaniActive) return;
        if (isCountingDown && countdownInterval) return;

        isCountingDown = true;
        updateSendButton();

        // Screen isolation: completely hide ATA ANS and deactivate lock screen
        document.body.classList.add("countdown-screen-active");
        document.body.classList.remove("kurt-screen-active");
        document.documentElement.classList.remove("kurt-locked-boot");
        if (deviceWrapper) deviceWrapper.style.display = "none";

        stopKurtDragonVideo();
        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.classList.remove("active");
            kurtKapaniOverlay.setAttribute("aria-hidden", "true");
        }

        if (unlockedScreen) {
            unlockedScreen.style.display = "none";
        }

        if (countdownStartTimeout) {
            clearTimeout(countdownStartTimeout);
            countdownStartTimeout = null;
        }

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        const TOTAL_COUNTDOWN_SECONDS = 10;
        let secondsLeft = TOTAL_COUNTDOWN_SECONDS;
        if (countdownNumber) {
            countdownNumber.textContent = secondsLeft;
            countdownNumber.classList.remove("tick-pop");
        }
        if (countdownProgressBar) {
            countdownProgressBar.style.transition = "none";
            countdownProgressBar.style.width = "100%";
            void countdownProgressBar.offsetWidth;
            countdownProgressBar.style.transition = "width 1s linear";
        }

        // Screen isolation: Countdown active, ensure ATA ANS is visible behind blurred overlay, lock screen completely stopped
        document.body.classList.add("countdown-screen-active");
        document.body.classList.remove("kurt-screen-active", "unlocked-screen-active");
        stopKurtDragonVideo();
        if (deviceWrapper) {
            deviceWrapper.style.display = "";
        }
        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.classList.remove("active");
            kurtKapaniOverlay.style.display = "none";
            kurtKapaniOverlay.setAttribute("aria-hidden", "true");
        }
        if (unlockedScreen) {
            unlockedScreen.style.display = "none";
            unlockedScreen.classList.remove("active");
            unlockedScreen.setAttribute("aria-hidden", "true");
        }

        if (countdownOverlay) {
            countdownOverlay.style.display = "flex";
            countdownOverlay.classList.add("active");
            countdownOverlay.setAttribute("aria-hidden", "false");
        }
        startDragonVideo();
        playCountdownTick();

        // Prime video bytes without starting playback or consuming GPU/CPU during countdown
        if (kurtDragonVideo && kurtDragonVideo.readyState === 0) {
            kurtDragonVideo.load();
        }

        countdownInterval = setInterval(() => {
            secondsLeft--;

            if (countdownNumber) {
                countdownNumber.textContent = secondsLeft;
                countdownNumber.classList.add("tick-pop");
                setTimeout(() => {
                    if (countdownNumber) countdownNumber.classList.remove("tick-pop");
                }, 180);
            }

            if (countdownProgressBar) {
                countdownProgressBar.style.width = Math.max(0, (secondsLeft / TOTAL_COUNTDOWN_SECONDS) * 100) + "%";
            }

            playCountdownTick();

            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                isCountingDown = false;

                transitionCountdownToLockScreen();
            }
        }, 1000);
    }

    /**
     * Seamless cross-fade transition from countdown to lock screen
     */
    function transitionCountdownToLockScreen() {
        isKurtKapaniActive = true;
        isCountingDown = false;

        resetSecretUnlockState();

        if (unlockedScreen) {
            unlockedScreen.style.display = "none";
            unlockedScreen.classList.remove("active");
            unlockedScreen.setAttribute("aria-hidden", "true");
        }

        // Screen isolation: Lock screen active, hide ATA ANS
        document.body.classList.remove("countdown-screen-active", "unlocked-screen-active");
        document.body.classList.add("kurt-screen-active");
        document.documentElement.classList.add("kurt-locked-boot", "kurt-screen-active");
        if (deviceWrapper) deviceWrapper.style.display = "none";

        // Reset slide unlock track state
        if (slideUnlockWrapper) {
            slideUnlockWrapper.classList.remove("revealed");
        }
        if (slideUnlockThumb) {
            slideUnlockThumb.style.transition = "";
            slideUnlockThumb.style.transform = "translateX(0px)";
            slideUnlockThumb.classList.remove("dragging");
        }
        if (slideUnlockProgress) {
            slideUnlockProgress.style.transition = "";
            slideUnlockProgress.style.width = "0px";
        }
        if (slideUnlockText) {
            slideUnlockText.style.transition = "";
            slideUnlockText.style.opacity = "1";
        }

        // 1. Mark transition active
        document.documentElement.classList.add("kurt-animating");

        // 2. Activate lock screen behind countdown
        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.style.display = "flex";
            kurtKapaniOverlay.classList.add("active");
            kurtKapaniOverlay.setAttribute("aria-hidden", "false");
        }
        startKurtDragonVideo();

        // 3. Trigger fade-out
        const countdownBox = document.querySelector(".countdown-box");
        if (countdownOverlay) countdownOverlay.classList.add("fading-out");
        if (countdownBox) countdownBox.classList.add("fading-out");
        if (dragonCanvas) dragonCanvas.classList.add("fading-out");

        // 4. Fade out dragon audio
        if (dragonVideo) {
            const startVol = dragonVideo.volume || 1.0;
            const steps = 16;
            let currentStep = 0;
            const fadeTimer = setInterval(() => {
                currentStep++;
                if (dragonVideo) {
                    dragonVideo.volume = Math.max(0, startVol * (1 - currentStep / steps));
                }
                if (currentStep >= steps) {
                    clearInterval(fadeTimer);
                }
            }, 50);
        }

        playLockdownSound();

        // 5. Finalize
        setTimeout(() => {
            stopDragonVideo();
            if (countdownOverlay) {
                countdownOverlay.classList.remove("active", "fading-out");
                countdownOverlay.style.display = "none";
                countdownOverlay.setAttribute("aria-hidden", "true");
            }
            if (countdownBox) countdownBox.classList.remove("fading-out");
            if (dragonCanvas) dragonCanvas.classList.remove("fading-out");

            try {
                localStorage.setItem(STORAGE_KURT_LOCK_KEY, "locked");
            } catch (e) { }

            document.documentElement.classList.remove("kurt-animating");
            document.documentElement.classList.add("kurt-locked-boot", "kurt-screen-active");
            document.body.classList.add("kurt-locked-boot", "kurt-screen-active");
            document.body.classList.remove("countdown-screen-active", "unlocked-screen-active");
            if (deviceWrapper) deviceWrapper.style.display = "none";
        }, 850);
    }

    // =========================================================================
    // 4. α1Q v3.0 w.DRAGON FULLSCREEN SECURITY LOCKOUT
    // =========================================================================
    function enterKurtKapaniMode(playSound = true) {
        isKurtKapaniActive = true;
        isCountingDown = false;
        isSending = false;
        stopDragonVideo();
        resetSecretUnlockState();

        try {
            localStorage.setItem(STORAGE_KURT_LOCK_KEY, "locked");
        } catch (e) { }
        document.documentElement.classList.add("kurt-locked-boot", "kurt-screen-active");
        document.body.classList.add("kurt-locked-boot", "kurt-screen-active");
        document.body.classList.remove("countdown-screen-active", "unlocked-screen-active");
        if (deviceWrapper) deviceWrapper.style.display = "none";

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (countdownStartTimeout) {
            clearTimeout(countdownStartTimeout);
            countdownStartTimeout = null;
        }

        if (questionInput) {
            questionInput.blur();
            questionInput.disabled = true;
        }
        if (petitionInput) {
            petitionInput.blur();
            petitionInput.disabled = true;
        }
        updateSendButton();

        if (settingsModal) settingsModal.classList.remove("active");
        if (infoModal) infoModal.classList.remove("active");
        if (iosAlert) iosAlert.classList.remove("active");

        if (countdownOverlay) {
            countdownOverlay.classList.remove("active", "fading-out");
            countdownOverlay.style.display = "none";
            countdownOverlay.setAttribute("aria-hidden", "true");
        }

        if (unlockedScreen) {
            unlockedScreen.style.display = "none";
            unlockedScreen.classList.remove("active");
            unlockedScreen.setAttribute("aria-hidden", "true");
        }

        // Reset slide unlock track state
        if (slideUnlockWrapper) {
            slideUnlockWrapper.classList.remove("revealed");
        }
        if (slideUnlockThumb) {
            slideUnlockThumb.style.transition = "";
            slideUnlockThumb.style.transform = "translateX(0px)";
            slideUnlockThumb.classList.remove("dragging");
        }
        if (slideUnlockProgress) {
            slideUnlockProgress.style.transition = "";
            slideUnlockProgress.style.width = "0px";
        }
        if (slideUnlockText) {
            slideUnlockText.style.transition = "";
            slideUnlockText.style.opacity = "1";
        }

        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.style.display = "flex";
            kurtKapaniOverlay.classList.add("active");
            kurtKapaniOverlay.setAttribute("aria-hidden", "false");
        }
        startKurtDragonVideo();

        if (playSound) {
            playLockdownSound();
        }
    }

    /**
     * Exit Kurt Kapanı Mode (Unlocked via 4-step sequence + Slide Right)
     */
    function exitKurtKapaniMode() {
        if (!isKurtKapaniActive) return;
        isKurtKapaniActive = false;
        isCountingDown = false;
        isSending = false;
        failedAttemptsCount = 0;
        resetSecretUnlockState();

        try {
            localStorage.removeItem(STORAGE_KURT_LOCK_KEY);
        } catch (e) { }
        document.documentElement.classList.remove("kurt-locked-boot", "kurt-screen-active");
        document.body.classList.remove("kurt-locked-boot", "kurt-screen-active", "countdown-screen-active");
        document.body.classList.add("unlocked-screen-active");

        stopDragonVideo();
        stopKurtDragonVideo();

        if (deviceWrapper) {
            deviceWrapper.style.display = "";
        }

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (countdownStartTimeout) {
            clearTimeout(countdownStartTimeout);
            countdownStartTimeout = null;
        }

        if (questionInput) {
            questionInput.disabled = false;
            questionInput.value = "";
        }
        if (petitionInput) {
            petitionInput.disabled = false;
            petitionInput.value = "";
        }
        updateSendButton();

        if (slideUnlockWrapper) {
            slideUnlockWrapper.classList.remove("revealed");
        }
        if (slideUnlockThumb) {
            slideUnlockThumb.style.transition = "";
            slideUnlockThumb.style.transform = "translateX(0px)";
            slideUnlockThumb.classList.remove("dragging");
        }
        if (slideUnlockProgress) {
            slideUnlockProgress.style.transition = "";
            slideUnlockProgress.style.width = "0px";
        }
        if (slideUnlockText) {
            slideUnlockText.style.transition = "";
            slideUnlockText.style.opacity = "1";
        }

        if (countdownOverlay) {
            countdownOverlay.classList.remove("active", "fading-out");
            countdownOverlay.style.display = "none";
            countdownOverlay.setAttribute("aria-hidden", "true");
        }
        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.classList.remove("active");
            kurtKapaniOverlay.style.display = "none";
            kurtKapaniOverlay.setAttribute("aria-hidden", "true");
        }

        document.body.classList.remove("countdown-screen-active", "kurt-screen-active", "unlocked-screen-active");
        document.documentElement.classList.remove("kurt-locked-boot", "kurt-screen-active");
        if (deviceWrapper) {
            deviceWrapper.style.display = "";
        }

        playUnlockChime();
        if (questionInput) {
            setTimeout(() => {
                questionInput.focus();
            }, 100);
        }
    }

    // =========================================================================
    // 5. YENİ GİZLİ KİLİT AÇMA SIRASI (4-ADIM):
    //    1. "Güvenlik" yazısına 2 kez tıklama
    //    2. Aşağı kaydırma (Swipe Down)
    //    3. Logoya 2 kez tıklama (Çift Tık)
    //    4. Ekranın tam ortasında beliren çubuğu sağa kaydırma
    // =========================================================================
    let step1_guvenlikTapped = false;
    let step1Time = 0;
    let guvenlikTapCount = 0;
    let lastGuvenlikTapTime = 0;

    let step2_swipedDown = false;
    let step2Time = 0;
    let isSwipeTracking = false;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let ignoreNextLogoClick = false;

    let logoTapCount = 0;
    let lastLogoTapTime = 0;

    function resetSecretUnlockState() {
        step1_guvenlikTapped = false;
        step1Time = 0;
        guvenlikTapCount = 0;
        lastGuvenlikTapTime = 0;

        step2_swipedDown = false;
        step2Time = 0;
        isSwipeTracking = false;
        swipeStartX = 0;
        swipeStartY = 0;
        ignoreNextLogoClick = false;

        logoTapCount = 0;
        lastLogoTapTime = 0;
    }

    // ADIM 1: "Güvenlik" satırına 2 kez tıklama
    if (guvenlikTrigger) {
        guvenlikTrigger.addEventListener("click", function (e) {
            if (!isKurtKapaniActive) return;

            const now = Date.now();
            if (now - lastGuvenlikTapTime < 600) {
                guvenlikTapCount++;
            } else {
                guvenlikTapCount = 1;
            }
            lastGuvenlikTapTime = now;

            if (guvenlikTapCount >= 2) {
                step1_guvenlikTapped = true;
                step1Time = now;
                guvenlikTapCount = 0;

                step2_swipedDown = false;
                logoTapCount = 0;
            }
        });
    }

    // ADIM 2: Aşağı kaydırma (Adım 1 yapıldıktan sonra)
    window.addEventListener("pointerdown", function (e) {
        if (!isKurtKapaniActive) return;
        if (slideUnlockWrapper && slideUnlockWrapper.contains(e.target)) return;

        isSwipeTracking = true;
        swipeStartX = e.clientX;
        swipeStartY = e.clientY;
    });

    window.addEventListener("pointerup", function (e) {
        if (!isSwipeTracking) return;
        isSwipeTracking = false;

        if (!isKurtKapaniActive) return;

        const now = Date.now();
        if (!step1_guvenlikTapped || (now - step1Time > 10000)) {
            step1_guvenlikTapped = false;
            return;
        }

        const finalDeltaY = e.clientY - swipeStartY;
        const finalDeltaX = Math.abs(e.clientX - swipeStartX);

        const isStrictlyDownward = finalDeltaY >= 35 && finalDeltaX < (finalDeltaY * 0.75);

        if (isStrictlyDownward) {
            step2_swipedDown = true;
            step2Time = now;
            logoTapCount = 0;
            ignoreNextLogoClick = true;
            setTimeout(() => { ignoreNextLogoClick = false; }, 320);
            playCountdownTick();
        }
    });

    window.addEventListener("pointercancel", function () {
        isSwipeTracking = false;
    });

    // ADIM 3: Logoya çift tıklama (Adım 2 yapıldıktan sonra)
    if (secretUnlockTrigger) {
        secretUnlockTrigger.addEventListener("click", function (e) {
            if (!isKurtKapaniActive) return;
            if (ignoreNextLogoClick) return;

            const now = Date.now();

            if (!step2_swipedDown || (now - step2Time > 10000)) {
                step1_guvenlikTapped = false;
                step2_swipedDown = false;
                logoTapCount = 0;
                return;
            }

            if (now - lastLogoTapTime < 600) {
                logoTapCount++;
            } else {
                logoTapCount = 1;
            }
            lastLogoTapTime = now;

            if (logoTapCount >= 2) {
                resetSecretUnlockState();
                if (slideUnlockWrapper) {
                    slideUnlockWrapper.classList.add("revealed");
                }
                playCountdownTick();
            }
        });
    }

    // =========================================================================
    // 6. APPLE SLIDE TO UNLOCK DRAG CONTROLLER
    // =========================================================================
    if (slideUnlockThumb && slideUnlockTrack) {
        let isDragging = false;
        let startX = 0;
        let currentTranslateX = 0;

        function getMaxDrag() {
            const trackRect = slideUnlockTrack.getBoundingClientRect();
            const thumbRect = slideUnlockThumb.getBoundingClientRect();
            const trackWidth = trackRect.width || 320;
            const thumbWidth = thumbRect.width || 48;
            return Math.max(20, trackWidth - thumbWidth - 8);
        }

        function onDragStart(clientX) {
            isDragging = true;
            startX = clientX - currentTranslateX;
            slideUnlockThumb.classList.add("dragging");
            slideUnlockThumb.style.transition = "none";
            if (slideUnlockProgress) slideUnlockProgress.style.transition = "none";
            if (slideUnlockText) slideUnlockText.style.transition = "none";
        }

        function onDragMove(clientX) {
            if (!isDragging) return;
            const maxDrag = getMaxDrag();
            const rawX = clientX - startX;
            currentTranslateX = Math.max(0, Math.min(rawX, maxDrag));

            slideUnlockThumb.style.transform = `translateX(${currentTranslateX}px)`;

            if (slideUnlockProgress) {
                const thumbWidth = slideUnlockThumb.offsetWidth || 48;
                slideUnlockProgress.style.width = `${currentTranslateX + thumbWidth / 2}px`;
            }

            if (slideUnlockText) {
                const progress = currentTranslateX / maxDrag;
                slideUnlockText.style.opacity = Math.max(0, 1 - progress * 1.6).toString();
            }
        }

        function onDragEnd() {
            if (!isDragging) return;
            isDragging = false;
            slideUnlockThumb.classList.remove("dragging");
            const maxDrag = getMaxDrag();

            if (currentTranslateX >= maxDrag * 0.70) {
                slideUnlockThumb.style.transition = "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)";
                slideUnlockThumb.style.transform = `translateX(${maxDrag}px)`;
                if (slideUnlockProgress) {
                    slideUnlockProgress.style.transition = "width 0.18s cubic-bezier(0.16, 1, 0.3, 1)";
                    slideUnlockProgress.style.width = "100%";
                }
                if (slideUnlockText) {
                    slideUnlockText.style.transition = "opacity 0.15s ease";
                    slideUnlockText.style.opacity = "0";
                }

                setTimeout(() => {
                    exitKurtKapaniMode();
                }, 180);
            } else {
                slideUnlockThumb.style.transition = "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";
                slideUnlockThumb.style.transform = "translateX(0px)";
                if (slideUnlockProgress) {
                    slideUnlockProgress.style.transition = "width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";
                    slideUnlockProgress.style.width = "0px";
                }
                if (slideUnlockText) {
                    slideUnlockText.style.transition = "opacity 0.3s ease";
                    slideUnlockText.style.opacity = "1";
                }
                setTimeout(() => {
                    slideUnlockThumb.style.transition = "";
                    if (slideUnlockProgress) slideUnlockProgress.style.transition = "";
                    if (slideUnlockText) slideUnlockText.style.transition = "";
                }, 300);
            }
            currentTranslateX = 0;
        }

        // Pointer Events (Unified)
        slideUnlockThumb.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            try { slideUnlockThumb.setPointerCapture(e.pointerId); } catch (err) { }
            onDragStart(e.clientX);
        });

        window.addEventListener("pointermove", function (e) {
            if (isDragging) {
                onDragMove(e.clientX);
            }
        });

        window.addEventListener("pointerup", function (e) {
            if (isDragging) {
                try { slideUnlockThumb.releasePointerCapture(e.pointerId); } catch (err) { }
                onDragEnd();
            }
        });

        window.addEventListener("pointercancel", function () {
            if (isDragging) onDragEnd();
        });

        // Touch Fallback
        slideUnlockThumb.addEventListener("touchstart", function (e) {
            if (e.touches && e.touches.length > 0) {
                onDragStart(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener("touchmove", function (e) {
            if (isDragging && e.touches && e.touches.length > 0) {
                onDragMove(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener("touchend", function () {
            if (isDragging) onDragEnd();
        });

        // Prevent pull-to-refresh or page drag on security overlays
        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.addEventListener("touchmove", function (e) {
                if (!isDragging) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        if (countdownOverlay) {
            countdownOverlay.addEventListener("touchmove", function (e) {
                e.preventDefault();
            }, { passive: false });
        }
    }

    // Register PWA Service Worker
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("./sw.js?v=44").then(function (reg) {
                reg.update();
            }).catch(function () { });
        });
    }

    function checkKurtKapaniPersistentLock() {
        try {
            const isLocked = localStorage.getItem(STORAGE_KURT_LOCK_KEY);
            if (isLocked === "locked") {
                enterKurtKapaniMode(false);
            } else {
                document.body.classList.remove("countdown-screen-active", "kurt-screen-active", "unlocked-screen-active");
                document.documentElement.classList.remove("kurt-locked-boot", "kurt-screen-active");
                if (deviceWrapper) {
                    deviceWrapper.style.display = "";
                }
                if (kurtKapaniOverlay) {
                    kurtKapaniOverlay.classList.remove("active");
                    kurtKapaniOverlay.style.display = "none";
                    kurtKapaniOverlay.setAttribute("aria-hidden", "true");
                }
                if (countdownOverlay) {
                    countdownOverlay.classList.remove("active", "fading-out");
                    countdownOverlay.style.display = "none";
                    countdownOverlay.setAttribute("aria-hidden", "true");
                }
                stopDragonVideo();
                stopKurtDragonVideo();
            }
        } catch (e) { }
    }

    window.addEventListener("DOMContentLoaded", checkKurtKapaniPersistentLock);
    window.addEventListener("load", function () {
        try {
            if (localStorage.getItem(STORAGE_KURT_LOCK_KEY) === "locked") {
                if (!isKurtKapaniActive) {
                    enterKurtKapaniMode(false);
                } else {
                    startKurtDragonVideo();
                }
            }
        } catch (e) { }
    });
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            try {
                if (localStorage.getItem(STORAGE_KURT_LOCK_KEY) === "locked") {
                    if (!isKurtKapaniActive) {
                        enterKurtKapaniMode(false);
                    } else {
                        startKurtDragonVideo();
                    }
                }
            } catch (e) { }
        }
    });

    initMobileKeyboardHandler();
    loadSavedSettings();
    applySettings();
    loadChatHistory();
    updateSendButton();
    checkKurtKapaniPersistentLock();

})();
