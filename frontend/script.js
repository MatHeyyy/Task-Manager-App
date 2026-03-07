// Function to add a new task
async function addTask() {
    const input = document.getElementById('taskInput');
    const taskContent = input.value;

    const response = await fetch('http://127.0.0.1:5000/api/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: taskContent })
    });

    if (response.ok) {
        input.value = '';
        loadTasks();
    }
}

// Function to load tasks from the backend
async function loadTasks() {
    const response = await fetch('http://127.0.0.1:5000/api/tasks');
    const tasks = await response.json();

    const list = document.getElementById('taskList');
    list.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.innerHTML = `
            ${task.content}
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
        `;
        list.appendChild(li);
    });
}

// Load tasks when the page loads
window.onload = loadTasks;