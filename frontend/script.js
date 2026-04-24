const API_BASE_URL = window.location.hostname
    ? `http://${window.location.hostname}:5050`
    : 'http://127.0.0.1:5050';

let calendarInstance = null;
let calendarInitialized = false;

// Utility function to show error messages
function showError(message) {
    console.error(message);
    alert(message);
}

//Utility function to sanitise user input to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// Function to refresh calendar events after task updates
function refreshCalendar() {
    if (calendarInstance) {
        calendarInstance.refetchEvents();
    }
}

// Function to set the active state on the sidebar navigation links
function setActiveSidebarView(view) {
    const dashboardLink = document.getElementById('dashboardNavLink');
    const upcomingLink = document.getElementById('upcomingNavLink');
    const projectsLink = document.getElementById('projectsNavLink');
    const settingsLink = document.getElementById('settingsNavLink');

    [dashboardLink, upcomingLink, projectsLink, settingsLink].forEach(link => {
        if (!link) return;
        link.classList.remove('bg-primary', 'bg-opacity-25');
    });

    const activeLink = view === 'calendar' ? upcomingLink : view === 'projects' ? projectsLink : view === 'settings' ? settingsLink : dashboardLink;
    if (activeLink) {
        activeLink.classList.add('bg-primary', 'bg-opacity-25');
    }
}

// Function to show the selected view and hide others
function showView(view) {
    const dashboardView = document.getElementById('dashboardView');
    const calendarView = document.getElementById('calendarView');
    const projectsView = document.getElementById('projectsView');
    const settingsView = document.getElementById('settingsView');

    if (!dashboardView || !calendarView || !projectsView || !settingsView) {
        return;
    }

    const showingCalendar = view === 'calendar';
    const showingProjects = view === 'projects';
    const showingSettings = view === 'settings';

    dashboardView.classList.toggle('d-none', showingCalendar || showingProjects || showingSettings);
    calendarView.classList.toggle('d-none', !showingCalendar);
    projectsView.classList.toggle('d-none', !showingProjects);
    settingsView.classList.toggle('d-none', !showingSettings);
    setActiveSidebarView(view);

    if (showingCalendar) {
        if (!calendarInitialized) {
            initCalendar();
        } else if (calendarInstance) {
            requestAnimationFrame(() => calendarInstance.updateSize());
        }
    }
}

// Function to add a new task
async function addTask() {
    const input = document.getElementById('taskInput');
    const priorityInput = document.getElementById('taskPriority');
    const dateInput = document.getElementById('taskDueDate');
    const projectInput = document.getElementById('taskProject');

    const taskContent = input.value.trim();
    if (!taskContent) {
        showError('Task cannot be empty.');
        return;
    }

    const saveBtn = document.querySelector('#addTaskModal .btn-primary');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: taskContent, priority: priorityInput.value, due_date: dateInput.value, project_id: projectInput.value ? parseInt(projectInput.value) : null })
        });

        if (!response.ok) {
            showError('Failed to add task.');
            return;
        }

        input.value = '';
        priorityInput.value = 'Medium';
        dateInput.value = '';
        await loadTasks();
    } catch (error) {
        showError('Could not connect to backend while adding task.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Task';
    }
}

