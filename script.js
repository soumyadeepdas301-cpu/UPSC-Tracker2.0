// Default data structures
const DEFAULT_DATA = {
    subjects: [
        { id: 'sub_1', name: 'Indian Polity', topics: [] },
        { id: 'sub_2', name: 'Modern History', topics: [] },
        { id: 'sub_3', name: 'Economy', topics: [] },
        { id: 'sub_4', name: 'Geography', topics: [] },
        { id: 'sub_6', name: 'Current Affairs', topics: [] }
    ],
    tests: [],
    timetable: [],
    mains: [],
    mainsTests: [],
    logs: [],
    missedWork: [],
    habits: [],
    goals: [],
    notes: [],
    noteRevisions: []
};

// ===================
// Background Session Checker
// ===================
function checkUpcomingSessions() {
    if(!appData.timetable || appData.timetable.length === 0) return;

    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    
    const todaysSessions = appData.timetable.filter(t => t.day === currentDay);
    if(todaysSessions.length === 0) return;

    let upcomingSession = null;
    let minDiffMinutes = Infinity;

    todaysSessions.forEach(session => {
        const parts = session.startTime.split(':');
        if(parts.length !== 2) return;
        
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        
        const sessionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        let diffMs = sessionTime - now;
        let diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins >= -15 && diffMins <= 60) {
            if (upcomingSession === null || diffMins < minDiffMinutes) {
                minDiffMinutes = diffMins;
                upcomingSession = session;
            }
        }
    });

    const banner = document.getElementById('sessionNotificationBanner');
    if (upcomingSession) {
        document.getElementById('sessNotifText').textContent = upcomingSession.subject;
        const timeText = document.getElementById('sessNotifTime');
        
        if (minDiffMinutes < 0) {
            timeText.textContent = Math.abs(minDiffMinutes) + " minute" + (Math.abs(minDiffMinutes) === 1 ? "" : "s") + " ago";
        } else if (minDiffMinutes === 0) {
            timeText.textContent = "right now";
        } else {
            timeText.textContent = "in " + minDiffMinutes + " minute" + (minDiffMinutes === 1 ? "" : "s");
        }
        
        if (banner.getAttribute('data-dismissed-id') !== upcomingSession.id) {
            banner.classList.add('active');
            banner.setAttribute('data-current-id', upcomingSession.id);
        }
    } else {
        banner.classList.remove('active');
    }
}

document.getElementById('closeNotifBtn').addEventListener('click', () => {
    const banner = document.getElementById('sessionNotificationBanner');
    banner.classList.remove('active');
    const sid = banner.getAttribute('data-current-id');
    if(sid) banner.setAttribute('data-dismissed-id', sid);
});

setInterval(checkUpcomingSessions, 60000); // Check every minute
setTimeout(checkUpcomingSessions, 2000); // Check shortly after load


// State
let appData = JSON.parse(localStorage.getItem("upscEliteData"));
if (!appData) {
    appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveData();
}

let activeSubjectId = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');
const revBadge = document.getElementById('nav-rev-badge');

// View Switching
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Update active nav
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update active section
        const targetId = item.getAttribute('data-target');
        viewSections.forEach(section => {
            section.classList.toggle('active', section.id === targetId);
            section.classList.toggle('hidden', section.id !== targetId);
        });

        // Refresh views specifically if needed
        if(targetId === 'dashboard') renderDashboard();
        if(targetId === 'syllabus') renderSyllabus();
        if(targetId === 'revision') renderRevisions();
        if(targetId === 'mocktests') renderTests();
        if(targetId === 'timetable') renderTimetable();
        if(targetId === 'sessionlogs') renderLogs();
        if(targetId === 'missedwork') renderMissedWork();
        if(targetId === 'habits') renderHabits();
        if(targetId === 'goals') renderGoals();
        if(targetId === 'notes') renderNotes();
        if(targetId === 'note-revisions') renderNoteRevisions();
        if(targetId === 'suggestion') updateFocusRecommendation(checkRevisions());
    });
});

// Mock Test sub-navigation toggle
document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-mock-target');
        
        // Update button active state
        const parent = btn.parentElement;
        parent.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Switch sub-view
        const subViews = document.querySelectorAll('.mock-sub-view');
        subViews.forEach(v => {
            v.classList.toggle('hidden', v.id !== `mock-view-${target}`);
        });
    });
});





