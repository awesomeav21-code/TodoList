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
    history_entries = History.query.all()

    html = """
    <!DOCTYPE html>
    <html>
      <head>
        <title>Task History Playback</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f7fa; padding: 2rem; }
          .video-container { position: relative; width: 640px; margin-bottom: 1rem; }
          video {
            width: 100%;
            border: 1px solid #ccc;
            border-radius: 8px;
            display: block;
          }
          .overlay {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 300px;
            height: 85%;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            overflow-y: auto;
            padding: 1rem;
            box-sizing: border-box;
            border-radius: 8px;
            pointer-events: auto;
            z-index: 10;
          }
          h2 { margin-top: 0; }
          ul { list-style: none; margin: 0; padding: 0; }
          li { padding: 0.25rem 0; }
          .history-entry { color: #dddddd; font-style: italic; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <h1>Task History Playback</h1>

        <div class="video-container">
          <video controls>
            <source src="/static/sample.mp4" type="video/mp4">
            Your browser does not support the video tag.
          </video>

          <div class="overlay">
            <h2>History</h2>
            <ul>
              {% for h in history_entries %}
                <li class="history-entry">{{ h.action }} at {{ h.timestamp }}</li>
              {% endfor %}
            </ul>
          </div>
        </div>

        <script>
          setInterval(() => location.reload(), 10000);
        </script>
      </body>
    </html>
    """
    return render_template_string(html, history_entries=history_entries)

@app.route('/history-view')
def history_view():
    history_entries = History.query.all()
    html = """
    <!DOCTYPE html>
    <html>
      <head>
        <title>Full History</title>
        <style>
          body { font-family: Arial, sans-serif; background:#f9f9f9; padding:2rem; }
          h1 { color: #333; }
          ul { list-style: none; padding: 0; }
          li { padding: 0.5rem 0; border-bottom: 1px solid #ddd; }
          .timestamp { font-size: 0.9rem; color: #666; }
        </style>
      </head>
      <body>
        <h1>Task History</h1>
        <ul>
          {% for h in history_entries %}
            <li>
              <div>{{ h.action }}</div>
              <div class="timestamp">{{ h.timestamp }}</div>
            </li>
          {% endfor %}
        </ul>
      </body>
    </html>
    """
    return render_template_string(html, history_entries=history_entries)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/reset', methods=['POST'])
def reset_all():
    Task.query.delete()
    History.query.delete()
    db.session.commit()
    return jsonify({'message': 'All cleared'}), 200

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{'id': t.id, 'text': t.text, 'status': t.status} for t in tasks])

@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    task = Task(id=data['id'], text=data['text'], status=data['status'])
    db.session.add(task)
    try:
        db.session.commit()
        return jsonify({'message': 'Task added'}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Duplicate ID'}), 409

@app.route('/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task:
        task.status = 'deleted'
        db.session.commit()
        timestamp = datetime.now().strftime("%I:%M:%S %p")
        action = f'Task "{task.text}" was deleted'
        history_entry = History(action=action, timestamp=timestamp)
        db.session.add(history_entry)
        db.session.commit()
        return jsonify({'message': 'Task marked as deleted'}), 200
    return jsonify({'message': 'Task not found'}), 404

@app.route('/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    task = Task.query.get(task_id)
    if task:
        task.status = data['status']
        db.session.commit()
        return jsonify({'message': 'Task updated'}), 200
    return jsonify({'message': 'Task not found'}), 404

@app.route('/history', methods=['GET'])
def get_history():
    history = History.query.all()
    return jsonify([{'action': h.action, 'timestamp': h.timestamp} for h in history])

@app.route('/history', methods=['POST'])
def add_history():
    data = request.get_json()
    new_entry = History(action=data['action'], timestamp=data['timestamp'])
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({'message': 'History recorded'}), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
