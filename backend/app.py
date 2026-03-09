from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Initialize the Flask application
app = Flask(__name__)
CORS(app)

# Configure the database URI, this tells Flask where to store the database file
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define a simple Task model for demonstration purposes
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    complete = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='Medium')
    due_date = db.Column(db.String(20), nullable=True)

#Create the database file
with app.app_context():
    db.create_all()

# Define route to get all tasks
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    task = Task.query.all()
    # Convert the list of tasks to a list of dictionaries
    return jsonify([{'id': t.id, 'content': t.content, 'completed': t.complete, 'priority': t.priority, 'due_date': t.due_date} for t in task])

# Define route to add a new task
@app.route('/api/tasks', methods=['POST'])
def add_task():
    if not request.is_json:
        return jsonify({"message": "Request must be JSON."}), 400

    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    priority = (data.get('priority') or 'Medium').strip()
    due_date = (data.get('due_date') or '').strip()

    if not content:
        return jsonify({"message": "Task content cannot be empty."}), 400

    if len(content) > 200:
        return jsonify({"message": "Task content must be 200 characters or fewer."}), 400

    new_task = Task(content=content, priority=priority, due_date=due_date)
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"message": "Task saved!"}), 201

# Define route to delete a task by ID
@app.route('/api/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    task = db.session.get(Task, id)
    if task:
        db.session.delete(task)
        db.session.commit()
        return jsonify({"message": "Task deleted!"}), 200
    return jsonify({"message": "Task not found!"}), 404

# Define route to toggle the completion status of a task by ID
@app.route('/api/tasks/<int:id>', methods=['PATCH'])
def toggle_task(id):
    task = db.session.get(Task, id)

    if not task:
        return jsonify({"message": "Task not found!"}), 404
    
    task.complete = not task.complete
    db.session.commit()
    return jsonify({"message": "Task updated!", "completed": task.complete}), 200

# Run the application
if __name__ == '__main__':
    app.run(debug=True, port=5050)