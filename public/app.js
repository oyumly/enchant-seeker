document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('enchantments-grid');
    const btnAction = document.getElementById('btn-action');
    const btnClear = document.getElementById('btn-clear');
    const statusText = document.getElementById('status-text');
    const offHandEl = document.getElementById('off-hand');
    const mainHandEl = document.getElementById('main-hand');
    const axeDropdown = document.getElementById('axe-dropdown');
    const searchInput = document.getElementById('search-input');
    const langToggleBtn = document.getElementById('lang-toggle');
    const versionSelect = document.getElementById('version-select');

    let currentLang = 'ru';
    let currentVersion = parseFloat(versionSelect.value);
    let enchantmentsData = [];
    let isBotRunning = false;
    let searchQuery = '';
    const selections = {};

    // Глобальная подсказка, следующая за курсором мыши
    const globalTooltip = document.createElement('div');
    globalTooltip.className = 'slot-tooltip';
    document.body.appendChild(globalTooltip);

    fetch('/api/enchants')
        .then(res => res.json())
        .then(data => {
            enchantmentsData = data;
            renderGrid();
        })
        .catch(err => console.error("Failed to load enchantments", err));

    setInterval(updateStatus, 2000);
    updateStatus();
    updateUIText(); // Call once on load to set initial Russian texts

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'ru' : 'en';
            langToggleBtn.textContent = currentLang.toUpperCase();
            updateUIText();
            renderGrid();
            renderLogs();
        });
    }

    // Version select toggle
    if (versionSelect) {
        versionSelect.addEventListener('change', (e) => {
            currentVersion = parseFloat(e.target.value);
            for (const id in selections) {
                const ench = enchantmentsData.find(e => e.id === id);
                if (ench && currentVersion < ench.minVersion) {
                    delete selections[id];
                }
            }
            renderGrid();
        });
    }

    function updateUIText() {
        const terminalTitleText = document.querySelector('#terminal-title span');
        if (currentLang === 'en') {
            searchInput.placeholder = "Search enchantments...";
            btnAction.textContent = isBotRunning ? "■ STOP SEARCH" : "▶ START SEARCH";
            btnClear.title = "Clear Logs";
            btnClear.textContent = "✕";
            if (terminalTitleText) terminalTitleText.textContent = "Bot Live Logs";
            if (statusText) {
                statusText.textContent = isBotRunning ? 'Rerolling' : 'Stopped';
            }
        } else {
            searchInput.placeholder = "Поиск зачарований...";
            btnAction.textContent = isBotRunning ? "■ ЗАКОНЧИТЬ ПОИСК" : "▶ НАЧАТЬ ПОИСК";
            btnClear.title = "Очистить логи";
            btnClear.textContent = "✕";
            if (terminalTitleText) terminalTitleText.textContent = "Логи бота";
            if (statusText) {
                statusText.textContent = isBotRunning ? 'В процессе' : 'Остановлен';
            }
        }
    }

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderGrid();
    });

    let logsData = [];

    btnClear.addEventListener('click', () => {
        logsData = [];
        renderLogs();
    });

    const terminalBody = document.getElementById('terminal-body');
    const evtSource = new EventSource('/api/logs');
    
    evtSource.onerror = (err) => {
        console.error("EventSource failed:", err);
    };
    
    evtSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        data.timestamp = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        logsData.push(data);
        if (logsData.length > 200) logsData.shift();
        
        const logEl = createLogElement(data);
        terminalBody.appendChild(logEl);
        terminalBody.scrollTop = terminalBody.scrollHeight;

        while (terminalBody.children.length > 200) {
            terminalBody.removeChild(terminalBody.firstChild);
        }
    };

    function renderLogs() {
        terminalBody.innerHTML = '';
        logsData.forEach(data => {
            const logEl = createLogElement(data);
            terminalBody.appendChild(logEl);
        });
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    const axeTranslations = {
        'wooden_axe': { en: 'Wooden Axe', ru: 'Деревянный топор' },
        'stone_axe': { en: 'Stone Axe', ru: 'Каменный топор' },
        'iron_axe': { en: 'Iron Axe', ru: 'Железный топор' },
        'golden_axe': { en: 'Golden Axe', ru: 'Золотой топор' },
        'diamond_axe': { en: 'Diamond Axe', ru: 'Алмазный топор' },
        'netherite_axe': { en: 'Netherite Axe', ru: 'Незеритовый топор' }
    };

    function createLogElement(data) {
        const logEl = document.createElement('div');
        logEl.className = `log-entry ${data.type || ''}`;
        
        const tsHtml = data.timestamp ? `<span style="color: var(--lotus-gray); margin-right: 6px; font-size: 1rem; font-weight: normal;">[${data.timestamp}]</span>` : '';
        
        if (data.type === 'system') {
            if (data.action === 'equip_axe') {
                const axeHum = data.axeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const translatedAxe = axeTranslations[data.axeName] ? axeTranslations[data.axeName][currentLang] : axeHum;
                const sysText = currentLang === 'en' ? `Equipped axe: ${translatedAxe}` : `Экипирован топор: ${translatedAxe}`;
                logEl.innerHTML = `${tsHtml}[System] ${sysText}`;
            } else if (data.action === 'start_rerolling') {
                logEl.className = 'log-entry seek';
                const targetsText = data.targets.map(t => {
                    const key = t.enchant.replace('minecraft:', '');
                    const roman = ["", "I", "II", "III", "IV", "V"][t.level] || t.level;
                    const enchObj = enchantmentsData.find(e => e.id === `minecraft:${key}`);
                    const name = enchObj ? (currentLang === 'en' ? enchObj.nameEn : enchObj.nameRu) : key;
                    return `${name} ${roman}`.trim();
                }).join(', ');
                const seekText = currentLang === 'en' ? 'SEEKING' : 'ИЩЕМ';
                
                logEl.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem; width: 100%;">
                        ${tsHtml}
                        <img src="assets/seek.png" class="log-book-icon" alt="">
                        <span>${seekText}: <span style="color: var(--lotus-violet);">${targetsText}</span></span>
                    </div>
                `;
            } else if (data.action === 'connected') {
                const sysText = currentLang === 'en' ? 'Terminal connected to bot logs.' : 'Терминал подключен к логам бота.';
                logEl.innerHTML = `${tsHtml}[System] ${sysText}`;
            } else {
                logEl.innerHTML = `${tsHtml}${data.text}`;
            }
        } else if (data.type === 'success') {
            const enchObj = enchantmentsData.find(e => e.id === `minecraft:${data.enchKey}`);
            const displayName = enchObj ? (currentLang === 'en' ? enchObj.nameEn : enchObj.nameRu) : data.enchKey;
            const foundText = currentLang === 'en' ? 'FOUND' : 'НАЙДЕНО';
            const roman = ["", "I", "II", "III", "IV", "V"][data.lvl] || data.lvl;
            const timeText = currentLang === 'en' ? 'Search time:' : 'Время поиска:';
            
            let timeStr = "";
            if (data.timeMs) {
                const totalSeconds = Math.floor(data.timeMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const minText = currentLang === 'en' ? 'm' : 'мин';
                const secText = currentLang === 'en' ? 's' : 'сек';
                timeStr = `${minutes}${minText} ${seconds}${secText}`;
            }

            let baseId = data.enchKey;
            if (baseId === 'sweeping') baseId = 'sweeping_edge';
            const imgSrc = `assets/books/item/${baseId}_${data.lvl || 1}.png`;
            
            logEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; width: 100%;">
                    ${tsHtml}
                    <img src="assets/found.png" class="log-book-icon" alt="">
                    <span>${foundText}:</span>
                    <img src="${imgSrc}" class="log-book-icon" alt="">
                    <span>${displayName} <span class="log-lvl">${roman}</span>!</span>
                    ${data.price ? `
                    <div class="log-price-wrapper">
                        <span class="log-price">${data.price}</span>
                        <img src="assets/emerald.png" class="emerald-icon" alt="">
                    </div>
                    ` : ''}
                </div>
                ${data.timeMs ? `<div class="success-details-wrapper">
                    <div class="success-details">
                        <span class="detail-icon">⏱</span>
                        <span class="detail-text">${timeText}</span>
                        <span class="detail-value">${timeStr}</span>
                    </div>
                </div>` : ''}
            `;
            
            logEl.style.flexDirection = 'column';
            logEl.style.alignItems = 'flex-start';
            logEl.style.cursor = 'pointer';
            
            if (data.timeMs) {
                logEl.addEventListener('click', () => {
                    const wrapper = logEl.querySelector('.success-details-wrapper');
                    wrapper.classList.toggle('open');
                });
            }
        } else if (data.enchKey && data.romanLevel) {
            const enchObj = enchantmentsData.find(e => e.id === `minecraft:${data.enchKey}`);
            const displayName = enchObj ? (currentLang === 'en' ? enchObj.nameEn : enchObj.nameRu) : data.name;
            
            let baseId = data.enchKey;
            if (baseId === 'sweeping') baseId = 'sweeping_edge';
            const imgSrc = `assets/books/item/${baseId}_${data.lvl || 1}.png`;
            
            logEl.innerHTML = `
                ${tsHtml}
                <img src="${imgSrc}" class="log-book-icon" alt="">
                <span class="log-ench">${displayName}</span>
                <span class="log-lvl">${data.romanLevel}</span>
                <div class="log-price-wrapper">
                    <span class="log-price">${data.price}</span>
                    <img src="assets/emerald.png" class="emerald-icon" alt="">
                </div>
            `;
        } else {
            logEl.innerHTML = `${tsHtml}${data.text || JSON.stringify(data)}`;
        }
        return logEl;
    }

    function renderGrid() {
        grid.innerHTML = '';
        
        let filtered = enchantmentsData.filter(ench => {
            if (currentVersion < ench.minVersion) return false;
            
            if (!searchQuery) return true;
            const name = currentLang === 'en' ? ench.nameEn.toLowerCase() : ench.nameRu.toLowerCase();
            return name.includes(searchQuery);
        });

        filtered.sort((a, b) => {
            return a.nameEn.localeCompare(b.nameEn);
        });

        filtered.forEach(ench => {
            const level = selections[ench.id] || 0;
            const isSelected = level > 0;
            const roman = ['', 'I', 'II', 'III', 'IV', 'V'];

            const slot = document.createElement('div');
            slot.className = `enchant-slot ${isSelected ? 'selected' : ''} ${isBotRunning ? 'disabled' : ''}`;

            let baseId = ench.id.replace('minecraft:', '');
            if (baseId === 'sweeping') baseId = 'sweeping_edge';
            const displayLevel = isSelected ? level : ench.maxLevel;
            const imgSrc = `assets/books/item/${baseId}_${displayLevel}.png`;

            const displayName = currentLang === 'en' ? ench.nameEn : ench.nameRu;
            const tooltipText = `${displayName}${isSelected && ench.maxLevel > 1 ? ' ' + roman[level] : ''}`;

            slot.innerHTML = `
                <img src="${imgSrc}" class="slot-book" alt="">
                ${isSelected ? `<span class="slot-level">${roman[level] || level}</span>` : ''}
            `;

            slot.addEventListener('click', () => toggleSelection(ench.id, false));
            
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleSelection(ench.id, true);
            });

            slot.addEventListener('mouseenter', () => {
                globalTooltip.textContent = tooltipText;
                globalTooltip.style.opacity = '1';
                globalTooltip.style.visibility = 'visible';
            });
            
            slot.addEventListener('mousemove', (e) => {
                globalTooltip.style.left = (e.clientX + 15) + 'px';
                globalTooltip.style.top = (e.clientY + 15) + 'px';
            });
            
            slot.addEventListener('mouseleave', () => {
                globalTooltip.style.opacity = '0';
                globalTooltip.style.visibility = 'hidden';
            });

            grid.appendChild(slot);
        });
    }

    function toggleSelection(id, rightClick = false) {
        if (isBotRunning) return;
        const ench = enchantmentsData.find(e => e.id === id);
        
        if (!selections[id]) {
            selections[id] = ench.maxLevel;
        } else {
            if (rightClick) {
                selections[id] = 0;
            } else {
                selections[id]--;
            }
        }
        renderGrid();
    } 
    const AXE_TYPES = {
        'wooden_axe': { label: 'Wooden Axe', cls: 'axe-wooden' },
        'stone_axe': { label: 'Stone Axe', cls: 'axe-stone' },
        'iron_axe': { label: 'Iron Axe', cls: 'axe-iron' },
        'golden_axe': { label: 'Golden Axe', cls: 'axe-golden' },
        'diamond_axe': { label: 'Diamond Axe', cls: 'axe-diamond' },
        'netherite_axe': { label: 'Netherite Axe', cls: 'axe-netherite' }
    };

    function updateStatus() {
        fetch('/api/status')
            .then(res => res.json())
            .then(data => {
                isBotRunning = data.isRunning;
                if (data.isRunning) {
                    statusText.textContent = currentLang === 'en' ? 'Rerolling' : 'В процессе';
                    btnAction.className = 'btn btn-stop';
                    btnAction.textContent = currentLang === 'en' ? '■ STOP SEARCH' : '■ ЗАКОНЧИТЬ ПОИСК';
                } else {
                    statusText.textContent = currentLang === 'en' ? 'Stopped' : 'Остановлен';
                    btnAction.className = 'btn btn-start';
                    btnAction.textContent = currentLang === 'en' ? '▶ START SEARCH' : '▶ НАЧАТЬ ПОИСК';
                }

                if (data.offHand) {
                    const offName = data.offHand.name;
                    const humanOffName = currentLang === 'en' ? 'Lectern' : 'Кафедра';
                    const count = data.offHand.count;
                    const countHTML = count > 1 ? `<span class="slot-count">${count}</span>` : '';
                    
                    if (offName.includes('lectern')) {
                        offHandEl.innerHTML = `<img src="assets/lectern.png" class="held-item-icon" alt="${humanOffName}" title="${humanOffName}">${countHTML}`;
                    } else {
                        offHandEl.innerHTML = `<span class="empty-hand" title="${humanOffName}">✋</span>${countHTML}`;
                    }
                } else {
                    const emptyLectern = currentLang === 'en' ? 'Empty Off-hand' : 'Левая рука пуста';
                    offHandEl.innerHTML = `<span class="empty-hand" title="${emptyLectern}">✋</span>`;
                }

                let contentEl = mainHandEl.querySelector('.main-hand-content');
                let dropdownEl = mainHandEl.querySelector('#axe-dropdown');
                
                if (!contentEl || !dropdownEl) {
                    mainHandEl.innerHTML = `<div class="main-hand-content" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"></div><div class="axe-dropdown" id="axe-dropdown"></div>`;
                    contentEl = mainHandEl.querySelector('.main-hand-content');
                    dropdownEl = mainHandEl.querySelector('#axe-dropdown');
                }

                let mainInner = '';
                if (data.mainHand) {
                    const axeName = data.mainHand.name;
                    const axeHum = axeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const translatedAxe = axeTranslations[axeName] ? axeTranslations[axeName][currentLang] : axeHum;
                    const count = data.mainHand.count;
                    const countHTML = count > 1 ? `<span class="slot-count">${count}</span>` : '';
                    mainInner = `<img src="assets/axe/${axeName}.png" class="held-item-icon" alt="${translatedAxe}" title="${translatedAxe}">${countHTML}`;
                } else {
                    const emptyAxe = currentLang === 'en' ? 'Empty Main-hand' : 'Правая рука пуста';
                    mainInner = `<span class="empty-hand" title="${emptyAxe}">✋</span>`;
                }

                if (contentEl.innerHTML !== mainInner) {
                    contentEl.innerHTML = mainInner;
                }
                
                if (dropdownEl.children.length === 0 && data.availableAxes && data.availableAxes.length > 0) {
                    data.availableAxes.forEach(axeName => {
                        const axeHum = axeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const translatedAxe = axeTranslations[axeName] ? axeTranslations[axeName][currentLang] : axeHum;
                        const option = document.createElement('div');
                        option.className = 'axe-option';
                        option.innerHTML = `<img src="assets/axe/${axeName}.png" alt=""> <span>${translatedAxe}</span>`;
                        option.addEventListener('click', (e) => {
                            e.stopPropagation();
                            equipAxe(axeName);
                            dropdownEl.classList.remove('show');
                        });
                        dropdownEl.appendChild(option);
                    });
                }

                document.querySelectorAll('.enchant-slot').forEach(slot => {
                    if (isBotRunning) {
                        slot.classList.add('disabled');
                    } else {
                        slot.classList.remove('disabled');
                    }
                });
            })
            .catch(err => console.error("Failed to fetch status", err));
    }

    btnAction.addEventListener('click', () => {
        if (isBotRunning) {
            btnAction.disabled = true;
            fetch('/api/stop', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                btnAction.disabled = false;
                updateStatus();
            });
        } else {
            const payload = Object.entries(selections)
                .filter(([id, level]) => level > 0)
                .map(([id, level]) => ({ enchant: id, level: level }));

            if (payload.length === 0) {
                alert(currentLang === 'en' ? "Select at least one enchantment first!" : "Выберите хотя бы одно зачарование!");
                return;
            }

            btnAction.disabled = true;
            fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enchants: payload })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                btnAction.disabled = false;
                updateStatus();
            });
        }
    });

    mainHandEl.addEventListener('click', (e) => {
        if (e.target.closest('.axe-option')) return;
        const dropdown = mainHandEl.querySelector('#axe-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    });

    document.addEventListener('click', (e) => {
        if (!mainHandEl.contains(e.target)) {
            const dropdown = mainHandEl.querySelector('#axe-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
    });

    function equipAxe(axeName) {
        fetch('/api/equip-axe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ axeName: axeName })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) alert(data.error);
            updateStatus();
        })
        .catch(err => console.error("Failed to equip axe", err));
    }
});
