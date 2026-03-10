const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Logic
    const navItems = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');
    let dreams = []; // Global scope within DOMContentLoaded

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');

            // SECURITY INTERCEPT - Only for vault-view now
            if (target === 'vault-view' && checkLock(target)) {
                pendingViewTarget = target;
                return;
            }

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => {
                view.classList.remove('active-view');
                view.classList.add('hidden');
            });

            // Set clicked item to active
            item.classList.add('active');
            const targetView = document.getElementById(target);

            targetView.classList.remove('hidden');
            targetView.classList.add('active-view');

            // Fetch data based on view
            if (target === 'journal-view') fetchDreams();
            if (target === 'insights-view') fetchInsights();
            if (target === 'vault-view') fetchVaultDreams();
        });
    });

    // 1.5 Security & Lock Logic
    let isLocked = localStorage.getItem('dream_lock_enabled') === 'true';
    let currentPin = localStorage.getItem('dream_lock_pin') || '0000';
    let enteredPin = '';

    const lockScreen = document.getElementById('app-lock-screen');
    const pinDisplay = document.getElementById('pin-display');
    const lockStatusText = document.getElementById('lock-status-text');

    // intercept view switching if locked
    function checkLock(targetViewId) {
        if (targetViewId === 'vault-view') {
            showLockScreen();
            return true;
        }
        return false;
    }

    let pendingViewTarget = null;

    function showLockScreen(message = 'Vault Entry Required') {
        enteredPin = '';
        updatePinDisplay();
        document.getElementById('lock-instruction').textContent = message;
        lockScreen.classList.remove('hidden');
    }

    function updatePinDisplay() {
        const dots = enteredPin.padEnd(4, '_').split('').join(' ');
        pinDisplay.textContent = dots;
    }

    let pendingUnlockId = null;

    function handlePinInput(num) {
        if (enteredPin.length < 4) {
            enteredPin += num;
            updatePinDisplay();
            if (enteredPin.length === 4) {
                if (enteredPin === currentPin) {
                    lockScreen.classList.add('hidden');
                    enteredPin = '';

                    if (pendingUnlockId) {
                        updateDreamLockState(pendingUnlockId, false);
                        pendingUnlockId = null;
                    }

                    if (pendingViewTarget) {
                        // Switch to the pending view
                        switchToView(pendingViewTarget);
                        pendingViewTarget = null;
                    }
                } else {
                    // Neutral feedback as per user request
                    document.getElementById('lock-instruction').textContent = 'Please enter correct PIN';
                    setTimeout(() => {
                        enteredPin = '';
                        updatePinDisplay();
                    }, 500);
                }
            }
        }
    }

    function switchToView(target) {
        navItems.forEach(nav => nav.classList.remove('active'));
        views.forEach(view => {
            view.classList.remove('active-view');
            view.classList.add('hidden');
        });

        const item = document.querySelector(`[data-target="${target}"]`);
        if (item) item.classList.add('active');

        const targetView = document.getElementById(target);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('active-view');
        }

        if (target === 'journal-view') fetchDreams();
        if (target === 'insights-view') fetchInsights();
        if (target === 'vault-view') {
            updateSecurityUI();
            fetchVaultDreams();
        }
    }

    // Initialize Security UI
    updateSecurityUI();

    function updateSecurityUI() {
        // Vault is inherently protected by navigating to it
        currentPin = localStorage.getItem('dream_lock_pin') || '0000';
    }

    // Vault Menu Logic
    const btnVaultMenu = document.getElementById('btn-vault-menu');
    const vaultDropdown = document.getElementById('vault-dropdown');
    const menuUpdatePin = document.getElementById('menu-update-pin');
    const pinUpdateSection = document.getElementById('pin-update-section');

    if (btnVaultMenu) {
        btnVaultMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            vaultDropdown.classList.toggle('show');
        });
    }

    if (menuUpdatePin) {
        menuUpdatePin.addEventListener('click', () => {
            pinUpdateSection.classList.toggle('hidden');
            vaultDropdown.classList.remove('show');
        });
    }

    // Close dropdown on click outside
    window.addEventListener('click', () => {
        if (vaultDropdown) vaultDropdown.classList.remove('show');
    });

    document.getElementById('btn-save-pin').addEventListener('click', () => {
        const pinInput = /** @type {HTMLInputElement} */ (document.getElementById('new-pin'));
        if (pinInput.value.length === 4) {
            currentPin = pinInput.value;
            localStorage.setItem('dream_lock_pin', currentPin);
            pinInput.value = '';
            showToast('Password Updated!');
            pinUpdateSection.classList.add('hidden');
        } else {
            alert('PIN must be 4 digits');
        }
    });

    // Toast Logic
    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
        container.appendChild(toast);

        // trigger reflow
        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // PIN Pad Listeners
    document.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.textContent;
            if (val >= '0' && val <= '9') {
                handlePinInput(val);
            }
        });
    });

    document.getElementById('btn-pin-del').addEventListener('click', () => {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDisplay();
    });

    // Initialize Security PIN
    updateSecurityUI();

    // 1.8 Rich Text Editor Logic
    const dreamEditor = document.getElementById('dream-editor');
    const toolbarButtons = document.querySelectorAll('.editor-toolbar button');

    if (toolbarButtons) {
        toolbarButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.getAttribute('data-command');
                document.execCommand(command, false, null);
                if (dreamEditor) dreamEditor.focus();

                // Toggle active state for simple buttons
                if (['bold', 'italic', 'underline', 'strikeThrough'].includes(command)) {
                    btn.classList.toggle('active');
                }
            });
        });
    }

    // Update active state of buttons based on selection
    if (dreamEditor) {
        dreamEditor.addEventListener('keyup', updateToolbarStates);
        dreamEditor.addEventListener('mouseup', updateToolbarStates);
        dreamEditor.addEventListener('click', updateToolbarStates);
    }

    function updateToolbarStates() {
        toolbarButtons.forEach(btn => {
            const command = btn.getAttribute('data-command');
            if (['bold', 'italic', 'underline', 'strikeThrough'].includes(command)) {
                if (document.queryCommandState(command)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    // 2. Capture Dream Form Submission
    const form = document.getElementById('dream-form');
    const feedback = document.getElementById('capture-feedback');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editor = document.getElementById('dream-editor');
            const input = editor.innerHTML.trim();
            if (!input || input === editor.getAttribute('placeholder')) return;

            // Show loading state
            feedback.classList.remove('hidden');
            feedback.querySelector('p').textContent = 'Analyzing dream patterns...';

            try {
                const res = await fetch(`${API_URL}/dreams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description: input })
                });

                if (res.ok) {
                    feedback.innerHTML = '<i class="fa-solid fa-check" style="font-size: 2rem; color: #3a86ff; margin-bottom: 1rem;"></i><p>Dream successfully captured!</p>';
                    editor.innerHTML = '';
                    setTimeout(() => {
                        feedback.classList.add('hidden');
                        feedback.innerHTML = '<div class="spinner"></div><p>Uncovering themes & emotions...</p>';
                    }, 1500); // Faster cleanup for a smoother feel
                } else {
                    throw new Error('Failed to save');
                }
            } catch (err) {
                feedback.innerHTML = '<p style="color: #ff006e;">Error saving dream. Please try again.</p>';
                setTimeout(() => feedback.classList.add('hidden'), 3000);
            }
        });
    }

    // 3. SEAMLESS Live Voice Transcription
    const btnVoice = document.getElementById('btn-voice');
    const recorderOverlay = document.getElementById('recorder-overlay');
    const btnStop = document.getElementById('btn-stop-record');
    const btnCancel = document.getElementById('btn-cancel-record');
    const recordTimer = document.getElementById('record-timer');
    const transcribeStatus = document.getElementById('transcribe-status');
    const dreamEditorInput = document.getElementById('dream-editor');

    let recognition;
    let startTime;
    let timerInterval;
    let finalTranscript = '';

    const SpeechRecognition = (/** @type {any} */ (window)).SpeechRecognition || (/** @type {any} */ (window)).webkitSpeechRecognition;

    btnVoice.addEventListener('click', () => {
        if (!SpeechRecognition) {
            alert('Your browser does not support voice recording. Please use Chrome or Edge.');
            return;
        }
        startLiveRecording();
    });

    function startLiveRecording() {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        finalTranscript = dreamEditorInput && dreamEditorInput.innerHTML ? dreamEditorInput.innerHTML + ' ' : '';

        recognition.onstart = () => {
            showRecorderUI();
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // Update the editor live as they speak
            if (dreamEditorInput) {
                dreamEditorInput.innerHTML = (finalTranscript + interimTranscript).trim();
                dreamEditorInput.dispatchEvent(new Event('input'));
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopUI();
        };

        recognition.onend = () => {
            stopUI();
        };

        recognition.start();
    }

    function showRecorderUI() {
        recorderOverlay.classList.remove('hidden');
        transcribeStatus.classList.remove('hidden');
        transcribeStatus.querySelector('p').textContent = 'Listening live...';
        startTime = Date.now();
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        recordTimer.textContent = `${mins}:${secs}`;
    }

    function stopUI() {
        clearInterval(timerInterval);
        recorderOverlay.classList.add('hidden');
    }

    btnStop.addEventListener('click', () => {
        if (recognition) {
            recognition.stop();
        }
    });

    btnCancel.addEventListener('click', () => {
        if (recognition) {
            // If they cancel, we don't clear what was already typed
            recognition.stop();
        }
    });

    // 4. Load & Search Journal
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        fetchDreams(/** @type {HTMLInputElement} */(e.target).value);
    });

    async function fetchDreams(query = '') {
        const grid = document.getElementById('journal-list');
        grid.innerHTML = '<p style="color: var(--text-muted); padding: 1rem">Loading dreams...</p>';

        try {
            const url = query ? `${API_URL}/dreams?q=${encodeURIComponent(query)}` : `${API_URL}/dreams`;
            const res = await fetch(url);
            dreams = await res.json();

            // JOURNAL FILTER: Only show public dreams (isLocked = false)
            const publicDreams = dreams.filter(d => d.isLocked !== true);

            if (publicDreams.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-muted); padding: 1rem">No public dreams found.</p>';
                return;
            }

            grid.innerHTML = publicDreams.map(dream => `
                <div class="dream-card" data-id="${dream.id}" 
                    data-desc="${dream.description.replace(/"/g, '&quot;')}"
                    data-themes="${dream.themes.join(', ')}"
                    data-emotions="${dream.emotions.join(', ')}">
                    
                    <span class="date"><i class="fa-regular fa-clock"></i> ${new Date(dream.date).toLocaleString()}</span>
                    <p class="desc">"${dream.description}"</p>
                    <div class="tags">
                        ${dream.themes.map(t => `<span class="tag theme"><i class="fa-solid fa-moon"></i> ${t}</span>`).join('')}
                        ${dream.emotions.map(e => `<span class="tag emotion"><i class="fa-solid fa-heart"></i> ${e}</span>`).join('')}
                    </div>

                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditModal('${dream.id}', this)"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn-delete" onclick="deleteDream('${dream.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                        <button class="btn-lock-toggle" onclick="toggleDreamLock('${dream.id}', false)">
                            <i class="fa-solid fa-vault"></i> Move to Vault
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            grid.innerHTML = '<p style="color: #ff006e; padding: 1rem">Error loading journal.</p>';
        }
    }

    // VAULT SEARCH
    const vaultSearchInput = document.getElementById('vault-search-input');
    if (vaultSearchInput) {
        vaultSearchInput.addEventListener('input', (e) => {
            fetchVaultDreams(/** @type {HTMLInputElement} */(e.target).value);
        });
    }

    async function fetchVaultDreams(query = '') {
        const grid = document.getElementById('vault-list');
        if (!grid) return;
        grid.innerHTML = '<p style="color: var(--text-muted); padding: 1rem">Unlocking vault...</p>';

        try {
            const url = query ? `${API_URL}/dreams?q=${encodeURIComponent(query)}` : `${API_URL}/dreams`;
            const res = await fetch(url);
            dreams = await res.json();

            // VAULT FILTER: Only show private dreams (isLocked = true)
            const privateDreams = dreams.filter(d => d.isLocked === true);

            if (privateDreams.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-muted); padding: 1rem">Your vault is empty. Move dreams here to secure them.</p>';
                return;
            }

            grid.innerHTML = privateDreams.map(dream => `
                <div class="dream-card locked-card" data-id="${dream.id}" 
                    data-desc="${dream.description.replace(/"/g, '&quot;')}"
                    data-themes="${dream.themes.join(', ')}"
                    data-emotions="${dream.emotions.join(', ')}">
                    
                    <span class="date"><i class="fa-regular fa-clock"></i> ${new Date(dream.date).toLocaleString()}</span>
                    <p class="desc">"${dream.description}"</p>
                    <div class="tags">
                        ${dream.themes.map(t => `<span class="tag theme"><i class="fa-solid fa-moon"></i> ${t}</span>`).join('')}
                        ${dream.emotions.map(e => `<span class="tag emotion"><i class="fa-solid fa-heart"></i> ${e}</span>`).join('')}
                    </div>

                    <div class="card-actions">
                        <button class="btn-delete" onclick="deleteDream('${dream.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                        <button class="btn-lock-toggle" onclick="toggleDreamLock('${dream.id}', true)">
                            <i class="fa-solid fa-arrow-rotate-left"></i> Restore to Journal
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            grid.innerHTML = '<p style="color: #ff006e; padding: 1rem">Error loading vault.</p>';
        }
    }

    // 5. Load Insights
    async function fetchInsights() {
        const list = document.getElementById('top-themes-list');
        const noInsights = document.getElementById('no-insights');

        try {
            const res = await fetch(`${API_URL}/stats`);
            const data = await res.json();

            if (data.topThemes && data.topThemes.length > 0) {
                noInsights.classList.add('hidden');
                list.style.display = 'block';
                list.innerHTML = data.topThemes.map((theme, idx) => `
                    <li onclick="filterByTheme('${theme.name}')" style="cursor: pointer;">
                        <span><strong>#${idx + 1}</strong> ${theme.name}</span>
                        <span style="color: var(--text-muted)">${theme.count} instances</span>
                    </li>
                `).join('');
            } else {
                list.style.display = 'none';
                noInsights.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Error fetching stats');
        }
    }

    // 6. Edit & Delete Logic (Global for ease of use)
    window['openEditModal'] = function (id, btnElement) {
        const card = btnElement.closest('.dream-card');
        const desc = card.getAttribute('data-desc');
        const themes = card.getAttribute('data-themes') || '';
        const emotions = card.getAttribute('data-emotions') || '';

        /** @type {HTMLInputElement} */ (document.getElementById('edit-dream-id')).value = id;
        /** @type {HTMLInputElement} */ (document.getElementById('edit-dream-input')).value = desc;
        /** @type {HTMLInputElement} */ (document.getElementById('edit-themes-input')).value = themes;
        /** @type {HTMLInputElement} */ (document.getElementById('edit-emotions-input')).value = emotions;

        document.getElementById('edit-modal').classList.remove('hidden');
    };

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('edit-modal').classList.add('hidden');
    });

    document.getElementById('edit-dream-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = /** @type {HTMLInputElement} */ (document.getElementById('edit-dream-id')).value;
        const newDesc = /** @type {HTMLInputElement} */ (document.getElementById('edit-dream-input')).value;
        const themesStr = /** @type {HTMLInputElement} */ (document.getElementById('edit-themes-input')).value;
        const emotionsStr = /** @type {HTMLInputElement} */ (document.getElementById('edit-emotions-input')).value;

        // Convert comma-separated strings to arrays
        const themes = themesStr.split(',').map(s => s.trim()).filter(s => s !== '');
        const emotions = emotionsStr.split(',').map(s => s.trim()).filter(s => s !== '');

        try {
            const res = await fetch(`${API_URL}/dreams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: newDesc,
                    themes: themes,
                    emotions: emotions
                })
            });

            if (res.ok) {
                document.getElementById('edit-modal').classList.add('hidden');
                // Refresh the list if we are on the journal view
                const isJournalActive = document.getElementById('journal-view').classList.contains('active-view');
                if (isJournalActive) fetchDreams(/** @type {HTMLInputElement} */(document.getElementById('search-input')).value);
                fetchInsights();
            }
        } catch (err) {
            console.error('Update failed');
        }
    });

    window['deleteDream'] = async function (id) {
        try {
            const res = await fetch(`${API_URL}/dreams/${id}`, { method: 'DELETE' });
            if (res.ok) {
                const isJournalActive = document.getElementById('journal-view').classList.contains('active-view');
                if (isJournalActive) fetchDreams(/** @type {HTMLInputElement} */(document.getElementById('search-input')).value);
                fetchInsights();
            }
        } catch (err) {
            console.error('Delete failed');
        }
    };
    window['filterByTheme'] = (themeName) => {
        // 1. Switch to Journal View
        const journalTab = /** @type {HTMLElement} */ (document.querySelector('[data-target="journal-view"]'));
        if (journalTab) journalTab.click();

        // 2. Set search input and fetch
        const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('search-input'));
        if (searchInput) {
            searchInput.value = themeName;
            fetchDreams(themeName);
        }
    };

    window['toggleDreamLock'] = async function (id, isCurrentlyLocked) {
        if (!isCurrentlyLocked) {
            // Locking doesn't require PIN, just set it
            await updateDreamLockState(id, true);
        } else {
            // Unlocking requires PIN
            pendingUnlockId = id;
            showLockScreen();
        }
    };

    window['unlockSingleDream'] = function (id) {
        pendingUnlockId = id;
        showLockScreen();
    };

    async function updateDreamLockState(id, shouldLock) {
        const dream = dreams.find(d => d.id === id);
        if (!dream) return;

        try {
            await fetch(`${API_URL}/dreams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: dream.description,
                    isLocked: shouldLock
                })
            });
            const isVaultActive = document.getElementById('vault-view').classList.contains('active-view');
            if (isVaultActive) fetchVaultDreams(/** @type {HTMLInputElement} */(document.getElementById('vault-search-input')).value);
            fetchDreams(/** @type {HTMLInputElement} */(document.getElementById('search-input')).value); // Refresh list
        } catch (err) {
            console.error('Lock toggle failed');
        }
    }

    // handlePinInput now handles both app-wide and single dream unlocks
});
