const API_BASE_URL = window.location.hostname
    ? `http://${window.location.hostname}:5050`
    : 'http://127.0.0.1:5050';

let calendarInstance = null;
let calendarInitialized = false;
let editingTaskId = null;
let editingProjectId = null;
let projectLookup = {};

function getProjectAccentClass(colour) {
    const accents = {
        primary: 'project-accent-primary',
        blue: 'project-accent-primary',
        secondary: 'project-accent-secondary',
        success: 'project-accent-success',
        green: 'project-accent-success',
        danger: 'project-accent-danger',
        red: 'project-accent-danger',
        warning: 'project-accent-warning',
        yellow: 'project-accent-warning',
        info: 'project-accent-info'
    };
    return accents[(colour || 'primary').toLowerCase()] || accents.primary;
}

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
        projectInput.value = '';
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
                const project = projectLookup[task.project_id];
                const projectHtml = project
                    ? `<small class="project-label ${getProjectAccentClass(project.colour)}"><i class="bi bi-folder2"></i> ${escapeHtml(project.name)}</small>`
                    : '';

                li.innerHTML = `
        <input class="form-check-input me-2" type="checkbox" ${isChecked} onclick="toggleTask(${task.id})">
        <span class="task-text" style="${textStyle}">${escapeHtml(task.content)}</span>
        <div class="d-flex align-items-center mt-1">
                <span class="badge bg-${badgeColor} bg-opacity-75 text-white rounded-pill px-2" style="font-size: 0.7em;">${task.priority}</span>
                ${dateHtml}
            ${projectHtml}
        </div>
        <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteTask(${task.id})">
            <i class="bi bi-trash"></i> Delete
        </button>
        <button class="btn btn-outline-secondary btn-sm border-0" onclick="openEditTask(${task.id})" aria-label="Edit task">
            <i class="bi bi-pencil"></i> Edit
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

function openEditTask(taskId) {
    fetch(`${API_BASE_URL}/api/tasks`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load tasks.');
            return response.json();
        })
        .then(tasks => {
            const task = tasks.find(item => item.id === taskId);
            if (!task) {
                showError('Task not found.');
                return;
            }

            editingTaskId = taskId;
            document.getElementById('editTaskInput').value = task.content;
            document.getElementById('editTaskPriority').value = task.priority;
            document.getElementById('editTaskDueDate').value = task.due_date || '';
            document.getElementById('editTaskProject').value = task.project_id || '';
            bootstrap.Modal.getOrCreateInstance(document.getElementById('editTaskModal')).show();
        })
        .catch(() => showError('Could not load task details.'));
}

async function updateTask() {
    if (editingTaskId === null) return;

    const saveButton = document.getElementById('updateTaskButton');
    const content = document.getElementById('editTaskInput').value.trim();
    if (!content) {
        showError('Task cannot be empty.');
        return;
    }

    saveButton.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${editingTaskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                priority: document.getElementById('editTaskPriority').value,
                due_date: document.getElementById('editTaskDueDate').value,
                project_id: document.getElementById('editTaskProject').value || null
            })
        });

        if (!response.ok) {
            const error = await response.json();
            showError(error.message || 'Failed to update task.');
            return;
        }

        bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
        editingTaskId = null;
        await Promise.all([loadTasks(), loadProjects()]);
    } catch (error) {
        showError('Could not connect to backend while updating task.');
    } finally {
        saveButton.disabled = false;
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
        projectLookup = Object.fromEntries(projects.map(project => [project.id, project]));

        const container = document.getElementById('projectsListContainer');
        if (container) {
            container.innerHTML = '';
            if (projects.length === 0) {
                container.innerHTML = '<div class="text-center p-5 text-muted">No projects yet. Create your first one!</div>';
            } else {
                projects.forEach(p => {
                    container.innerHTML += `
                    <div class="col-md-4 mb-4">
                            <div class="card project-card ${getProjectAccentClass(p.colour)} shadow-sm h-100">
                                <div class="card-body p-4">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <span class="project-colour-dot" aria-hidden="true"></span>
                                        <h5 class="fw-bold mb-0">${escapeHtml(p.name)}</h5>
                                    </div>
                                    <p class="text-muted small mb-0"><i class="bi bi-list-check"></i> ${p.task_count} Tasks</p>
                                    <div class="project-actions mt-3">
                                        <button class="btn btn-sm btn-outline-secondary" onclick="openEditProject(${p.id})" title="Edit project">
                                            <i class="bi bi-pencil"></i> Edit
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProject(${p.id})" title="Delete project">
                                            <i class="bi bi-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
        }

        const projectSelect = document.getElementById('taskProject');
        const editProjectSelect = document.getElementById('editTaskProject');
        if (projectSelect) {
            const options = '<option value="">None (Standalone Task)</option>' + projects
                .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
                .join('');
            projectSelect.innerHTML = options;
        }
        if (editProjectSelect) {
            editProjectSelect.innerHTML = '<option value="">None (Standalone Task)</option>';
            projects.forEach(p => {
                editProjectSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
            });
        }
    } catch (error) {
        showError(`Error loading projects. (${error.message})`);
    }
}

