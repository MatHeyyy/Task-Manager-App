const API_BASE_URL = 'http://127.0.0.1:5000';

function showError(message) {
    console.error(message);
    alert(message);
}

// Function to add a new task
async function addTask() {
    const input = document.getElementById('taskInput');
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
            body: JSON.stringify({ content: taskContent })
        });

        if (!response.ok) {
            showError('Failed to add task.');
            return;
        }

        input.value = '';
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
            li.innerHTML = `
        <input class="form-check-input me-2" type="checkbox" ${isChecked} onclick="toggleTask(${task.id})">
        <span class="task-text" style="${textStyle}">${task.content}</span>
        <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteTask(${task.id})">
            <i class="bi bi-trash"></i> Delete
        </button>
    `;
            list.appendChild(li);
        });
    } catch (error) {
        showError('Could not connect to backend while loading tasks.');
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

// Load tasks when the page loads
window.onload = loadTasks;

document.getElementById('taskInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addTask();
    }
});