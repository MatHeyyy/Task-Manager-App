const API_BASE_URL = window.location.hostname
    ? `http://${window.location.hostname}:5050`
    : 'http://127.0.0.1:5050';

function showError(message) {
    console.error(message);
    alert(message);
}

// Function to add a new task
async function addTask() {
    const input = document.getElementById('taskInput');
    const priorityInput = document.getElementById('taskPriority');
    const dateInput = document.getElementById('taskDueDate');

    const taskContent = input.value.trim();
    if (!taskContent) {
        showError('Task cannot be empty.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: taskContent, priority: priorityInput.value, due_date: dateInput.value })
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
            return;
        }

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
        <span class="task-text" style="${textStyle}">${task.content}</span>
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

// Function to toggle sidebar visibility
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('is-collapsed');
}

// Load tasks when the page loads
window.onload = loadTasks;

document.getElementById('taskInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addTask();
    }
});