// Helper functions
function saveData() {
    localStorage.setItem("upscEliteData", JSON.stringify(appData));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// ===================
// Digital Clock logic
// ===================
function updateClock() {
    const clockEl = document.getElementById('digitalClock');
    if (!clockEl) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    
    clockEl.innerHTML = `
        <span class="clock-date">${dateStr}</span>
        <span class="clock-separator">|</span>
        <span class="clock-time">${timeStr}</span>
    `;
}
setInterval(updateClock, 1000);
updateClock(); // Initial call

// ===================
// Session Logging
// ===================
function logEvent(type, duration = null, details = '') {
    if (!appData.logs) appData.logs = [];
    appData.logs.push({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        type,
        duration, // in seconds
        details
    });
    // Keep only last 100 entries to maintain performance
    if (appData.logs.length > 200) appData.logs.shift();
    saveData();
}

function renderLogs() {
    const tbody = document.getElementById('session-logs-body');
    const emptyState = document.getElementById('session-logs-empty-state');
    
    tbody.innerHTML = '';
    
    if (!appData.logs || appData.logs.length === 0) {
        emptyState.style.display = 'flex';
        tbody.parentElement.style.display = 'none';
        return;
    }

    const filteredLogs = appData.logs.filter(log => log.type === 'Focus Session');

    if (filteredLogs.length === 0) {
        emptyState.style.display = 'flex';
        tbody.parentElement.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tbody.parentElement.style.display = 'table';

    [...filteredLogs].reverse().forEach(log => {
        const tr = document.createElement('tr');
        const date = new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        const durationText = log.duration ? formatTime(log.duration) : '-';
        
        const remark = log.remarks || '';
        
        tr.innerHTML = `
            <td>${date}</td>
            <td style="font-weight: 600; color: #138808;">${log.type}</td>
            <td style="font-family: monospace;">${durationText}</td>
            <td>
                <input type="text" class="log-remark-input" 
                    placeholder="Add a remark..." 
                    value="${remark}" 
                    onchange="window.updateLogRemark('${log.id}', this.value)"
                    style="width: 100%; background: transparent; border: none; border-bottom: 1px solid transparent; color: var(--text-main); font-size: 0.9rem; padding: 2px 4px; transition: border-color 0.2s;">
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateLogRemark = function(id, remark) {
    const log = appData.logs.find(l => l.id === id);
    if (log) {
        log.remarks = remark;
        saveData();
    }
};

// ===================
// Missed Work Log
// ===================
let currentMissedFilter = 'all';

function renderMissedWork() {
    const tbody = document.getElementById('missed-work-table-body');
    const emptyState = document.getElementById('missed-work-empty-state');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!appData.missedWork) appData.missedWork = [];
    
    let filtered = appData.missedWork;
    if (currentMissedFilter === 'pending') filtered = appData.missedWork.filter(m => m.status === 'Pending');
    else if (currentMissedFilter === 'recovered') filtered = appData.missedWork.filter(m => m.status === 'Recovered');
    
    // Sort: High Priority first, then by date desc
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    filtered.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.date) - new Date(a.date);
    });

    const table = tbody.closest('table');

    if (filtered.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (table) table.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (table) table.style.display = 'table';

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        if (item.status === 'Recovered') tr.style.opacity = '0.6';
        
        const date = new Date(item.date).toLocaleDateString([], { day:'numeric', month:'short' });
        
        tr.innerHTML = `
            <td style="font-size: 0.85rem; color: var(--text-muted);">${date}</td>
            <td style="color: var(--accent-light); font-weight: 600; font-size: 0.9rem;">${item.type}</td>
            <td>
                <div style="font-weight: 600; color: var(--text-main);">${item.subject}</div>
                ${item.note ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Note: ${item.note}</div>` : ''}
            </td>
            <td>
                <span class="missed-priority-tag priority-${item.priority}" style="font-size: 0.65rem; padding: 2px 6px;">${item.priority}</span>
            </td>
            <td>
                <span style="color: ${item.status === 'Recovered' ? '#10b981' : '#ef4444'}; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">
                    ${item.status}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn btn-sm ${item.status === 'Recovered' ? 'btn-outline' : 'btn-primary'}" 
                        onclick="toggleMissedWorkStatus('${item.id}')" style="font-size: 0.7rem; padding: 4px 10px; min-width: 80px; justify-content: center;">
                        ${item.status === 'Recovered' ? 'Unmark' : 'Recovered'}
                    </button>
                    <button class="timer-btn-icon" onclick="deleteMissedWork('${item.id}')" style="opacity: 0.5;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleMissedWorkStatus = function(id) {
    const item = appData.missedWork.find(m => m.id === id);
    if (item) {
        item.status = item.status === 'Recovered' ? 'Pending' : 'Recovered';
        saveData();
        renderMissedWork();
        renderDashboard();
    }
}

window.deleteMissedWork = function(id) {
    if(confirm("Delete this log entry?")) {
        appData.missedWork = appData.missedWork.filter(m => m.id !== id);
        saveData();
        renderMissedWork();
        renderDashboard();
    }
}

// ===================
// Dashboard Rendering
// ===================
function updateExamCountdown() {
    const target = new Date('2028-03-01T00:00:00');
    const today = new Date();
    const diff = target - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const countdownEl = document.getElementById('exam-days-val');
    if (countdownEl) countdownEl.textContent = days;
}

function renderDashboard() {
    let totalTopics = 0;
    let completedTopics = 0;
    
    const subjectGrid = document.getElementById('dashboard-subjects-grid');
    subjectGrid.innerHTML = '';

    appData.subjects.forEach(subject => {
        let subjTotal = subject.topics.length;
        let subjComp = subject.topics.filter(t => t.status === 'Completed').length;
        
        totalTopics += subjTotal;
        completedTopics += subjComp;

        let pct = subjTotal === 0 ? 0 : Math.round((subjComp / subjTotal) * 100);

        // Render card
        const card = document.createElement('div');
        card.className = 'subject-card glass-panel';
        card.innerHTML = `
            <h3>${subject.name} <span>${pct}%</span></h3>
            <div class="subject-meta">${subjComp} / ${subjTotal} Topics Completed</div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${pct}%;"></div>
            </div>
        `;
        // click to go to syllabus
        card.addEventListener('click', () => {
            activeSubjectId = subject.id;
            document.querySelector('[data-target="syllabus"]').click();
        });
        
        subjectGrid.appendChild(card);
    });

    const overallPct = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);
    document.getElementById('overall-progress-val').textContent = `${overallPct}%`;
    document.getElementById('overall-progress-bar').style.width = `${overallPct}%`;
    document.getElementById('topics-completed-val').textContent = `${completedTopics} / ${totalTopics}`;

    // Revisions
    const revs = checkRevisions();
    document.getElementById('pending-revisions-val').textContent = revs.length;

    // Backlog count
    if (!appData.missedWork) appData.missedWork = [];
    const pendingBacklog = appData.missedWork.filter(m => m.status === 'Pending').length;
    const backlogEl = document.getElementById('pending-backlog-val');
    if (backlogEl) backlogEl.textContent = pendingBacklog;
}

function updateFocusRecommendation(revs) {
    const recText = document.getElementById('studyRecommendationText');
    if (!recText) return;

    if (revs && revs.length > 0) {
        recText.innerHTML = `You have <strong>${revs.length} topic(s) pending for revision</strong>. Spaced repetition is critical for UPSC mastery. Please clear your backlog starting with <em>${revs[0].subject.name}: ${revs[0].topic.name}</em>.`;
        return;
    }

    let lowestSubj = null;
    let lowestPct = 101;
    let emptySubjects = 0;

    appData.subjects.forEach(subject => {
        let total = subject.topics.length;
        if (total === 0) {
            emptySubjects++;
            return;
        }
        let comp = subject.topics.filter(t => t.status === 'Completed').length;
        let pct = (comp / total) * 100;
        
        if (pct < lowestPct) {
            lowestPct = pct;
            lowestSubj = subject;
        }
    });

    if (lowestSubj && lowestPct < 100) {
        recText.innerHTML = `Your progress in <strong>${lowestSubj.name}</strong> is currently at ${Math.round(lowestPct)}%. We recommend dedicating your next study block to closing gaps in this subject.`;
    } else if (emptySubjects === appData.subjects.length || appData.subjects.length === 0) {
        recText.innerHTML = `Your syllabus is empty! Go to the <strong>Syllabus Tracker</strong> tab and start adding chapters.`;
    } else {
        recText.innerHTML = `Incredible work! You are 100% caught up on your tracked syllabus. It's time to focus on <strong>Mock Tests</strong> or <strong>Mains Answer Writing</strong>.`;
    }
}

// ===================
// Syllabus Rendering
// ===================
function renderSyllabus() {
    const sidebar = document.getElementById('syllabus-sidebar');
    const container = document.getElementById('topic-container');
    sidebar.innerHTML = '';

    appData.subjects.forEach(subject => {
        const div = document.createElement('div');
        div.className = `subject-list-item ${subject.id === activeSubjectId ? 'selected' : ''}`;
        div.textContent = subject.name;
        div.addEventListener('click', () => {
            activeSubjectId = subject.id;
            renderSyllabus(); // Re-render to show active
        });
        sidebar.appendChild(div);
    });

    if (!activeSubjectId && appData.subjects.length > 0) {
        activeSubjectId = appData.subjects[0].id;
        renderSyllabus(); // triggers inner render below
        return;
    }

    if (activeSubjectId) {
        const actSubj = appData.subjects.find(s => s.id === activeSubjectId);
        if (actSubj) {
            container.innerHTML = `
                <div class="topic-list-header">
                    <h2>${actSubj.name}</h2>
                    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="openTopicModal()">+ Add Topic</button>
                </div>
                <div class="topics-scroll" id="topics-scroll-area"></div>
            `;
            const tArea = document.getElementById('topics-scroll-area');
            
            if (actSubj.topics.length === 0) {
                tArea.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No topics yet. Start by adding one.</p>`;
            }

            actSubj.topics.forEach(topic => {
                const item = document.createElement('div');
                item.className = 'topic-item';
                
                // Status Select Component
                const statusOptions = ['NotStarted', 'Reading', 'Notes', 'Completed'];
                let selectHtml = `<select class="status-select" onchange="updateTopicStatus('${actSubj.id}', '${topic.id}', this.value)" style="width: 140px; padding: 0.4rem 0.8rem; font-size: 0.85rem;">`;
                statusOptions.forEach(opt => {
                    const label = opt === 'NotStarted' ? 'Not Started' : opt;
                    selectHtml += `<option value="${opt}" ${topic.status === opt ? 'selected' : ''}>${label}</option>`;
                });
                selectHtml += `</select>`;

                item.innerHTML = `
                    <div class="topic-info-main">
                        <div class="topic-status-indicator status-${topic.status}"></div>
                        <div>
                            <div style="font-weight: 500;">${topic.name}</div>
                            ${topic.status === 'Completed' && topic.completionDate ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Completed: ${topic.completionDate}</div>` : ''}
                        </div>
                    </div>
                    <div>${selectHtml}</div>
                `;
                tArea.appendChild(item);
            });
        }
    }
}

window.updateTopicStatus = function(subjId, topicId, newStatus) {
    const subj = appData.subjects.find(s => s.id === subjId);
    const top = subj.topics.find(t => t.id === topicId);
    
    top.status = newStatus;
    
    // Important spaced repetition anchor
    if (newStatus === 'Completed' && !top.completionDate) {
        top.completionDate = new Date().toISOString().split('T')[0];
        top.revisionCount = 0;
    } else if (newStatus !== 'Completed') {
        top.completionDate = null;
        top.revisionCount = 0;
    }

    saveData();
    renderSyllabus();
    updateRevBadge();
}

// ===================
// Revisions Rendering
// ===================

function checkRevisions() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const revList = [];

    appData.subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            if (topic.status === 'Completed' && topic.completionDate) {
                const compDate = new Date(topic.completionDate);
                const diffTime = Math.abs(today - compDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                let isDue = false;
                let revLabel = "";

                // Logic: Rev 1 (Day 1), Rev 2 (Day 7), Rev 3 (Day 30)
                if (diffDays >= 1 && topic.revisionCount === 0) { isDue = true; revLabel = "1-Day Rev"; }
                else if (diffDays >= 7 && topic.revisionCount === 1) { isDue = true; revLabel = "7-Day Rev"; }
                else if (diffDays >= 30 && topic.revisionCount === 2) { isDue = true; revLabel = "30-Day Rev"; }

                if (isDue) {
                    revList.push({ subject, topic, revLabel });
                }
            }
        });
    });
    return revList;
}

