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
    const slideUnlockWrapper = document.getElementById("slideUnlockWrapper");
    const slideUnlockTrack = document.getElementById("slideUnlockTrack");
    const slideUnlockThumb = document.getElementById("slideUnlockThumb");
    const slideUnlockText = document.getElementById("slideUnlockText");

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
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.04);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) { }
    }

    /**
     * Synthesize Apple iOS Lockdown Alert Sound
     */
    function playLockdownSound() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Deep warning chord
            [220, 164.8, 110].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);

                gain.gain.setValueAtTime(0, now + idx * 0.12);
                gain.gain.linearRampToValueAtTime(0.24, now + idx * 0.12 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.45);
            });
        } catch (e) { }
    }

    /**
     * Synthesize Apple Pay / FaceID Style Unlock Chime
     */
    function playUnlockChime() {
        if (!settings.sound) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Pure uplifting chime (C6 -> G6)
            const freqs = [1046.5, 1567.98];
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
        getAudioContext();

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
        getAudioContext();

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

    /**
     * Smooth scroll chat to the bottom
     */
    function scrollToBottom() {
        setTimeout(() => {
            chatViewport.scrollTo({
                top: chatViewport.scrollHeight,
                behavior: settings.animations ? "smooth" : "auto"
            });
        }, 30);
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

        function updateViewportMetrics() {
            const winH = window.innerHeight;
            const vpHeight = vv ? vv.height : winH;
            const vpOffsetTop = vv ? vv.offsetTop : 0;
            // Virtual keyboard height detection
            const keyboardHeight = Math.max(0, winH - vpHeight - vpOffsetTop);
            const activeInput = (document.activeElement === questionInput || document.activeElement === petitionInput);
            const keyboardActive = isFocused || activeInput || keyboardHeight > 80;

            document.documentElement.style.setProperty("--app-height", `${vpHeight}px`);
            document.documentElement.style.setProperty("--viewport-offset-top", `${vpOffsetTop}px`);
            document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);

            if (keyboardActive) {
                document.body.classList.add("keyboard-open");
                scrollToBottom();
            } else {
                document.body.classList.remove("keyboard-open");
            }

            // Strictly keep document window scroll locked at (0, 0)
            if (window.scrollY !== 0 || window.scrollX !== 0) {
                window.scrollTo(0, 0);
            }
            if (document.body && document.body.scrollTop !== 0) {
                document.body.scrollTop = 0;
            }
            if (document.documentElement && document.documentElement.scrollTop !== 0) {
                document.documentElement.scrollTop = 0;
            }
        }

        if (vv) {
            vv.addEventListener("resize", updateViewportMetrics);
            vv.addEventListener("scroll", updateViewportMetrics);
        } else {
            window.addEventListener("resize", updateViewportMetrics);
        }

        window.addEventListener("orientationchange", function () {
            setTimeout(updateViewportMetrics, 150);
        });

        // Prevent body/window scroll shifting so the top ATA header never moves out of frame
        window.addEventListener("scroll", function () {
            if (window.scrollY !== 0 || window.scrollX !== 0) {
                window.scrollTo(0, 0);
            }
        }, { passive: false });

        [questionInput, petitionInput].forEach(function (input) {
            if (!input) return;

            input.addEventListener("focus", function () {
                isFocused = true;
                document.body.classList.add("keyboard-open");

                // Execute updates across keyboard transition
                updateViewportMetrics();
                setTimeout(updateViewportMetrics, 50);
                setTimeout(updateViewportMetrics, 120);
                setTimeout(updateViewportMetrics, 250);
                setTimeout(updateViewportMetrics, 380);

                scrollToBottom();
            });

            input.addEventListener("blur", function () {
                // Delay to allow focus to switch between Soru and Rica without jumping
                setTimeout(function () {
                    const active = document.activeElement;
                    if (active !== questionInput && active !== petitionInput) {
                        isFocused = false;
                        updateViewportMetrics();
                        setTimeout(updateViewportMetrics, 180);
                    }
                }, 80);
            });
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
    // KURT KAPANI & SECURITY COUNTDOWN CONTROLLER
    // =========================================================================

    /**
     * Start the 10-second iOS Security Countdown
     */
    function startCountdown() {
        if (isKurtKapaniActive) return;
        // If countdown is already actively running, DO NOT restart or glitch back to 10
        if (isCountingDown && countdownInterval) return;

        isCountingDown = true;
        updateSendButton();

        if (countdownStartTimeout) {
            clearTimeout(countdownStartTimeout);
            countdownStartTimeout = null;
        }

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        let secondsLeft = 10;
        if (countdownNumber) {
            countdownNumber.textContent = secondsLeft;
            countdownNumber.classList.remove("tick-pop");
        }
        if (countdownProgressBar) {
            countdownProgressBar.style.transition = "none";
            countdownProgressBar.style.width = "100%";
            void countdownProgressBar.offsetWidth; // Force reflow
            countdownProgressBar.style.transition = "width 1s linear";
        }

        if (countdownOverlay) {
            countdownOverlay.classList.add("active");
            countdownOverlay.setAttribute("aria-hidden", "false");
        }
        playCountdownTick();

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
                countdownProgressBar.style.width = Math.max(0, secondsLeft * 10) + "%";
            }

            playCountdownTick();

            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                isCountingDown = false;

                setTimeout(() => {
                    if (countdownOverlay) {
                        countdownOverlay.classList.remove("active");
                        countdownOverlay.setAttribute("aria-hidden", "true");
                    }
                    enterKurtKapaniMode();
                }, 350);
            }
        }, 1000);
    }

    /**
     * Enter Kurt Kapanı Lockout Mode
     */
    function enterKurtKapaniMode(playSound = true) {
        isKurtKapaniActive = true;
        isCountingDown = false;
        isSending = false;
        unlockTapCount = 0;

        // Persist lockdown state in localStorage so closing/reopening the app keeps it locked
        try {
            localStorage.setItem(STORAGE_KURT_LOCK_KEY, "locked");
        } catch (e) { }
        document.documentElement.classList.add("kurt-locked-boot");
        document.body.classList.add("kurt-locked-boot");

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (countdownStartTimeout) {
            clearTimeout(countdownStartTimeout);
            countdownStartTimeout = null;
        }

        // Blur and disable inputs
        if (questionInput) {
            questionInput.blur();
            questionInput.disabled = true;
        }
        if (petitionInput) {
            petitionInput.blur();
            petitionInput.disabled = true;
        }
        updateSendButton();

        // Close any open modals
        if (settingsModal) settingsModal.classList.remove("active");
        if (infoModal) infoModal.classList.remove("active");
        if (iosAlert) iosAlert.classList.remove("active");

        // Reset slide unlock track state
        if (slideUnlockWrapper) {
            slideUnlockWrapper.classList.remove("revealed");
        }
        if (slideUnlockThumb) {
            slideUnlockThumb.style.transform = "translateX(0px)";
        }
        if (slideUnlockText) {
            slideUnlockText.style.opacity = "1";
        }

        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.classList.add("active");
            kurtKapaniOverlay.setAttribute("aria-hidden", "false");
        }

        if (playSound) {
            playLockdownSound();
        }
    }

    /**
     * Exit Kurt Kapanı Mode (Unlocked via Secret Double-Tap + Slide Right)
     */
    function exitKurtKapaniMode() {
        if (!isKurtKapaniActive) return;
        isKurtKapaniActive = false;
        isCountingDown = false;
        isSending = false;
        failedAttemptsCount = 0;
        unlockTapCount = 0;

        // Remove persistent lockdown state from localStorage
        try {
            localStorage.removeItem(STORAGE_KURT_LOCK_KEY);
        } catch (e) { }
        document.documentElement.classList.remove("kurt-locked-boot");
        document.body.classList.remove("kurt-locked-boot");

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
            slideUnlockThumb.style.transform = "translateX(0px)";
        }
        if (slideUnlockText) {
            slideUnlockText.style.opacity = "1";
        }

        if (kurtKapaniOverlay) {
            kurtKapaniOverlay.classList.remove("active");
            kurtKapaniOverlay.setAttribute("aria-hidden", "true");
        }

        playUnlockChime();
        showAlert("Kilit Açıldı", "α1Q v2.0 başarıyla devre dışı bırakıldı. ATA ANS kullanıma hazır.");
    }

    /**
     * Secret Double-Tap Listener on Wolf Avatar Badge
     */
    if (secretUnlockTrigger) {
        secretUnlockTrigger.addEventListener("click", function (e) {
            if (!isKurtKapaniActive) return;
            const now = Date.now();

            if (now - lastUnlockTapTime < 500) {
                unlockTapCount++;
            } else {
                unlockTapCount = 1;
            }
            lastUnlockTapTime = now;

            if (unlockTapCount >= 2) {
                // Secret Double-Tap triggered! Reveal the Slide-to-Unlock track!
                unlockTapCount = 0;
                if (slideUnlockWrapper) {
                    slideUnlockWrapper.classList.add("revealed");
                }
                playReceivedSound();
            }
        });
    }

    /**
     * Slide to Unlock Drag Controller (Pointer, Touch & Mouse)
     */
    if (slideUnlockThumb && slideUnlockTrack) {
        let isDragging = false;
        let startX = 0;
        let currentTranslateX = 0;

        function getMaxDrag() {
            const trackWidth = slideUnlockTrack.getBoundingClientRect().width;
            const thumbWidth = slideUnlockThumb.getBoundingClientRect().width || 44;
            return Math.max(10, trackWidth - thumbWidth - 8);
        }

        function onDragStart(clientX) {
            if (!isKurtKapaniActive) return;
            isDragging = true;
            startX = clientX;
            currentTranslateX = 0;
            slideUnlockThumb.style.transition = "none";
        }

        function onDragMove(clientX) {
            if (!isDragging) return;
            const deltaX = clientX - startX;
            const maxDrag = getMaxDrag();
            currentTranslateX = Math.max(0, Math.min(maxDrag, deltaX));

            slideUnlockThumb.style.transform = `translateX(${currentTranslateX}px)`;

            if (slideUnlockText) {
                const progress = currentTranslateX / maxDrag;
                slideUnlockText.style.opacity = Math.max(0, 1 - progress * 1.5).toString();
            }
        }

        function onDragEnd() {
            if (!isDragging) return;
            isDragging = false;
            const maxDrag = getMaxDrag();

            // Threshold: 78% of track length reached to unlock
            if (currentTranslateX >= maxDrag * 0.78) {
                slideUnlockThumb.style.transition = "transform 0.15s ease-out";
                slideUnlockThumb.style.transform = `translateX(${maxDrag}px)`;
                if (slideUnlockText) slideUnlockText.style.opacity = "0";

                setTimeout(() => {
                    exitKurtKapaniMode();
                }, 160);
            } else {
                // Snap back with spring
                slideUnlockThumb.style.transition = "transform 0.28s var(--spring-easing)";
                slideUnlockThumb.style.transform = "translateX(0px)";
                if (slideUnlockText) {
                    slideUnlockText.style.transition = "opacity 0.28s ease";
                    slideUnlockText.style.opacity = "1";
                    setTimeout(() => {
                        if (slideUnlockText) slideUnlockText.style.transition = "";
                    }, 280);
                }
                setTimeout(() => {
                    slideUnlockThumb.style.transition = "";
                }, 280);
            }
        }

        // Pointer Events (Unified modern mouse + touch)
        slideUnlockThumb.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            try { slideUnlockThumb.setPointerCapture(e.pointerId); } catch (err) { }
            onDragStart(e.clientX);
        });

        slideUnlockThumb.addEventListener("pointermove", function (e) {
            if (isDragging) {
                e.preventDefault();
                onDragMove(e.clientX);
            }
        });

        slideUnlockThumb.addEventListener("pointerup", function (e) {
            if (isDragging) {
                try { slideUnlockThumb.releasePointerCapture(e.pointerId); } catch (err) { }
                onDragEnd();
            }
        });

        slideUnlockThumb.addEventListener("pointercancel", function () {
            if (isDragging) onDragEnd();
        });

        // Touch events fallback for older mobile browsers
        slideUnlockThumb.addEventListener("touchstart", function (e) {
            if (e.touches.length > 0) {
                onDragStart(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener("touchmove", function (e) {
            if (isDragging && e.touches.length > 0) {
                e.preventDefault();
                onDragMove(e.touches[0].clientX);
            }
        }, { passive: false });

        window.addEventListener("touchend", function () {
            if (isDragging) onDragEnd();
        });

        // Prevent any page drag or rubber-band bounce on security overlays
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
            navigator.serviceWorker.register("./sw.js").catch(function () { });
        });
    }

    function checkKurtKapaniPersistentLock() {
        try {
            const isLocked = localStorage.getItem(STORAGE_KURT_LOCK_KEY);
            if (isLocked === "locked") {
                enterKurtKapaniMode(false);
            }
        } catch (e) { }
    }

    initMobileKeyboardHandler();
    loadSavedSettings();
    applySettings();
    loadChatHistory();
    updateSendButton();
    checkKurtKapaniPersistentLock();

})();
