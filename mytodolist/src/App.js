import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Always start empty on a fresh React launch
      tasks: [],
      newTask: '',
      newStatus: 'todo',
      draggedTaskId: null,
      history: [],
      currentFrame: ''
    };
  }

  // Returns current time as a string (hh:mm:ss AM/PM)
  getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString();
  };

  // On mounting, do NOT fetch from Flask. Leaving this blank
  // guarantees the UI starts with tasks=[] and history=[] every time.
  componentDidMount() {
    // Intentionally left empty for a blank UI on npm start or full page reload
  }

  // Handles typing into the "new task" input field
  handleChange = (event) => {
    this.setState({ newTask: event.target.value });
  };

  // Handles selecting a status in the dropdown for a new task
  handleStatusChange = (event) => {
    this.setState({ newStatus: event.target.value });
  };

  // Called when the user clicks "Add Task"
  // Immediately POSTs the new task and history entry to Flask,
  // then updates React state so the task appears in the UI.
  handleAddTask = () => {
    if (this.state.newTask.trim() === '') {
      alert('No task entered');
      return;
    }
  
    const newTask = {
      id: `task-${Date.now()}`,
      text: this.state.newTask,
      status: this.state.newStatus
    };
  
    const time = this.getCurrentTime();
    const newHistoryEntry = `Task "${newTask.text}" added to ${newTask.status} at ${time}`;
  
    // Persist the new task to Flask immediately
    fetch('http://127.0.0.1:5000/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });
  
    // Persist the corresponding history entry immediately
    fetch('http://127.0.0.1:5000/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: newHistoryEntry, timestamp: time })
    });
  
    // Update local React state so the UI shows the new task and history
    this.setState({
      tasks: [...this.state.tasks, newTask],
      newTask: '',
      newStatus: 'todo',
      history: [...this.state.history, newHistoryEntry]
    });
  };
  
  // Called when the user clicks the "X" button next to a task
  // Immediately DELETEs the task in Flask and POSTs a history entry,
  // then updates React state so the task is removed from UI.
  handleDeleteTask = (taskId) => {
    const deletedTask = this.state.tasks.find(task => task.id === taskId);
    const updatedTasks = this.state.tasks.filter(task => task.id !== taskId);

    const time = this.getCurrentTime();
    const newHistoryEntry = deletedTask
      ? `Task "${deletedTask.text}" was deleted from ${deletedTask.status} at ${time}`
      : `A task was deleted at ${time}`;

    // Persist deletion immediately
    fetch(`http://127.0.0.1:5000/tasks/${taskId}`, {
      method: 'DELETE'
    });

    // Persist history entry immediately
    fetch('http://127.0.0.1:5000/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: newHistoryEntry, timestamp: time })
    });

    // Update local React state to remove the task and add history
    this.setState({
      tasks: updatedTasks,
      history: [...this.state.history, newHistoryEntry]
    });
  };

  // Called when the user clicks "Reset Board" in React.
  // This only clears the UI (React state), not the backend.
  handleReset = () => {
    this.setState({
      tasks: [],
      history: [],
      newTask: '',
      newStatus: 'todo',
      draggedTaskId: null
    });
  };

  // Called when dragging begins on a task item: store its ID
  handleDragStart = (taskId) => {
    this.setState({ draggedTaskId: taskId });
  };

  // Required to allow a drop target to accept dragged items
  handleDragOver = (event) => {
    event.preventDefault();
  };

  // Handles dropping a task into a new column/status.
  // Immediately PUTs the status change to Flask, POSTs history,
  // then updates React state so the UI moves the task.
  handleDrop = (newStatus) => {
    const updatedTasks = this.state.tasks.map((task) => {
      if (task.id === this.state.draggedTaskId && task.status !== newStatus) {
        const time = this.getCurrentTime();
        const newHistoryEntry = `Task "${task.text}" moved to ${newStatus} at ${time}`;

        // Persist status update to Flask
        fetch(`http://127.0.0.1:5000/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        // Persist history entry
        fetch('http://127.0.0.1:5000/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: newHistoryEntry, timestamp: time })
        });

        // Update React state’s history
        this.setState({
          history: [...this.state.history, newHistoryEntry]
        });

        // Return a new task object with updated status
        return { ...task, status: newStatus };
      }
      return task;
    });

    // Update React state’s tasks and clear draggedTaskId
    this.setState({ tasks: updatedTasks, draggedTaskId: null });
  };

  // Choose background color based on the task’s status
  getTaskColor = (status) => {
    if (status === 'completed') return '#d4edda';       // light green
    if (status === 'in-progress') return '#fff3cd';     // light yellow
    return '#f8d7da';                                   // light red (todo)
  };

  // Renders a column (“To Do”, “In Progress”, or “Completed”)
  renderColumn = (statusLabel, statusKey) => {
    return (
      <div
        className="column"
        onDragOver={this.handleDragOver}
        onDrop={() => this.handleDrop(statusKey)}
        style={{
          width: '30%',
          minHeight: '200px',
          border: '1px solid #ccc',
          padding: '1rem',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9'
        }}
      >
        <h2>{statusLabel}</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {this.state.tasks
            .filter((task) => task.status === statusKey)
            .map((task) => (
              <li
                key={task.id}
                draggable
                onDragStart={() => this.handleDragStart(task.id)}
                className="task"
                style={{
                  background: this.getTaskColor(task.status),
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  cursor: 'grab',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{task.text}</span>
                <button onClick={() => this.handleDeleteTask(task.id)}>X</button>
              </li>
            ))}
        </ul>
      </div>
    );
  };

  // Render the entire UI
  render() {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>To Do List</h1>

        {/* Row: new task input, status selector, Add Task, View History */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            value={this.state.newTask}
            onChange={this.handleChange}
            placeholder="Enter a task"
          />

          <select value={this.state.newStatus} onChange={this.handleStatusChange}>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button onClick={this.handleAddTask}>Add Task</button>

          {/* This link always opens the Flask video player at "/" 
              which persists all tasks in the backend. */}
          <a href="http://127.0.0.1:5000/" target="_blank" rel="noreferrer">
            <button>View History</button>
          </a>
        </div>

        {/* Reset Board: clears React’s UI state only */}
        <div style={{ marginTop: '1rem' }}>
          <button onClick={this.handleReset}>Reset Board</button>
        </div>

        {/* Three columns side by side */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem' }}>
          {this.renderColumn('To Do', 'todo')}
          {this.renderColumn('In Progress', 'in-progress')}
          {this.renderColumn('Completed', 'completed')}
        </div>

        {/* Task History below columns */}
        <div style={{ marginTop: '2rem' }}>
          <h2>Task History</h2>
          <div
            className="history-container"
            style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}
          >
            {this.state.history.length === 0 ? (
              <p>No history yet.</p>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                {this.state.history.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