function updateRevBadge() {
    const list = checkRevisions();
    if (list.length > 0) {
        revBadge.textContent = list.length;
        revBadge.classList.remove('hidden');
    } else {
        revBadge.classList.add('hidden');
    }
}

function renderRevisions() {
    const container = document.getElementById('revision-container');
    container.innerHTML = '';
    
    const revList = checkRevisions();
    
    if (revList.length === 0) {
        container.innerHTML = `<div class="empty-state glass-panel" style="grid-column: 1 / -1;">
            <p>No topics due for revision today. Great job!</p>
        </div>`;
        return;
    }

    revList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'revision-card glass-panel';
        card.innerHTML = `
            <div class="rev-tag">${item.revLabel}</div>
            <div class="rev-subject">${item.subject.name}</div>
            <h3>${item.topic.name}</h3>
            <p style="font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 1rem;">Completed on: ${item.topic.completionDate}</p>
            <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="markRevised('${item.subject.id}', '${item.topic.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Mark as Revised
            </button>
        `;
        container.appendChild(card);
    });
}

window.markRevised = function(subjId, topicId) {
    const subj = appData.subjects.find(s => s.id === subjId);
    const top = subj.topics.find(t => t.id === topicId);
    
    top.revisionCount = (top.revisionCount || 0) + 1;
    saveData();
    renderRevisions();
    updateRevBadge();
}

