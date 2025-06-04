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
            width: 350px;
            height: 85%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            overflow-y: auto;
            padding: 1rem;
            box-sizing: border-box;
            border-radius: 8px;
            pointer-events: auto;
            z-index: 10;
          }
          h2 { margin-top: 0; }
          table {
            width: 100%;
            border-collapse: collapse;
            color: white;
          }
          th, td {
            padding: 0.5rem;
            text-align: left;
            border-bottom: 1px solid #ccc;
            font-size: 0.85rem;
          }
          th {
            background-color: #444;
            position: sticky;
            top: 0;
          }
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
            <h2>History Table</h2>
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
          </div>
        </div>

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
        old_status = task.status
        task.status = 'deleted'
        db.session.commit()
        timestamp = datetime.now().strftime("%I:%M:%S %p")
        action = f'Task "{task.text}" was deleted from {old_status}'
        history_entry = History(action=action, timestamp=timestamp)
        db.session.add(history_entry)
        db.session.commit()
        return jsonify({'message': 'Task marked as deleted'}), 200
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

@app.route('/reset', methods=['POST'])
def reset_all():
    Task.query.delete()
    History.query.delete()
    db.session.commit()
    return jsonify({'message': 'All cleared'}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
