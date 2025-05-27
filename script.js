// PMSify - Period Tracking App
// All data is stored locally for privacy

class PMSify {
    constructor() {
        this.currentDate = new Date();
        this.currentSection = 'home';
        this.data = this.loadData();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateCalendar();
        this.updateDashboard();
        this.updateHistory();
        this.loadSettings();
        this.setDailyTip();
        this.updateWaterTracker();
        this.loadDailyNotes();
    }

    // Data Management
    loadData() {
        const defaultData = {
            periods: [],
            dailyLogs: {},
            settings: {
                cycleLength: 28,
                periodLength: 5,
                reminders: {
                    period: true,
                    ovulation: true,
                    selfcare: true
                },
                darkMode: false
            },
            waterIntake: {},
            notes: {}
        };

        const savedData = localStorage.getItem('pmsify-data');
        return savedData ? { ...defaultData, ...JSON.parse(savedData) } : defaultData;
    }

    saveData() {
        localStorage.setItem('pmsify-data', JSON.stringify(this.data));
    }

    // Navigation
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Mobile menu toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        navToggle?.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Mood tracking
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.logMood(btn.dataset.mood);
            });
        });

        // Symptom tracking
        document.querySelectorAll('.symptom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                this.logSymptom(btn.dataset.symptom, btn.classList.contains('active'));
            });
        });

        // Flow tracking
        document.querySelectorAll('.flow-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.flow-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.logFlow(btn.dataset.flow);
            });
        });

        // Settings
        document.getElementById('cycle-length')?.addEventListener('change', (e) => {
            this.data.settings.cycleLength = parseInt(e.target.value);
            this.saveData();
            this.updateDashboard();
        });

        document.getElementById('period-length')?.addEventListener('change', (e) => {
            this.data.settings.periodLength = parseInt(e.target.value);
            this.saveData();
            this.updateDashboard();
        });

        document.getElementById('dark-mode')?.addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });

        // Reminder settings
        ['period-reminders', 'ovulation-reminders', 'selfcare-reminders'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                const type = id.split('-')[0];
                this.data.settings.reminders[type] = e.target.checked;
                this.saveData();
            });
        });
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[href="#${sectionName}"]`)?.classList.add('active');

        // Show section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName)?.classList.add('active');

        this.currentSection = sectionName;

        // Update section-specific content
        if (sectionName === 'dashboard') {
            this.updateDashboard();
        } else if (sectionName === 'history') {
            this.updateHistory();
        }
    }

    // Calendar Generation
    generateCalendar() {
        const calendar = document.getElementById('calendar');
        if (!calendar) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.textContent = day;
            dayHeader.style.fontWeight = 'bold';
            dayHeader.style.textAlign = 'center';
            dayHeader.style.padding = '10px 5px';
            dayHeader.style.color = 'var(--text-light)';
            calendar.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            calendar.appendChild(emptyDay);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const today = new Date().toISOString().split('T')[0];

            // Mark today
            if (currentDateStr === today) {
                dayElement.classList.add('today');
            }

            // Mark period days
            if (this.isPeriodDay(currentDateStr)) {
                dayElement.classList.add('period');
            }

            // Mark fertile days
            if (this.isFertileDay(currentDateStr)) {
                dayElement.classList.add('fertile');
            }

            // Mark predicted period
            if (this.isPredictedPeriod(currentDateStr)) {
                dayElement.classList.add('predicted');
            }

            dayElement.addEventListener('click', () => {
                this.selectDate(currentDateStr);
            });

            calendar.appendChild(dayElement);
        }
    }

    // Period Tracking
    markPeriodStart() {
        const today = new Date().toISOString().split('T')[0];
        const existingPeriod = this.data.periods.find(p => p.startDate === today);
        
        if (!existingPeriod) {
            this.data.periods.push({
                startDate: today,
                endDate: null,
                id: Date.now()
            });
            this.saveData();
            this.generateCalendar();
            this.updateDashboard();
            this.showNotification('Period start marked! 🌸');
        }
    }

    markPeriodEnd() {
        const today = new Date().toISOString().split('T')[0];
        const activePeriod = this.data.periods.find(p => !p.endDate);
        
        if (activePeriod) {
            activePeriod.endDate = today;
            this.saveData();
            this.generateCalendar();
            this.updateDashboard();
            this.showNotification('Period end marked! 💪');
        }
    }

    isPeriodDay(dateStr) {
        return this.data.periods.some(period => {
            const start = new Date(period.startDate);
            const end = period.endDate ? new Date(period.endDate) : new Date(start.getTime() + (this.data.settings.periodLength - 1) * 24 * 60 * 60 * 1000);
            const checkDate = new Date(dateStr);
            return checkDate >= start && checkDate <= end;
        });
    }

    isFertileDay(dateStr) {
        const lastPeriod = this.getLastPeriod();
        if (!lastPeriod) return false;

        const lastPeriodStart = new Date(lastPeriod.startDate);
        const ovulationDay = new Date(lastPeriodStart.getTime() + (this.data.settings.cycleLength - 14) * 24 * 60 * 60 * 1000);
        const fertileStart = new Date(ovulationDay.getTime() - 5 * 24 * 60 * 60 * 1000);
        const fertileEnd = new Date(ovulationDay.getTime() + 1 * 24 * 60 * 60 * 1000);
        const checkDate = new Date(dateStr);

        return checkDate >= fertileStart && checkDate <= fertileEnd;
    }

    isPredictedPeriod(dateStr) {
        const nextPeriodDate = this.getNextPeriodDate();
        if (!nextPeriodDate) return false;

        const checkDate = new Date(dateStr);
        const predictedStart = new Date(nextPeriodDate);
        const predictedEnd = new Date(predictedStart.getTime() + (this.data.settings.periodLength - 1) * 24 * 60 * 60 * 1000);

        return checkDate >= predictedStart && checkDate <= predictedEnd;
    }

    getLastPeriod() {
        return this.data.periods
            .filter(p => p.startDate)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
    }

    getNextPeriodDate() {
        const lastPeriod = this.getLastPeriod();
        if (!lastPeriod) return null;

        const lastStart = new Date(lastPeriod.startDate);
        return new Date(lastStart.getTime() + this.data.settings.cycleLength * 24 * 60 * 60 * 1000);
    }

    // Daily Logging
    logMood(mood) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.data.dailyLogs[today]) {
            this.data.dailyLogs[today] = {};
        }
        this.data.dailyLogs[today].mood = mood;
        this.saveData();
        this.showNotification(`Mood logged: ${this.getMoodEmoji(mood)}`);
    }

    logSymptom(symptom, active) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.data.dailyLogs[today]) {
            this.data.dailyLogs[today] = {};
        }
        if (!this.data.dailyLogs[today].symptoms) {
            this.data.dailyLogs[today].symptoms = [];
        }

        if (active && !this.data.dailyLogs[today].symptoms.includes(symptom)) {
            this.data.dailyLogs[today].symptoms.push(symptom);
        } else if (!active) {
            this.data.dailyLogs[today].symptoms = this.data.dailyLogs[today].symptoms.filter(s => s !== symptom);
        }

        this.saveData();
    }

    logFlow(flow) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.data.dailyLogs[today]) {
            this.data.dailyLogs[today] = {};
        }
        this.data.dailyLogs[today].flow = flow;
        this.saveData();
        this.showNotification(`Flow level logged: ${flow}`);
    }

    getMoodEmoji(mood) {
        const moods = {
            great: '😊',
            good: '🙂',
            okay: '😐',
            bad: '😔',
            terrible: '😢'
        };
        return moods[mood] || '😐';
    }

    // Dashboard Updates
    updateDashboard() {
        this.updateCurrentPhase();
        this.updatePredictions();
        this.loadTodaysLog();
    }

    updateCurrentPhase() {
        const phase = this.getCurrentCyclePhase();
        const phaseText = document.getElementById('current-phase-text');
        const phaseIcon = document.getElementById('current-phase-icon');

        if (phaseText && phaseIcon) {
            phaseText.textContent = phase.text;
            phaseIcon.textContent = phase.icon;
        }
    }

    getCurrentCyclePhase() {
        const lastPeriod = this.getLastPeriod();
        if (!lastPeriod) {
            return { text: 'Track your first period to see cycle phase', icon: '🌸' };
        }

        const today = new Date();
        const lastPeriodStart = new Date(lastPeriod.startDate);
        const daysSinceLastPeriod = Math.floor((today - lastPeriodStart) / (24 * 60 * 60 * 1000));

        if (daysSinceLastPeriod < this.data.settings.periodLength) {
            return { text: 'Menstrual Phase - Rest and recharge 🌙', icon: '🌙' };
        } else if (daysSinceLastPeriod < this.data.settings.cycleLength / 2) {
            return { text: 'Follicular Phase - Energy building 🌱', icon: '🌱' };
        } else if (daysSinceLastPeriod < (this.data.settings.cycleLength / 2) + 3) {
            return { text: 'Ovulation Phase - Peak energy 🌸', icon: '🌸' };
        } else {
            return { text: 'Luteal Phase - Prepare for rest 🍂', icon: '🍂' };
        }
    }

    updatePredictions() {
        const nextPeriod = document.getElementById('next-period');
        const fertileWindow = document.getElementById('fertile-window');
        const cycleDay = document.getElementById('cycle-day');

        const nextPeriodDate = this.getNextPeriodDate();
        const lastPeriod = this.getLastPeriod();

        if (nextPeriod) {
            if (nextPeriodDate) {
                const daysUntil = Math.ceil((nextPeriodDate - new Date()) / (24 * 60 * 60 * 1000));
                nextPeriod.textContent = daysUntil > 0 ? `In ${daysUntil} days` : 'Today';
            } else {
                nextPeriod.textContent = 'Track periods to predict';
            }
        }

        if (fertileWindow && lastPeriod) {
            const lastStart = new Date(lastPeriod.startDate);
            const ovulationDay = new Date(lastStart.getTime() + (this.data.settings.cycleLength - 14) * 24 * 60 * 60 * 1000);
            const daysToOvulation = Math.ceil((ovulationDay - new Date()) / (24 * 60 * 60 * 1000));
            
            if (daysToOvulation > 0) {
                fertileWindow.textContent = `In ${daysToOvulation} days`;
            } else if (daysToOvulation >= -1) {
                fertileWindow.textContent = 'Now';
            } else {
                fertileWindow.textContent = 'Passed';
            }
        }

        if (cycleDay && lastPeriod) {
            const lastStart = new Date(lastPeriod.startDate);
            const currentDay = Math.floor((new Date() - lastStart) / (24 * 60 * 60 * 1000)) + 1;
            cycleDay.textContent = `Day ${currentDay}`;
        }
    }

    loadTodaysLog() {
        const today = new Date().toISOString().split('T')[0];
        const todaysLog = this.data.dailyLogs[today];

        // Reset all buttons
        document.querySelectorAll('.mood-btn, .symptom-btn, .flow-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (todaysLog) {
            // Load mood
            if (todaysLog.mood) {
                document.querySelector(`[data-mood="${todaysLog.mood}"]`)?.classList.add('active');
            }

            // Load symptoms
            if (todaysLog.symptoms) {
                todaysLog.symptoms.forEach(symptom => {
                    document.querySelector(`[data-symptom="${symptom}"]`)?.classList.add('active');
                });
            }

            // Load flow
            if (todaysLog.flow) {
                document.querySelector(`[data-flow="${todaysLog.flow}"]`)?.classList.add('active');
            }
        }
    }

    // Daily Tips
    setDailyTip() {
        const tipText = document.getElementById('tip-text');
        if (!tipText) return;

        const phase = this.getCurrentCyclePhase();
        const tips = this.getTipsForPhase(phase.text);
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        
        tipText.textContent = randomTip;
    }

    getTipsForPhase(phaseText) {
        if (phaseText.includes('Menstrual')) {
            return [
                "Rest is productive too. Take it easy today! 🛌",
                "Iron-rich foods can help with energy during your period 🥬",
                "Gentle stretching can help with cramps 🧘‍♀️",
                "Stay hydrated - it helps with bloating 💧",
                "Dark chocolate is okay - you deserve it! 🍫"
            ];
        } else if (phaseText.includes('Follicular')) {
            return [
                "Great time to start new projects! Your energy is building 💪",
                "Try cardio workouts - your body can handle more intensity 🏃‍♀️",
                "Perfect time for social activities and networking 👥",
                "Your skin might be clearer - great time for photos! 📸",
                "Focus on protein to support your growing energy 🥚"
            ];
        } else if (phaseText.includes('Ovulation')) {
            return [
                "You're at peak energy - tackle challenging tasks! ⚡",
                "Great time for important conversations 💬",
                "Your confidence is naturally higher today 👑",
                "Perfect time for job interviews or presentations 🎯",
                "You might feel more social and outgoing 🌟"
            ];
        } else if (phaseText.includes('Luteal')) {
            return [
                "Focus on completing projects rather than starting new ones 📝",
                "Magnesium can help with PMS symptoms 🌰",
                "Practice self-compassion - mood changes are normal 💕",
                "Gentle yoga can help with tension 🧘‍♀️",
                "Prepare healthy snacks for cravings 🥜"
            ];
        }

        return [
            "Listen to your body - it knows what it needs 💝",
            "Every cycle is different, and that's normal 🌈",
            "Track your patterns to understand your unique rhythm 📊",
            "Self-care isn't selfish - it's necessary 🛁",
            "You're stronger than you think! 💪"
        ];
    }

    // Water Tracking
    updateWaterTracker() {
        const today = new Date().toISOString().split('T')[0];
        const waterCount = this.data.waterIntake[today] || 0;
        
        document.getElementById('water-count').textContent = waterCount;
        
        const waterLevel = document.getElementById('water-level');
        const percentage = Math.min((waterCount / 8) * 100, 100);
        waterLevel.style.height = `${percentage}%`;
    }

    addWater() {
        const today = new Date().toISOString().split('T')[0];
        this.data.waterIntake[today] = (this.data.waterIntake[today] || 0) + 1;
        this.saveData();
        this.updateWaterTracker();
        
        const count = this.data.waterIntake[today];
        if (count === 8) {
            this.showNotification('🎉 Great job! You reached your daily water goal!');
        } else {
            this.showNotification(`💧 Glass ${count} logged!`);
        }
    }

    resetWater() {
        const today = new Date().toISOString().split('T')[0];
        this.data.waterIntake[today] = 0;
        this.saveData();
        this.updateWaterTracker();
        this.showNotification('Water intake reset for today');
    }

    // Notes
    loadDailyNotes() {
        const today = new Date().toISOString().split('T')[0];
        const notesTextarea = document.getElementById('daily-notes');
        if (notesTextarea) {
            notesTextarea.value = this.data.notes[today] || '';
        }
    }

    saveNotes() {
        const today = new Date().toISOString().split('T')[0];
        const notesTextarea = document.getElementById('daily-notes');
        if (notesTextarea) {
            this.data.notes[today] = notesTextarea.value;
            this.saveData();
            this.showNotification('Notes saved! 📝');
        }
    }

    // History
    updateHistory() {
        this.updateHistoryStats();
        this.updateHistoryLog();
        this.drawCycleChart();
    }

    updateHistoryStats() {
        const avgCycleElement = document.getElementById('avg-cycle');
        const avgPeriodElement = document.getElementById('avg-period');
        const lastPeriodElement = document.getElementById('last-period');

        // Calculate average cycle length
        const completedCycles = this.getCompletedCycles();
        const avgCycle = completedCycles.length > 0 
            ? Math.round(completedCycles.reduce((sum, cycle) => sum + cycle.length, 0) / completedCycles.length)
            : this.data.settings.cycleLength;

        // Calculate average period length
        const periodsWithEnd = this.data.periods.filter(p => p.endDate);
        const avgPeriod = periodsWithEnd.length > 0
            ? Math.round(periodsWithEnd.reduce((sum, period) => {
                const start = new Date(period.startDate);
                const end = new Date(period.endDate);
                return sum + Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
            }, 0) / periodsWithEnd.length)
            : this.data.settings.periodLength;

        // Last period
        const lastPeriod = this.getLastPeriod();
        const lastPeriodText = lastPeriod 
            ? new Date(lastPeriod.startDate).toLocaleDateString()
            : 'Not tracked yet';

        if (avgCycleElement) avgCycleElement.textContent = `${avgCycle} days`;
        if (avgPeriodElement) avgPeriodElement.textContent = `${avgPeriod} days`;
        if (lastPeriodElement) lastPeriodElement.textContent = lastPeriodText;
    }

    getCompletedCycles() {
        const sortedPeriods = this.data.periods
            .filter(p => p.startDate)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const cycles = [];
        for (let i = 1; i < sortedPeriods.length; i++) {
            const prevStart = new Date(sortedPeriods[i-1].startDate);
            const currentStart = new Date(sortedPeriods[i].startDate);
            const length = Math.ceil((currentStart - prevStart) / (24 * 60 * 60 * 1000));
            cycles.push({ length, startDate: sortedPeriods[i-1].startDate });
        }

        return cycles;
    }

    updateHistoryLog() {
        const logEntries = document.getElementById('log-entries');
        if (!logEntries) return;

        logEntries.innerHTML = '';

        // Get recent entries (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentEntries = Object.entries(this.data.dailyLogs)
            .filter(([date]) => new Date(date) >= thirtyDaysAgo)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .slice(0, 10);

        recentEntries.forEach(([date, log]) => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';

            const dateElement = document.createElement('div');
            dateElement.className = 'log-date';
            dateElement.textContent = new Date(date).toLocaleDateString();

            const detailsElement = document.createElement('div');
            detailsElement.className = 'log-details';

            const details = [];
            if (log.mood) details.push(`Mood: ${this.getMoodEmoji(log.mood)}`);
            if (log.flow) details.push(`Flow: ${log.flow}`);
            if (log.symptoms && log.symptoms.length > 0) {
                details.push(`Symptoms: ${log.symptoms.join(', ')}`);
            }

            detailsElement.textContent = details.length > 0 ? details.join(' • ') : 'No data logged';

            entry.appendChild(dateElement);
            entry.appendChild(detailsElement);
            logEntries.appendChild(entry);
        });

        if (recentEntries.length === 0) {
            logEntries.innerHTML = '<p style="text-align: center; color: var(--text-light);">No entries yet. Start tracking to see your history!</p>';
        }
    }

    drawCycleChart() {
        const canvas = document.getElementById('cycle-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const cycles = this.getCompletedCycles().slice(-6); // Last 6 cycles

        if (cycles.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'var(--text-light)';
            ctx.font = '16px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('Track more periods to see trends', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;

        // Find min and max cycle lengths
        const cycleLengths = cycles.map(c => c.length);
        const minLength = Math.min(...cycleLengths) - 2;
        const maxLength = Math.max(...cycleLengths) + 2;

        // Draw axes
        ctx.strokeStyle = 'var(--border-color)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();

        // Draw data points and lines
        ctx.strokeStyle = 'var(--primary-color)';
        ctx.fillStyle = 'var(--primary-color)';
        ctx.lineWidth = 2;

        const pointSpacing = chartWidth / (cycles.length - 1);

        ctx.beginPath();
        cycles.forEach((cycle, index) => {
            const x = padding + index * pointSpacing;
            const y = padding + chartHeight - ((cycle.length - minLength) / (maxLength - minLength)) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Draw point
            ctx.fillRect(x - 3, y - 3, 6, 6);
        });
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = 'var(--text-color)';
        ctx.font = '12px Poppins';
        ctx.textAlign = 'center';

        cycles.forEach((cycle, index) => {
            const x = padding + index * pointSpacing;
            const y = padding + chartHeight + 20;
            ctx.fillText(`${cycle.length}d`, x, y);
        });
    }

    // Settings
    loadSettings() {
        const cycleLength = document.getElementById('cycle-length');
        const periodLength = document.getElementById('period-length');
        const darkMode = document.getElementById('dark-mode');
        const periodReminders = document.getElementById('period-reminders');
        const ovulationReminders = document.getElementById('ovulation-reminders');
        const selfcareReminders = document.getElementById('selfcare-reminders');

        if (cycleLength) cycleLength.value = this.data.settings.cycleLength;
        if (periodLength) periodLength.value = this.data.settings.periodLength;
        if (darkMode) darkMode.checked = this.data.settings.darkMode;
        if (periodReminders) periodReminders.checked = this.data.settings.reminders.period;
        if (ovulationReminders) ovulationReminders.checked = this.data.settings.reminders.ovulation;
        if (selfcareReminders) selfcareReminders.checked = this.data.settings.reminders.selfcare;

        // Apply dark mode if enabled
        if (this.data.settings.darkMode) {
            document.body.setAttribute('data-theme', 'dark');
        }
    }

    toggleDarkMode(enabled) {
        this.data.settings.darkMode = enabled;
        this.saveData();

        if (enabled) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
    }

    // Data Export/Import
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `pmsify-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully! 📁');
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.removeItem('pmsify-data');
            this.data = this.loadData();
            this.updateDashboard();
            this.updateHistory();
            this.generateCalendar();
            this.updateWaterTracker();
            this.loadDailyNotes();
            this.showNotification('All data cleared');
        }
    }

    // Utility Functions
    selectDate(dateStr) {
        // This could be expanded to allow editing specific dates
        console.log('Selected date:', dateStr);
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 15px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 10000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick events
function showSection(sectionName) {
    window.pmsify.showSection(sectionName);
}

function markPeriodStart() {
    window.pmsify.markPeriodStart();
}

function markPeriodEnd() {
    window.pmsify.markPeriodEnd();
}

function addWater() {
    window.pmsify.addWater();
}

function resetWater() {
    window.pmsify.resetWater();
}

function saveNotes() {
    window.pmsify.saveNotes();
}

function exportData() {
    window.pmsify.exportData();
}

function clearAllData() {
    window.pmsify.clearAllData();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pmsify = new PMSify();
});

// Handle page refresh - restore current section
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('pmsify-current-section', window.pmsify?.currentSection || 'home');
});

window.addEventListener('load', () => {
    const savedSection = sessionStorage.getItem('pmsify-current-section');
    if (savedSection && window.pmsify) {
        window.pmsify.showSection(savedSection);
    }
});