// ===================
// Tests Rendering
// ===================
function renderTests() {
    const tbody = document.getElementById('tests-table-body');
    const emptyState = document.getElementById('tests-empty-state');
    
    tbody.innerHTML = '';
    
    if (appData.tests.length === 0) {
        emptyState.style.display = 'flex';
        tbody.parentElement.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tbody.parentElement.style.display = 'table';

    // Sort tests by date desc
    const sorted = [...appData.tests].sort((a,b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(test => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${test.date}</td>
            <td style="font-weight: 500;">${test.name}</td>
            <td>${test.topicCovered || '-'}</td>
            <td>${test.gsScore || '-'}</td>
            <td>${test.csatScore || '-'}</td>
            <td>${test.accuracy ? test.accuracy + '%' : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
    
    renderMainsTests();
    renderMains();
}

function renderMainsTests() {
    const tbody = document.getElementById('mains-tests-table-body');
    const emptyState = document.getElementById('mains-tests-empty-state');
    
    tbody.innerHTML = '';
    
    if (!appData.mainsTests) appData.mainsTests = [];
    
    if (appData.mainsTests.length === 0) {
        emptyState.style.display = 'flex';
        tbody.parentElement.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tbody.parentElement.style.display = 'table';

    const sorted = [...appData.mainsTests].sort((a,b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.date}</td>
            <td style="font-weight: 500;">${m.name}</td>
            <td>${m.subject}</td>
            <td>${m.topicCovered || '-'}</td>
            <td>${m.score || '-'}</td>
            <td>${m.remarks || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMains() {
    const tbody = document.getElementById('mains-table-body');
    const emptyState = document.getElementById('mains-empty-state');
    
    tbody.innerHTML = '';
    
    if (!appData.mains) appData.mains = [];
    
    if (appData.mains.length === 0) {
        emptyState.style.display = 'flex';
        tbody.parentElement.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tbody.parentElement.style.display = 'table';

    // Sort tests by date desc
    const sorted = [...appData.mains].sort((a,b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.date}</td>
            <td style="font-weight: 500;">${m.subject}</td>
            <td>${m.topic}</td>
            <td>${m.topicCovered || '-'}</td>
            <td>${m.score || '-'}</td>
            <td>${m.remarks || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}


// ===================
// Habit Rendering
// ===================
function renderHabits() {
    const grid = document.getElementById('habits-page-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if(!appData.habits) appData.habits = [];
    
    // We use local date string
    const dNow = new Date();
    // Offset by timezone so toISOString gives local date part
    const tzOffsetMs = dNow.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dNow - tzOffsetMs)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];
    
    appData.habits.forEach(habit => {
        if(!habit.history) habit.history = {};
        
        let streak = calculateStreak(habit.history, todayStr);
        let completedToday = !!habit.history[todayStr];
        
        // Build 90-day dot grid
        let dotsHtml = '';
        for(let i=89; i>=0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let ds = (new Date(d - tzOffsetMs)).toISOString().split('T')[0];
            let isDone = !!habit.history[ds];
            let displayDate = `${d.getDate()}/${d.getMonth()+1}`;
            
            dotsHtml += `<div class="habit-dot ${isDone ? 'completed' : (i===0 && !completedToday ? '' : 'missed')}" title="${displayDate}"></div>`;
        }

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.innerHTML = `
            <div class="habit-header">
                <div>
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-streak"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2c0 0-4.5 4.5-4.5 9.5A4.5 4.5 0 0 0 12 16a4.5 4.5 0 0 0 4.5-4.5C16.5 6.5 12 2 12 2zm0 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path></svg> ${streak} Day Streak</div>
                </div>
                <button class="btn btn-sm ${completedToday ? 'btn-outline' : 'btn-primary'}" onclick="toggleHabit('${habit.id}', '${todayStr}')" style="min-width: 80px; ${completedToday ? 'border-color: #ef4444; color: #ef4444;' : ''}">
                    ${completedToday ? 'Remove' : 'Complete'}
                </button>
            </div>
            <div class="habit-footer">
                <div class="habit-dots-container">
                    ${dotsHtml}
                </div>
                <button class="timer-btn-icon" onclick="deleteHabit('${habit.id}')" title="Delete Habit" style="opacity:0.5; transform:scale(0.85); padding: 5px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function calculateStreak(history, todayStr) {
    let streak = 0;
    
    const dNow = new Date();
    const tzOffsetMs = dNow.getTimezoneOffset() * 60000;
    let d = new Date(dNow);
    
    // Check today first
    if (history[todayStr]) {
        streak++;
        d.setDate(d.getDate() - 1);
    } else {
        // If today is not done, check if yesterday was done (to maintain streak)
        d.setDate(d.getDate() - 1);
        let ds = (new Date(d - tzOffsetMs)).toISOString().split('T')[0];
        if(!history[ds]) return 0; // Streak completely broken
    }
    
    while(true) {
        let ds = (new Date(d - tzOffsetMs)).toISOString().split('T')[0];
        if (history[ds]) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

window.toggleHabit = function(id, dateStr) {
    const habit = appData.habits.find(h => h.id === id);
    if(habit) {
        if(habit.history[dateStr]) {
            delete habit.history[dateStr];
        } else {
            habit.history[dateStr] = true;
        }
        saveData();
        renderHabits();
    }
}

window.deleteHabit = function(id) {
    appData.habits = appData.habits.filter(h => h.id !== id);
    saveData();
    renderHabits();
}


// ===================
// Timetable Rendering
// ===================
function renderTimetable() {
    const container = document.getElementById('timetable-container');
    container.innerHTML = '';
    
    // Init backward compat
    if(!appData.timetable) appData.timetable = [];

    // Sort logic to make sure time orders correctly
    const sortedTT = [...appData.timetable].sort((a,b) => a.startTime.localeCompare(b.startTime));
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
        const dayEntries = sortedTT.filter(t => t.day === day);
        
        const col = document.createElement('div');
        col.className = 'tt-day-col';
        
        col.innerHTML = `<div class="tt-day-header">${day}</div>`;
        
        function getHueForSubject(s) {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
                hash = s.charCodeAt(i) + ((hash << 5) - hash);
            }
            return Math.abs(hash) % 360;
        }

        if(dayEntries.length === 0) {
            col.innerHTML += `<div style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding-top:1rem;">No blocks</div>`;
        } else {
            dayEntries.forEach(entry => {
                const h = getHueForSubject(entry.subject.trim().toLowerCase());
                col.innerHTML += `
                    <div class="tt-block" style="border-left-color: hsl(${h}, 70%, 60%); background: hsla(${h}, 40%, 25%, 0.4);">
                        <div class="tt-time" style="color: hsl(${h}, 80%, 75%);">${entry.startTime} - ${entry.endTime}</div>
                        <div class="tt-subj">${entry.subject}</div>
                        <button class="tt-delete" onclick="deleteTimetableEntry('${entry.id}')">Delete</button>
                    </div>
                `;
            });
        }
        container.appendChild(col);
    });
}

window.deleteTimetableEntry = function(id) {
    appData.timetable = appData.timetable.filter(t => t.id !== id);
    saveData();
    renderTimetable();
}


// ===================
// Modals & Events
// ===================

// Modal Controllers
const modals = {
    addSubject: document.getElementById('addSubjectModal'),
    addTopic: document.getElementById('addTopicModal'),
    addTest: document.getElementById('addTestModal'),
    addMainsTest: document.getElementById('addMainsTestModal'),
    addTimetable: document.getElementById('addTimetableModal'),
    addMains: document.getElementById('addMainsModal'),
    addHabit: document.getElementById('addHabitModal'),
    addGoal: document.getElementById('addGoalModal'),
    addNote: document.getElementById('addNoteModal'),
    addMissed: document.getElementById('addMissedModal'),
    addNoteRevision: document.getElementById('addNoteRevisionModal')
};

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.remove('active');
    });
});

// Habit
document.getElementById('openAddHabitModal').addEventListener('click', () => {
    document.getElementById('newHabitName').value = '';
    modals.addHabit.classList.add('active');
});

document.getElementById('saveHabitBtn').addEventListener('click', () => {
    const name = document.getElementById('newHabitName').value.trim();
    if(name) {
        if(!appData.habits) appData.habits = [];
        appData.habits.push({
            id: 'habit_' + generateId(),
            name: name,
            history: {}
        });
        saveData();
        modals.addHabit.classList.remove('active');
        renderHabits();
    }
});

// Notes Logic
document.getElementById('openAddNoteModal').addEventListener('click', () => {
    document.getElementById('newNoteTitle').value = '';
    document.getElementById('newNoteContent').value = '';
    modals.addNote.classList.add('active');
});

document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
    const title = document.getElementById('newNoteTitle').value.trim();
    const content = document.getElementById('newNoteContent').value.trim();
    
    if (content) {
        if (!appData.notes) appData.notes = [];
        appData.notes.unshift({
            id: 'note_' + generateId(),
            title: title || 'Untitled Note',
            content: content,
            createdAt: new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
        });
        saveData();
        modals.addNote.classList.remove('active');
        renderNotes();
    }
});

const notesSearchInput = document.getElementById('notesSearchInput');
if (notesSearchInput) {
    notesSearchInput.addEventListener('input', (e) => {
        renderNotes(e.target.value.toLowerCase());
    });
}

function renderNotes(filter = "") {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (!appData.notes) appData.notes = [];
    
    const filtered = appData.notes.filter(note => 
        (note.title || '').toLowerCase().includes(filter) || 
        (note.content || '').toLowerCase().includes(filter)
    );
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No notes found.</div>`;
        return;
    }
    
    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
            <div class="note-header">
                <div>
                    <div class="note-title">${note.title}</div>
                    <div class="note-date">${note.createdAt}</div>
                </div>
            </div>
            <div class="note-body">${note.content}</div>
            <div class="note-footer">
                <button class="note-delete-btn" onclick="deleteNote('${note.id}')" title="Delete Note">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.deleteNote = function(id) {
    appData.notes = appData.notes.filter(n => n.id !== id);
    saveData();
    renderNotes();
};

// Note Revisions Logic
document.getElementById('openAddNoteRevisionModal')?.addEventListener('click', () => {
    document.getElementById('revTopic').value = '';
    document.getElementById('revRemarks').value = '';
    const dateInput = document.getElementById('revDate');
    if (dateInput) {
        // Offset by timezone so toISOString gives local date part
        const dNow = new Date();
        const tzOffsetMs = dNow.getTimezoneOffset() * 60000;
        dateInput.value = (new Date(dNow - tzOffsetMs)).toISOString().split('T')[0];
    }
    
    // Populate subjects
    const subSelect = document.getElementById('revSubject');
    if (subSelect) {
        subSelect.innerHTML = '';
        appData.subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.name;
            opt.textContent = sub.name;
            subSelect.appendChild(opt);
        });
    }

    modals.addNoteRevision.classList.add('active');
});

document.getElementById('saveNoteRevisionBtn')?.addEventListener('click', () => {
    const date = document.getElementById('revDate').value;
    const subject = document.getElementById('revSubject').value;
    const type = document.getElementById('revType').value;
    const topic = document.getElementById('revTopic').value.trim();
    const remarks = document.getElementById('revRemarks').value.trim();

    if (date && subject && type && topic) {
        if (!appData.noteRevisions) appData.noteRevisions = [];
        appData.noteRevisions.push({
            id: 'n_rev_' + generateId(),
            date,
            subject,
            type,
            topic,
            remarks
        });
        saveData();
        modals.addNoteRevision.classList.remove('active');
        renderNoteRevisions();
    }
});

document.getElementById('filterNoteRevSubject')?.addEventListener('change', () => {
    renderNoteRevisions();
});

document.getElementById('filterNoteRevType')?.addEventListener('change', () => {
    renderNoteRevisions();
});

function renderNoteRevisions() {
    const tbody = document.getElementById('note-revisions-table-body');
    const emptyState = document.getElementById('note-revisions-empty-state');
    const filterSubjectSelect = document.getElementById('filterNoteRevSubject');
    const filterTypeSelect = document.getElementById('filterNoteRevType');
    
    if (!tbody || !filterSubjectSelect || !filterTypeSelect) return;
    
    // Populate subject filter dropdown if empty
    if (filterSubjectSelect.options.length === 0) {
        if (appData.subjects && appData.subjects.length > 0) {
            appData.subjects.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.name;
                opt.textContent = sub.name;
                filterSubjectSelect.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = "None";
            opt.textContent = "No Subjects Available";
            filterSubjectSelect.appendChild(opt);
        }
    }

    tbody.innerHTML = '';
    if (!appData.noteRevisions) appData.noteRevisions = [];
    
    const selectedSubject = filterSubjectSelect.value;
    const selectedType = filterTypeSelect.value;
    
    // Filter the revisions by selected subject and type
    const filteredRevs = appData.noteRevisions.filter(rev => {
        const matchesSubject = rev.subject === selectedSubject;
        const matchesType = selectedType === 'ALL' || rev.type === selectedType;
        return matchesSubject && matchesType;
    });
    
    if (filteredRevs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (tbody.parentElement) tbody.parentElement.style.display = 'none';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (tbody.parentElement) tbody.parentElement.style.display = 'table';
    
    // Sort by Subject, then by Date descending
    const sortedRevs = [...filteredRevs].sort((a, b) => {
        if (a.subject < b.subject) return -1;
        if (a.subject > b.subject) return 1;
        return new Date(b.date) - new Date(a.date);
    });
    
    let currentSubject = null;
    
    sortedRevs.forEach(rev => {
        // Group header
        if (rev.subject !== currentSubject) {
            const headerRow = document.createElement('tr');
            headerRow.style.background = 'rgba(255, 255, 255, 0.05)';
            headerRow.innerHTML = `
                <td colspan="5" style="font-weight: 700; color: var(--primary); padding-top: 1.5rem;">
                    ${rev.subject}
                </td>
            `;
            tbody.appendChild(headerRow);
            currentSubject = rev.subject;
        }

        const dateStr = new Date(rev.date).toLocaleDateString([], { day:'numeric', month:'short' });
        const typeBadgeColor = rev.type === 'Mains PYQ' ? '#f59e0b' : (rev.type === 'Standard Book' ? '#3b82f6' : '#10b981');
        const typeBadge = `<span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:${typeBadgeColor}; border:1px solid ${typeBadgeColor}44; padding:2px 6px; border-radius:4px; background:${typeBadgeColor}11;">${rev.type || 'Study Notes'}</span>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
            <td>${typeBadge}</td>
            <td>-</td>
            <td style="font-weight: 500; color: var(--text-main);">${rev.topic}</td>
            <td style="color: var(--text-muted);">${rev.remarks || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Goals Logic
document.getElementById('openAddGoalModal').addEventListener('click', () => {
    document.getElementById('newGoalText').value = '';
    modals.addGoal.classList.add('active');
});

document.getElementById('saveGoalBtn').addEventListener('click', () => {
    const text = document.getElementById('newGoalText').value.trim();
    const category = document.getElementById('newGoalCategory').value;
    
    if (text) {
        if (!appData.goals) appData.goals = [];
        appData.goals.push({
            id: 'goal_' + generateId(),
            text: text,
            category: category,
            completed: false,
            createdAt: new Date().getTime()
        });
        saveData();
        modals.addGoal.classList.remove('active');
        renderGoals();
    }
});

function renderGoals() {
    const dailyList = document.getElementById('goals-daily-list');
    const weeklyList = document.getElementById('goals-weekly-list');
    const milestoneList = document.getElementById('goals-milestone-list');
    
    if (!dailyList || !weeklyList || !milestoneList) return;
    
    dailyList.innerHTML = '';
    weeklyList.innerHTML = '';
    milestoneList.innerHTML = '';
    
    if (!appData.goals) appData.goals = [];
    
    appData.goals.forEach(goal => {
        const item = document.createElement('div');
        item.className = `goal-item ${goal.completed ? 'completed' : ''}`;
        item.draggable = true;
        
        // Drag events
        item.addEventListener('dragstart', (e) => handleGoalDragStart(e, goal.id, goal.category));
        item.addEventListener('dragover', (e) => e.preventDefault());
        item.addEventListener('dragenter', (e) => item.classList.add('drag-over'));
        item.addEventListener('dragleave', (e) => item.classList.remove('drag-over'));
        item.addEventListener('drop', (e) => handleGoalDrop(e, goal.id, goal.category));
        item.addEventListener('dragend', () => item.classList.remove('dragging'));

        item.innerHTML = `
            <div class="goal-drag-handle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
            </div>
            <div class="goal-checkbox" onclick="toggleGoal('${goal.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div class="goal-content">
                <div class="goal-text">${goal.text}</div>
            </div>
            <button class="goal-delete" onclick="deleteGoal('${goal.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        
        if (goal.category === 'daily') dailyList.appendChild(item);
        else if (goal.category === 'weekly') weeklyList.appendChild(item);
        else if (goal.category === 'milestone') milestoneList.appendChild(item);
    });
}

function handleGoalDragStart(e, id, category) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('category', category);
    e.target.classList.add('dragging');
}

function handleGoalDrop(e, targetId, category) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedCategory = e.dataTransfer.getData('category');
    
    // Only reorder within the same category
    if (draggedCategory !== category || draggedId === targetId) return;

    const draggedIndex = appData.goals.findIndex(g => g.id === draggedId);
    const targetIndex = appData.goals.findIndex(g => g.id === targetId);

    if (draggedIndex > -1 && targetIndex > -1) {
        // Move item in array
        const [draggedItem] = appData.goals.splice(draggedIndex, 1);
        appData.goals.splice(targetIndex, 0, draggedItem);
        saveData();
        renderGoals();
    }
}

window.toggleGoal = function(id) {
    const goal = appData.goals.find(g => g.id === id);
    if (goal) {
        goal.completed = !goal.completed;
        saveData();
        renderGoals();
    }
};

window.deleteGoal = function(id) {
    appData.goals = appData.goals.filter(g => g.id !== id);
    saveData();
    renderGoals();
};

// Subject
document.getElementById('openAddSubjectModal').addEventListener('click', () => {
    document.getElementById('newSubjectName').value = '';
    modals.addSubject.classList.add('active');
});

document.getElementById('saveSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('newSubjectName').value.trim();
    if (name) {
        appData.subjects.push({ id: 'sub_' + generateId(), name, topics: [] });
        saveData();
        modals.addSubject.classList.remove('active');
        renderSyllabus();
    }
});

// Topic
window.openTopicModal = function() {
    const actSubj = appData.subjects.find(s => s.id === activeSubjectId);
    if(actSubj) {
        document.getElementById('topicSubjectNameDisplay').textContent = actSubj.name;
        document.getElementById('newTopicName').value = '';
        modals.addTopic.classList.add('active');
    }
}

document.getElementById('saveTopicBtn').addEventListener('click', () => {
    const name = document.getElementById('newTopicName').value.trim();
    if (name && activeSubjectId) {
        const subj = appData.subjects.find(s => s.id === activeSubjectId);
        subj.topics.push({
            id: 'top_' + generateId(),
            name,
            status: 'NotStarted',
            completionDate: null,
            revisionCount: 0
        });
        saveData();
        modals.addTopic.classList.remove('active');
        renderSyllabus();
    }
});

// Test
document.getElementById('openAddTestModal').addEventListener('click', () => {
    document.getElementById('testDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('testName').value = '';
    document.getElementById('testScoreGS').value = '';
    document.getElementById('testScoreCSAT').value = '';
    document.getElementById('testAccuracy').value = '';
    document.getElementById('testTopicCovered').value = '';
    modals.addTest.classList.add('active');
});

document.getElementById('saveTestBtn').addEventListener('click', () => {
    const date = document.getElementById('testDate').value;
    const name = document.getElementById('testName').value.trim();
    const gsScore = document.getElementById('testScoreGS').value;
    const csatScore = document.getElementById('testScoreCSAT').value;
    const accuracy = document.getElementById('testAccuracy').value;
    const topicCovered = document.getElementById('testTopicCovered').value.trim();

    if (date && name) {
        appData.tests.push({
            id: 'test_' + generateId(),
            date, name, gsScore, csatScore, accuracy, topicCovered
        });
        saveData();
        modals.addTest.classList.remove('active');
        renderTests();
    }
});

// Mains
document.getElementById('openAddMainsModal').addEventListener('click', () => {
    document.getElementById('mainsDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('mainsSubject').value = '';
    document.getElementById('mainsTopic').value = '';
    document.getElementById('mainsScore').value = '';
    document.getElementById('mainsRemarks').value = '';
    document.getElementById('mainsTopicCovered').value = '';
    modals.addMains.classList.add('active');
});

document.getElementById('saveMainsBtn').addEventListener('click', () => {
    const date = document.getElementById('mainsDate').value;
    const subject = document.getElementById('mainsSubject').value.trim();
    const topic = document.getElementById('mainsTopic').value.trim();
    const score = document.getElementById('mainsScore').value.trim();
    const remarks = document.getElementById('mainsRemarks').value.trim();
    const topicCovered = document.getElementById('mainsTopicCovered').value.trim();

    if (date && subject && topic) {
        if (!appData.mains) appData.mains = [];
        
        appData.mains.push({
            id: 'mains_' + generateId(),
            date, subject, topic, score, remarks, topicCovered
        });
        saveData();
        modals.addMains.classList.remove('active');
        renderTests(); // Actually renders both tests and mains
    }
});

// Mains Mock Test
document.getElementById('openAddMainsTestModal').addEventListener('click', () => {
    document.getElementById('mtDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('mtName').value = '';
    document.getElementById('mtSubject').value = '';
    document.getElementById('mtTopicCovered').value = '';
    document.getElementById('mtScore').value = '';
    document.getElementById('mtRemarks').value = '';
    modals.addMainsTest.classList.add('active');
});

document.getElementById('saveMainsTestBtn').addEventListener('click', () => {
    const date = document.getElementById('mtDate').value;
    const name = document.getElementById('mtName').value.trim();
    const subject = document.getElementById('mtSubject').value.trim();
    const topicCovered = document.getElementById('mtTopicCovered').value.trim();
    const score = document.getElementById('mtScore').value.trim();
    const remarks = document.getElementById('mtRemarks').value.trim();

    if (date && name && subject) {
        if (!appData.mainsTests) appData.mainsTests = [];
        
        appData.mainsTests.push({
            id: 'mtest_' + generateId(),
            date, name, subject, topicCovered, score, remarks
        });
        saveData();
        modals.addMainsTest.classList.remove('active');
        renderTests();
    }
});

// Timetable
document.getElementById('openAddTimetableModal').addEventListener('click', () => {
    const d = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    document.getElementById('ttDay').value = days[d.getDay()];
    
    // Default to the next nearest hour for frictionless adding
    const h = (d.getHours() % 24).toString().padStart(2, '0');
    const hNext = ((d.getHours() + 2) % 24).toString().padStart(2, '0');
    document.getElementById('ttStartTime').value = `${h}:00`;
    document.getElementById('ttEndTime').value = `${hNext}:00`;
    document.getElementById('ttSubject').value = '';
    modals.addTimetable.classList.add('active');
});

document.getElementById('saveTimetableBtn').addEventListener('click', () => {
    const day = document.getElementById('ttDay').value;
    const startTime = document.getElementById('ttStartTime').value;
    const endTime = document.getElementById('ttEndTime').value;
    const subject = document.getElementById('ttSubject').value.trim();

    if (day && startTime && endTime && subject) {
        if(!appData.timetable) appData.timetable = [];
        
        appData.timetable.push({
            id: 'tt_' + generateId(),
            day, startTime, endTime, subject
        });
        saveData();
        modals.addTimetable.classList.remove('active');
        renderTimetable();
        checkUpcomingSessions();
    }
});

// Reset Data
document.getElementById('resetDataBtn').addEventListener('click', () => {
    if(confirm("Are you sure you want to reset all data? This cannot be undone!")) {
        appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
        saveData();
        init();
    }
});

// Initialize
function init() {
    updateRevBadge();
    updateExamCountdown();
    // Clean up old App Opened logs if any
    if (appData.logs) {
        appData.logs = appData.logs.filter(l => l.type !== 'App Opened');
    }
    renderDashboard();
    // Default open dashboard
    navItems[0].click();
}

// Missed Work Events
document.getElementById('openAddMissedModal')?.addEventListener('click', () => {
    document.getElementById('missedDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('missedSubject').value = '';
    document.getElementById('missedNote').value = '';
    modals.addMissed.classList.add('active');
});

document.getElementById('saveMissedWorkBtn')?.addEventListener('click', () => {
    const type = document.getElementById('missedType').value;
    const date = document.getElementById('missedDate').value;
    const subject = document.getElementById('missedSubject').value.trim();
    const priority = document.getElementById('missedPriority').value;
    const note = document.getElementById('missedNote').value.trim();
    
    if (date && subject) {
        if (!appData.missedWork) appData.missedWork = [];
        appData.missedWork.push({
            id: 'missed_' + generateId(),
            type, date, subject, priority, note,
            status: 'Pending'
        });
        saveData();
        modals.addMissed.classList.remove('active');
        renderMissedWork();
        renderDashboard();
    }
});

document.querySelectorAll('[data-missed-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-missed-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMissedFilter = btn.getAttribute('data-missed-filter');
        renderMissedWork();
    });
});

init();

// ===================
// Focus Timer Logic
// ===================
let timerInterval;
let timerMode = 'countdown'; // 'countdown' or 'stopwatch'
let timeRemaining = 0; // used for countdown
let totalTime = 0; // used for countdown warning
let stopwatchTime = 0; // used for stopwatch
let sessionActive = false;
let sessionSecondsCount = 0;

const timerWidget = document.getElementById('focusTimer');
const toggleTimerBtn = document.getElementById('toggleTimerBtn');
const timerDisplay = document.getElementById('timerDisplay');
const timerInputGroup = document.getElementById('timerInputGroup');
const timerH = document.getElementById('timerH');
const timerM = document.getElementById('timerM');
const timerS = document.getElementById('timerS');
const startTimerBtn = document.getElementById('startTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const timerMessage = document.getElementById('timerMessage');

// Tabs
const modeCountdownBtn = document.getElementById('modeCountdownBtn');
const modeStopwatchBtn = document.getElementById('modeStopwatchBtn');

// Fullscreen Elements
const fsBtn = document.getElementById('fullscreenTimerBtn');

// Toggle Minimize/Maximize
document.getElementById('timerHeader').addEventListener('click', (e) => {
    if(e.target.closest('button')) return; // Ignore if clicking any button inside header
    timerWidget.classList.toggle('minimized');
});

document.getElementById('toggleTimerBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    timerWidget.classList.toggle('minimized');
});

modeCountdownBtn.addEventListener('click', () => {
    if(timerInterval) resetTimer();
    timerMode = 'countdown';
    modeCountdownBtn.classList.add('active');
    modeStopwatchBtn.classList.remove('active');
    timerInputGroup.style.display = 'flex';
    updateTimerDisplay();
});

modeStopwatchBtn.addEventListener('click', () => {
    if(timerInterval) resetTimer();
    timerMode = 'stopwatch';
    modeStopwatchBtn.classList.add('active');
    modeCountdownBtn.classList.remove('active');
    timerInputGroup.style.display = 'none';
    updateTimerDisplay();
});

// Fullscreen Toggles
fsBtn.addEventListener('click', () => {
    timerWidget.classList.toggle('isfullscreen');
});

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
}

function updateTimerDisplay() {
    let t = timerMode === 'countdown' ? timeRemaining : stopwatchTime;
    let formatted = formatTime(t);
    
    timerDisplay.textContent = formatted;
    
    // Warning logic: Countdown only
    if (timerMode === 'countdown' && timeRemaining > 0 && timeRemaining <= 120 && totalTime > 120) {
        timerDisplay.classList.add('warning');
        timerMessage.classList.remove('hidden');
    } else {
        timerDisplay.classList.remove('warning');
        timerMessage.classList.add('hidden');
    }
}

function resetTimer() {
    if (sessionActive && sessionSecondsCount > 0) {
        logEvent('Focus Session', sessionSecondsCount, `Manual reset (${timerMode})`);
    }
    clearInterval(timerInterval);
    timerInterval = null;
    timeRemaining = 0;
    totalTime = 0;
    stopwatchTime = 0;
    sessionActive = false;
    sessionSecondsCount = 0;
    startTimerBtn.textContent = 'Start';
    startTimerBtn.classList.replace('btn-outline', 'btn-primary');
    
    if (timerMode === 'countdown') {
        timerInputGroup.style.display = 'flex';
        timerH.value = '';
        timerM.value = '';
        timerS.value = '';
    }
    updateTimerDisplay();
    timerMessage.classList.add('hidden');
    timerMessage.textContent = "Time is almost up!"; // reset message
}

startTimerBtn.addEventListener('click', () => {
    if (startTimerBtn.textContent === 'Start') {
        // Start or Resume
        if (timerMode === 'countdown') {
            if (timeRemaining <= 0) {
                const h = parseInt(timerH.value) || 0;
                const m = parseInt(timerM.value) || 0;
                const s = parseInt(timerS.value) || 0;
                const totalSec = (h * 3600) + (m * 60) + s;
                if (totalSec <= 0) return;
                timeRemaining = totalSec;
                totalTime = totalSec;
            }
            timerInputGroup.style.display = 'none';
        }
        
        startTimerBtn.textContent = 'Pause';
        startTimerBtn.classList.replace('btn-primary', 'btn-outline');
        sessionActive = true;

        timerInterval = setInterval(() => {
            sessionSecondsCount++;
            if (timerMode === 'countdown') {
                if (timeRemaining > 0) {
                    timeRemaining--;
                } else {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    if (sessionActive && sessionSecondsCount > 0) {
                        logEvent('Focus Session', sessionSecondsCount, `Countdown completed`);
                    }
                    sessionActive = false;
                    sessionSecondsCount = 0;
                    startTimerBtn.textContent = 'Start';
                    startTimerBtn.classList.replace('btn-outline', 'btn-primary');
                    timerMessage.textContent = "Time's up!";
                    timerMessage.classList.remove('hidden');
                }
            } else {
                // Stopwatch
                stopwatchTime++;
            }
            updateTimerDisplay();
        }, 1000);
        updateTimerDisplay();
    } else {
        // Pause
        clearInterval(timerInterval);
        timerInterval = null;
        if (sessionActive && sessionSecondsCount > 0) {
            logEvent('Focus Session', sessionSecondsCount, `Session paused (${timerMode})`);
        }
        sessionActive = false;
        sessionSecondsCount = 0;
        startTimerBtn.textContent = 'Start';
        startTimerBtn.classList.replace('btn-outline', 'btn-primary');
    }
});

resetTimerBtn.addEventListener('click', resetTimer);

// Initialize timer display
updateTimerDisplay();
// ===================
// PDF Export System
// ===================

function calculateOverallProgress() {
    let total = 0;
    let completed = 0;
    appData.subjects.forEach(subject => {
        total += subject.topics.length;
        completed += subject.topics.filter(t => t.status === 'Completed').length;
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}

document.getElementById('exportPDFBtn')?.addEventListener('click', () => {
    exportToPDF();
});

window.exportToPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('en-IN');
    
    // Set Mechanical Font (Courier)
    doc.setFont("courier", "normal");
    
    // Branding & Header (Simple & Monochrome)
    const addHeader = (title) => {
        doc.setFont("courier", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0); 
        doc.text("UPSC PREPARATION TRACKER", 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(title.toUpperCase(), 105, 28, { align: 'center' });
        
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.text(`DATE GENERATED: ${timestamp}`, 105, 35, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(0);
        doc.line(20, 40, 190, 40);
    };

    // 1. Overview Page
    addHeader("EXAM PREPARATION OVERVIEW");

    const progress = calculateOverallProgress();
    const daysLeft = Math.ceil((new Date('2028-03-01') - new Date()) / (1000 * 60 * 60 * 24));

    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.text("CURRENT SNAPSHOT", 20, 55);

    const overviewData = [
        ["TOTAL SYLLABUS COMPLETION", `${progress}%`],
        ["DAYS TO 2028 TARGET", daysLeft],
        ["SUBJECTS BEING TRACKED", appData.subjects.length],
        ["PENDING BACKLOG ITEMS", (appData.missedWork || []).filter(m => m.status === 'Pending').length],
        ["TOTAL DEEP WORK LOGS", (appData.logs || []).length]
    ];

    doc.autoTable({
        startY: 60,
        head: [['METRIC', 'VALUE']],
        body: overviewData,
        theme: 'grid',
        styles: { font: 'courier', textColor: 0, lineColor: 0 },
        headStyles: { fillColor: 240, textColor: 0, fontStyle: 'bold' }
    });

    // 2. Syllabus Page
    doc.addPage();
    addHeader("SYLLABUS PROGRESS TRACKER");

    let currentY = 50;
    appData.subjects.forEach((subj, idx) => {
        const completed = (subj.topics || []).filter(t => t.status === 'Completed').length;
        const total = (subj.topics || []).length;

        doc.setFont("courier", "bold");
        doc.setFontSize(12);
        doc.text(`${idx + 1}. ${subj.name.toUpperCase()} (${completed}/${total} TOPICS)`, 20, currentY);

        const topicRows = (subj.topics || []).map(t => [t.name, t.status.toUpperCase(), t.revisionCount || 0]);

        doc.autoTable({
            startY: currentY + 4,
            head: [['TOPIC NAME', 'STATUS', 'REVISIONS']],
            body: topicRows,
            theme: 'grid',
            styles: { font: 'courier', fontSize: 9, textColor: 0 },
            headStyles: { fillColor: 240, textColor: 0 },
            margin: { left: 20 }
        });

        currentY = doc.lastAutoTable.finalY + 12;
        if (currentY > 260 && idx < appData.subjects.length - 1) {
            doc.addPage();
            addHeader("SYLLABUS PROGRESS TRACKER (CONT)");
            currentY = 50;
        }
    });

    // 3. Mock Test Page
    doc.addPage();
    addHeader("MOCK TEST PERFORMANCE");

    doc.setFont("courier", "bold");
    doc.text("PRELIMS MOCK TEST HISTORY", 20, 50);
    doc.autoTable({
        startY: 55,
        head: [['DATE', 'TEST NAME', 'GS', 'CSAT', 'ACCURACY', 'TOPICS']],
        body: (appData.tests || []).map(t => [t.date, t.name, t.gsScore, t.csatScore, t.accuracy, t.topicCovered || '-']),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 8 },
        headStyles: { fillColor: 240, textColor: 0 }
    });

    doc.addPage();
    addHeader("MOCK TEST PERFORMANCE (MAINS)");
    doc.setFont("courier", "bold");
    doc.text("MAINS FULL TESTS & ANSWER WRITING", 20, 50);
    doc.autoTable({
        startY: 55,
        head: [['DATE', 'TEST NAME', 'SUBJECT', 'SCORE', 'REMARKS']],
        body: (appData.mainsTests || []).map(t => [t.date, t.name, t.subject, t.score, t.remarks || '-']),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 8 },
        headStyles: { fillColor: 240, textColor: 0 }
    });

    // 4. Session Logs & Habits
    doc.addPage();
    addHeader("FOCUS SESSION HISTORY");
    doc.autoTable({
        startY: 50,
        head: [['DATE', 'MIN', 'TYPE', 'REMARKS']],
        body: (appData.logs || []).map(l => [new Date(l.timestamp).toLocaleDateString(), Math.round(l.duration / 60), l.type.toUpperCase(), l.remarks || '-']),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 8 },
        headStyles: { fillColor: 240, textColor: 0 }
    });

    doc.addPage();
    addHeader("HABIT CONSISTENCY");
    doc.autoTable({
        startY: 50,
        head: [['HABIT NAME', 'STREAK']],
        body: (appData.habits || []).map(h => [h.name.toUpperCase(), calculateStreak(h.history || [], new Date().toISOString().split('T')[0])]),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 9 },
        headStyles: { fillColor: 240, textColor: 0 }
    });

    // 5. Goals & Backlog
    doc.addPage();
    addHeader("STRATEGIC TARGETS & BACKLOG");
    doc.setFont("courier", "bold");
    doc.text("STRATEGIC GOALS", 20, 50);
    doc.autoTable({
        startY: 54,
        head: [['CATEGORY', 'DESCRIPTION', 'STATUS']],
        body: (appData.goals || []).map(g => [g.category.toUpperCase(), g.text, g.completed ? "COMPLETED" : "PENDING"]),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 9 },
        headStyles: { fillColor: 240, textColor: 0 }
    });

    doc.text("PENDING BACKLOG RECOVERY", 20, doc.lastAutoTable.finalY + 12);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 16,
        head: [['TYPE', 'SUBJECT', 'PRIORITY', 'STATUS']],
        body: (appData.missedWork || []).map(m => [m.type.toUpperCase(), m.subject, m.priority.toUpperCase(), m.status.toUpperCase()]),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 9 },
        headStyles: { fillColor: 240, textColor: 0 }
    });

    // 6. Think Pad (Notes)
    const notesPage = (appData.notes || []);
    if (notesPage.length > 0) {
        doc.addPage();
        addHeader("THINK PAD: STUDY NOTES");
        let noteY = 50;
        notesPage.forEach(n => {
            doc.setFont("courier", "bold");
            doc.setFontSize(12);
            doc.text((n.title || "UNTITLED NOTE").toUpperCase(), 20, noteY);
            
            doc.setFont("courier", "normal");
            doc.setFontSize(9);
            doc.text(n.createdAt || "N/A", 190, noteY, { align: 'right' });

            doc.setFontSize(10);
            const splitContent = doc.splitTextToSize(n.content || "", 170);
            doc.text(splitContent, 20, noteY + 6);

            noteY += (splitContent.length * 5) + 15;
            if (noteY > 270) {
                doc.addPage();
                addHeader("THINK PAD: STUDY NOTES (CONT)");
                noteY = 50;
            }
        });
    }

    // Save PDF
    doc.save(`UPSC_DATA_REPORT_${new Date().toISOString().split('T')[0]}.pdf`);
};
