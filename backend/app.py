from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Initialize the Flask application
app = Flask(__name__)
CORS(app)

# Configure the database URI, this tells Flask where to store the database file
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db = SQLAlchemy(app)

# Define a simple Task model for demonstration purposes
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)

#Create the database file
with app.app_context():
    db.create_all()

# Define route to get all tasks
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    task = Task.query.all()
    # Convert the list of tasks to a list of dictionaries
    return jsonify([{'id': t.id, 'content': t.content} for t in task])

# Define route to add a new task
@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    new_task = Task(content=data['content'])
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"message": "Task saved!"}), 201

# Define route to delete a task by ID
@app.route('/api/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    task = Task.query.get(id)
    if task:
        db.session.delete(task)
        db.session.commit()
        return jsonify({"message": "Task deleted!"}), 200
    return jsonify({"message": "Task not found!"}), 404
if __name__ == '__main__':
    app.run(debug=True)