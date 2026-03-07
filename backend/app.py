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

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    task = Task.query.all()
    # Convert the list of tasks to a list of dictionaries
    return jsonify([{'id': t.id, 'content': t.content} for t in task])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    new_task = Task(content=data['content'])
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"message": "Task saved!"}), 201

if __name__ == '__main__':
    app.run(debug=True)