// Function to load tasks from the backend
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`);
        if (!response.ok) {
            showError('Failed to load tasks.');
            return;
        }

        const tasks = await response.json();

        let completedCount = 0;
        let urgentCount = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        tasks.forEach(task => {
            if (task.completed) {
                completedCount++;
            } else {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    if (dueDate <= tomorrow) {
                        urgentCount++;
                    }
                } else if (task.priority === 'High') {
                    urgentCount++;
                }
            }
        });

        const remainingCount = tasks.length - completedCount;
        document.getElementById('overviewWidget').textContent = `${remainingCount} tasks remaining today. ${completedCount} completed!`;
        document.getElementById('urgentWidget').textContent = `${urgentCount} urgent tasks due within 24 hours.`;

        const list = document.getElementById('taskList');
        list.innerHTML = '';

        if (tasks.length === 0) {
            list.innerHTML = `
        <div class="text-center p-5">
            <img src="https://cdn-icons-png.flaticon.com/512/5058/5058436.png" style="width: 80px; opacity: 0.5;">
            <p class="text-muted mt-3">All caught up!</p>
        </div>
    `;
        } else {
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex align-items-center border-0 mb-2 shadow-sm rounded';

                const isChecked = task.completed ? 'checked' : '';
                const textStyle = task.completed ? 'text-decoration: line-through; color: #adb5bd' : '';
                const badgeColor = task.priority === 'High'
                    ? 'danger'
                    : task.priority === 'Low'
                        ? 'success'
                        : 'warning';
                const dateHtml = task.due_date
                    ? `<small class="text-muted ms-2"><i class="bi bi-calendar-event"></i> ${task.due_date}</small>`
                    : '';

                li.innerHTML = `
        <input class="form-check-input me-2" type="checkbox" ${isChecked} onclick="toggleTask(${task.id})">
        <span class="task-text" style="${textStyle}">${escapeHtml(task.content)}</span>
        <div class="d-flex align-items-center mt-1">
                <span class="badge bg-${badgeColor} bg-opacity-75 text-white rounded-pill px-2" style="font-size: 0.7em;">${task.priority}</span>
                ${dateHtml}
        </div>
        <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteTask(${task.id})">
            <i class="bi bi-trash"></i> Delete
        </button>
    `;
                list.appendChild(li);
            });
        }

        refreshCalendar();
    } catch (error) {
        showError(`Could not connect to backend while loading tasks. (${error.message})`);
    }
}

// Function to delete a task
async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            showError('Failed to delete task.');
            return;
        }

        await loadTasks();
    } catch (error) {
        showError('Could not connect to backend while deleting task.');
    }
}

// Function to toggle task completion status
async function toggleTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            showError('Failed to toggle task status.');
            return;
        }

        await loadTasks();
    } catch (error) {
        showError('Could not connect to backend while toggling task status.');
    }
}

// Function to load projects and update the UI
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects`);
        if (!response.ok) throw new Error('Failed to load projects.');

        const projects = await response.json();

        const container = document.getElementById('projectsListContainer');
        if (container) {
            container.innerHTML = '';
            if (projects.length === 0) {
                container.innerHTML = '<div class="text-center p-5 text-muted">No projects yet. Create your first one!</div>';
            } else {
                projects.forEach(p => {
                    container.innerHTML += `
                    <div class="col-md-4 mb-4">
                            <div class="card shadow-sm border-0 h-100 border-top border-${p.colour} border-4">
                                <div class="card-body p-4">
                                    <h5 class="fw-bold mb-1">${escapeHtml(p.name)}</h5>
                                    <p class="text-muted small mb-0"><i class="bi bi-list-check"></i> ${p.task_count} Tasks</p>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
        }

        const projectSelect = document.getElementById('taskProject');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">None (Standalone Task)</option>';
            projects.forEach(p => {
                projectSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
            });
        }
    } catch (error) {
        showError(`Error loading projects. (${error.message})`);
    }
}

// Function to add a new project
async function addProject() {
    const nameInput = document.getElementById('projectName');
    const colourInput = document.getElementById('projectColour');
    const projectName = nameInput.value.trim();

    if (!projectName) {
        showError('Project name cannot be empty.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName, colour: colourInput.value })
        });

        if (!response.ok)throw new Error('Failed to add project.');
        
        nameInput.value = '';
        colourInput.value = 'primary';
        await loadProjects();
    } catch (error) {
        showError(`Error: (${error.message})`);
    }
}

// Function to delete all data (tasks + projects)
async function deleteAllData() {
    const confirmed = window.confirm('Delete all tasks and projects? This cannot be undone.');
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/data`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            showError('Failed to delete all data.');
            return;
        }

        await Promise.all([loadTasks(), loadProjects()]);
    } catch (error) {
        showError('Could not connect to backend while deleting all data.');
    }
}

// Function to toggle sidebar visibility
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('is-collapsed');
}

// Function to initialise the calendar
function initCalendar() {
    const calendarEL = document.getElementById('calendar');
    if (!calendarEL) return;

    calendarInstance = new FullCalendar.Calendar(calendarEL, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        height: 650,
        events: async function (fetchInfo, successCallback, failureCallback) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/tasks`);
                const tasks = await response.json();

                const calendarEvents = tasks
                    .filter(task => task.due_date)
                    .map(task => {
                        let eventColour = '#ffc107'; // Default to yellow for Medium priority
                        if (task.priority === 'High') {
                            eventColour = '#dc3545'; // Red for High priority
                        } else if (task.priority === 'Low') {
                            eventColour = '#198754'; // Green for Low priority
                        }

                        return {
                            id: task.id,
                            title: escapeHtml(task.content),
                            start: task.due_date,
                            color: eventColour,
                            classNames: task.completed ? ['opacity-50', 'text-decoration-line-through'] : []
                        };
                    });

                successCallback(calendarEvents);
            } catch (error) {
                console.error("Calendar fetch error:", error);
                failureCallback(error);
            }
        }
    });

    calendarInitialized = true;
    calendarInstance.render();
}

// Function to apply and save theme preference
function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('taskify_theme', theme);
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = theme;
    }
}

// Function to check saveed preferences and load them
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('taskify_theme') || 'light';
    setTheme(savedTheme);
}

// Load tasks when the page loads
window.onload = () => {
    loadSavedTheme();
    loadTasks();
    loadProjects();
    showView('dashboard');
}

document.getElementById('dashboardNavLink').addEventListener('click', function (event) {
    event.preventDefault();
    showView('dashboard');
});

document.getElementById('upcomingNavLink').addEventListener('click', function (event) {
    event.preventDefault();
    showView('calendar');
});

document.getElementById('taskInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addTask();
    }
});

document.getElementById('projectsNavLink').addEventListener('click', function (event) {
    event.preventDefault();
    showView('projects');
});

document.getElementById('settingsNavLink').addEventListener('click', function (event) {
    event.preventDefault();
    showView('settings');
});

document.getElementById('themeSelect').addEventListener('change', function (event) {
    setTheme(event.target.value);
});