function openEditProject(projectId) {
    const project = projectLookup[projectId];
    if (!project) {
        showError('Project not found.');
        return;
    }

    editingProjectId = projectId;
    document.getElementById('editProjectName').value = project.name;
    document.getElementById('editProjectColour').value = getProjectAccentClass(project.colour)
        .replace('project-accent-', '')
        .replace('primary', 'primary')
        .replace('success', 'success')
        .replace('danger', 'danger')
        .replace('warning', 'warning');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('editProjectModal')).show();
}

async function updateProject() {
    if (editingProjectId === null) return;

    const saveButton = document.getElementById('updateProjectButton');
    const name = document.getElementById('editProjectName').value.trim();
    if (!name) {
        showError('Project name cannot be empty.');
        return;
    }

    saveButton.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${editingProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                colour: document.getElementById('editProjectColour').value
            })
        });

        if (!response.ok) {
            const error = await response.json();
            showError(error.message || 'Failed to update project.');
            return;
        }

        bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
        editingProjectId = null;
        await Promise.all([loadProjects(), loadTasks()]);
    } catch (error) {
        showError('Could not connect to backend while updating project.');
    } finally {
        saveButton.disabled = false;
    }
}

async function deleteProject(projectId) {
    const project = projectLookup[projectId];
    if (!project) return;

    const confirmed = window.confirm(`Delete "${project.name}"? Its tasks will be kept as standalone tasks.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            showError(error.message || 'Failed to delete project.');
            return;
        }

        await Promise.all([loadProjects(), loadTasks()]);
    } catch (error) {
        showError('Could not connect to backend while deleting project.');
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

function setAccessibilityPreference(preference, value) {
    const root = document.documentElement;
    if (preference === 'textSize') {
        root.classList.toggle('large-text', value === 'large');
    } else if (preference === 'contrast') {
        root.classList.toggle('high-contrast', value);
    } else if (preference === 'motion') {
        root.classList.toggle('reduce-motion', value);
    }
    localStorage.setItem(`taskify_${preference}`, String(value));
}

function applyAccessibilityPreferences() {
    const savedTextSize = localStorage.getItem('taskify_textSize') || 'normal';
    const savedContrast = localStorage.getItem('taskify_contrast') === 'true';
    const savedMotion = localStorage.getItem('taskify_motion');
    const reduceMotion = savedMotion === null
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : savedMotion === 'true';

    document.documentElement.classList.toggle('large-text', savedTextSize === 'large');
    document.documentElement.classList.toggle('high-contrast', savedContrast);
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);

    document.getElementById('textSizeSelect').value = savedTextSize;
    document.getElementById('contrastToggle').checked = savedContrast;
    document.getElementById('motionToggle').checked = reduceMotion;
}

// Load tasks when the page loads
window.onload = async () => {
    loadSavedTheme();
    applyAccessibilityPreferences();
    await loadProjects();
    await loadTasks();
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

document.getElementById('textSizeSelect').addEventListener('change', function (event) {
    setAccessibilityPreference('textSize', event.target.value);
});

document.getElementById('contrastToggle').addEventListener('change', function (event) {
    setAccessibilityPreference('contrast', event.target.checked);
});

document.getElementById('motionToggle').addEventListener('change', function (event) {
    setAccessibilityPreference('motion', event.target.checked);
});
