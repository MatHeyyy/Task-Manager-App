# Task Manager App

Simple full-stack task manager for learning:
- Backend: Flask + SQLite
- Frontend: HTML + Bootstrap + vanilla JavaScript

## Quick Start

1. Create and activate a virtual environment (recommended):
```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend:
```bash
python backend/app.py
```

4. Open the frontend:
- Open `frontend/index.html` in your browser.
- The frontend calls the API at `http://127.0.0.1:5000`.

## Project Structure

```text
backend/app.py        # Flask API and SQLite model
frontend/index.html   # UI
frontend/script.js    # Frontend logic (fetch/add/delete tasks)
instance/database.db  # SQLite database file (created automatically)
```

## API Endpoints

- `GET /api/tasks` -> returns all tasks
- `POST /api/tasks` -> creates a task
	- JSON body: `{ "content": "Your task" }`
- `DELETE /api/tasks/<id>` -> deletes a task by id

## Notes

- Task content is required and must be 200 characters or fewer.
- Database tables are auto-created on backend startup.
