from flask import Flask, request, jsonify, render_template_string, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Task(db.Model):
    id = db.Column(db.String, primary_key=True)
    text = db.Column(db.String, nullable=False)
    status = db.Column(db.String, nullable=False)

class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String, nullable=False)
    timestamp = db.Column(db.String, nullable=False)

@app.route('/')
def home():
    history_entries = History.query.order_by(History.id.desc()).all()

    html = """
    <!DOCTYPE html>
    <html>
      <head>
        <title>Task History Table</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f7fa;
            padding: 2rem;
          }
          h1 {
            margin-bottom: 1rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            color: black;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #ccc;
          }
          th {
            background-color: #444;
            color: white;
          }
          tr:hover {
            background-color: #f1f1f1;
          }
        </style>
      </head>
      <body>
        <h1>Task History Table</h1>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {% for h in history_entries %}
              <tr>
                <td>{{ h.action }}</td>
                <td>{{ h.timestamp }}</td>
              </tr>
            {% endfor %}
          </tbody>
        </table>
        <script>
          setInterval(() => location.reload(), 10000);
        </script>
      </body>
    </html>
    """
    return render_template_string(html, history_entries=history_entries)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{'id': t.id, 'text': t.text, 'status': t.status} for t in tasks])

@app.route('/tasks', methods=['POST'])
def add_task():
    if not request.is_json:
        return jsonify({'error': 'Request content-type must be application/json'}), 400

    data = request.get_json()
    if not data or 'id' not in data or 'text' not in data or 'status' not in data:
        return jsonify({'error': 'Missing required task fields'}), 400

    try:
        task = Task(id=data['id'], text=data['text'], status=data['status'])
        db.session.add(task)
        db.session.commit()
        return jsonify({'message': 'Task added'}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Duplicate ID'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task:
        old_status = task.status
        text = task.text

        db.session.delete(task)

        # Log deletion to history
        timestamp = datetime.now().strftime("%I:%M:%S %p")
        action = f'Task "{text}" deleted from {old_status}'
        history_entry = History(action=action, timestamp=timestamp)

        db.session.add(history_entry)
        db.session.commit()

        return jsonify({'message': 'Task deleted and logged'}), 200
    return jsonify({'message': 'Task not found'}), 404

@app.route('/history', methods=['GET'])
def get_history():
    history = History.query.order_by(History.id.desc()).all()
    return jsonify([{'action': h.action, 'timestamp': h.timestamp} for h in history])

@app.route('/history', methods=['POST'])
def add_history():
    data = request.get_json()
    new_entry = History(action=data['action'], timestamp=data['timestamp'])
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({'message': 'History recorded'}), 201

@app.route('/tasks/<task_id>', methods=['PUT'])
def update_task_status(task_id):
    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({'error': 'Missing status field'}), 400

    task = Task.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    old_status = task.status
    task.status = data['status']
    db.session.commit()

    if old_status != data['status']:
        timestamp = datetime.now().strftime("%I:%M:%S %p")
        action = f'Task "{task.text}" moved to {data["status"]}'
        history_entry = History(action=action, timestamp=timestamp)
        db.session.add(history_entry)
        db.session.commit()

    return jsonify({'message': 'Status updated'}), 200

@app.route('/reset', methods=['POST'])
def reset_all():
    Task.query.delete()
    History.query.delete()
    db.session.commit()
    return jsonify({'message': 'All cleared'}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5050)
