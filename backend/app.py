"""Taskify's Flask API and database models."""

from datetime import date

from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Application setup and shared validation constants.
app = Flask(__name__)
CORS(app)

# SQLite stores the local database in Flask's instance directory.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

PROJECT_COLOURS = {'primary', 'secondary', 'success', 'danger', 'warning', 'info'}


# A project groups related tasks and owns the project color shown in the UI.
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    colour = db.Column(db.String(20), default='primary')
    tasks = db.relationship('Task', backref='project', lazy=True)

# Tasks keep their project relationship optional so standalone tasks are valid.
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    complete = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='Medium')
    due_date = db.Column(db.String(20), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)

# Create the database tables the first time the application starts.
with app.app_context():
    db.create_all()

# --- PROJECT API ---

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([{'id': p.id, 'name': p.name, 'colour': p.colour, 'task_count': len(p.tasks)} for p in projects])

@app.route('/api/projects', methods=['POST'])
def add_project():
    if not request.is_json:
        return jsonify({"message": "Request must be JSON."}), 400

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    colour = (data.get('colour') or 'primary').strip()

    if not name:
        return jsonify({"message": "Project name cannot be empty."}), 400

    if len(name) > 100:
        return jsonify({"message": "Project name must be 100 characters or fewer."}), 400

    if colour not in PROJECT_COLOURS:
        return jsonify({"message": "Project colour is invalid."}), 400

    new_project = Project(name=name, colour=colour)
    db.session.add(new_project)
    db.session.commit()
    return jsonify({"message": "Project created!"}), 201

@app.route('/api/projects/<int:id>', methods=['PATCH'])
def update_project(id):
    project = db.session.get(Project, id)
    if not project:
        return jsonify({"message": "Project not found!"}), 404
    if not request.is_json:
        return jsonify({"message": "Request must be JSON."}), 400

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    colour = (data.get('colour') or '').strip()

    if not name:
        return jsonify({"message": "Project name cannot be empty."}), 400
    if len(name) > 100:
        return jsonify({"message": "Project name must be 100 characters or fewer."}), 400
    if colour not in PROJECT_COLOURS:
        return jsonify({"message": "Project colour is invalid."}), 400

    project.name = name
    project.colour = colour
    db.session.commit()
    return jsonify({"message": "Project updated!"}), 200

@app.route('/api/projects/<int:id>', methods=['DELETE'])
def delete_project(id):
    project = db.session.get(Project, id)
    if not project:
        return jsonify({"message": "Project not found!"}), 404

    for task in project.tasks:
        task.project_id = None
    db.session.delete(project)
    db.session.commit()
    return jsonify({"message": "Project deleted!"}), 200

# --- TASK API ---

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    task = Task.query.all()
    # Return only the fields the frontend needs to render a task.
    return jsonify([{'id': t.id, 'content': t.content, 'completed': t.complete, 'priority': t.priority, 'due_date': t.due_date, 'project_id': t.project_id} for t in task])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    if not request.is_json:
        return jsonify({"message": "Request must be JSON."}), 400

    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    priority = (data.get('priority') or 'Medium').strip()
    due_date = (data.get('due_date') or '').strip()
    project_id = data.get('project_id')

    if not content:
        return jsonify({"message": "Task content cannot be empty."}), 400

    if len(content) > 200:
        return jsonify({"message": "Task content must be 200 characters or fewer."}), 400

    new_task = Task(content=content, priority=priority, due_date=due_date, project_id=project_id)
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"message": "Task saved!"}), 201

@app.route('/api/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    task = db.session.get(Task, id)
    if task:
        db.session.delete(task)
        db.session.commit()
        return jsonify({"message": "Task deleted!"}), 200
    return jsonify({"message": "Task not found!"}), 404

@app.route('/api/tasks/<int:id>', methods=['PATCH'])
def toggle_task(id):
    task = db.session.get(Task, id)

    if not task:
        return jsonify({"message": "Task not found!"}), 404

    # JSON PATCH edits task details; an empty PATCH remains the completion toggle.
    if request.is_json:
        data = request.get_json(silent=True) or {}
        content = (data.get('content') or '').strip()
        priority = (data.get('priority') or '').strip()
        due_date = (data.get('due_date') or '').strip()
        project_id = data.get('project_id')

        if not content:
            return jsonify({"message": "Task content cannot be empty."}), 400
        if len(content) > 200:
            return jsonify({"message": "Task content must be 200 characters or fewer."}), 400
        if priority not in {'High', 'Medium', 'Low'}:
            return jsonify({"message": "Priority must be High, Medium, or Low."}), 400
        if due_date:
            try:
                date.fromisoformat(due_date)
            except ValueError:
                return jsonify({"message": "Due date must be a valid date."}), 400
        if project_id is not None:
            try:
                project_id = int(project_id)
            except (TypeError, ValueError):
                return jsonify({"message": "Project must be valid."}), 400
            if not db.session.get(Project, project_id):
                return jsonify({"message": "Project not found."}), 400

        task.content = content
        task.priority = priority
        task.due_date = due_date or None
        task.project_id = project_id
        db.session.commit()
        return jsonify({"message": "Task updated!"}), 200

    task.complete = not task.complete
    db.session.commit()
    return jsonify({"message": "Task updated!", "completed": task.complete}), 200


@app.route('/api/data', methods=['DELETE'])
def delete_all_data():
    deleted_tasks = Task.query.delete()
    deleted_projects = Project.query.delete()
    db.session.commit()

    return jsonify({
        "message": "All data deleted.",
        "deleted_tasks": deleted_tasks,
        "deleted_projects": deleted_projects
    }), 200

# Start the development server when this file is run directly.
if __name__ == '__main__':
    app.run(debug=True, port=5050)