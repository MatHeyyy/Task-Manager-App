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

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                ${task.content}
                <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
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

// Load tasks when the page loads
window.onload = loadTasks;