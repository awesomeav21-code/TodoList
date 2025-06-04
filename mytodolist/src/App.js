import React, { Component } from 'react';
import './App.css';

// Main App component using a class-based approach
class App extends Component {
  constructor(props) {
    super(props);

    // Initial state setup
    this.state = {
      tasks: [],               // Array to hold all task objects
      newTask: '',             // Text input for new task
      newStatus: 'todo',       // Default status for new task
      draggedTaskId: null,     // ID of task being dragged
      history: []              // Stores history of task actions
    };
  }

  // Updates the newTask value as the user types
  handleChange = (event) => {
    this.setState({ newTask: event.target.value });
  };

  // Updates the selected status for the new task
  handleStatusChange = (event) => {
    this.setState({ newStatus: event.target.value });
  };

  // Deletes a task and updates history
  handleDeleteTask = (taskId) => {
    const updatedTasks = this.state.tasks.filter(task => task.id !== taskId);
    const deletedTask = this.state.tasks.find(task => task.id === taskId);

    const newHistoryEntry = deletedTask
      ? `Task "${deletedTask.text}" was deleted from ${deletedTask.status}`
      : `A task was deleted`;
//set the state for the history 
    this.setState({
      tasks: updatedTasks,
      history: [...this.state.history, newHistoryEntry]
    });
  };

  // Resets the board: clears tasks, input, and history
  handleReset = () => {
    this.setState({
      tasks: [],
      history: [],
      newTask: '',
      newStatus: 'todo',
      draggedTaskId: null
    });
  };

  // Adds a new task to the board and logs the action in history
  handleAddTask = () => {
    if (this.state.newTask.trim() === '') return;  // Prevent empty task creation

    const newTask = {
      id: `task-${Date.now()}`,         // Unique ID using timestamp
      text: this.state.newTask,
      status: this.state.newStatus
    };

    const newHistoryEntry = `Task "${newTask.text}" added to ${newTask.status}`;

    this.setState({
      tasks: [...this.state.tasks, newTask],
      newTask: '',
      newStatus: 'todo',
      history: [...this.state.history, newHistoryEntry]
    });
  };

  // Called when dragging starts; saves the ID of the dragged task
  handleDragStart = (taskId) => {
    this.setState({ draggedTaskId: taskId });
  };

  // Allows dragged items to be dropped on this column
  handleDragOver = (event) => {
    event.preventDefault();
  };

  // Called when a task is dropped into a new column/status
  handleDrop = (newStatus) => {
    const updatedTasks = this.state.tasks.map((task) => {
      if (task.id === this.state.draggedTaskId && task.status !== newStatus) {
        const newHistoryEntry = `Task "${task.text}" moved to ${newStatus}`;
        this.setState({
          history: [...this.state.history, newHistoryEntry]
        });
        return { ...task, status: newStatus };
      }
      return task;
    });

    this.setState({ tasks: updatedTasks, draggedTaskId: null });
  };

  // Returns a background color based on task status
  getTaskColor = (status) => {
    if (status === 'completed') return '#d4edda';        // green
    if (status === 'in-progress') return '#fff3cd';      // yellow
    return '#f8d7da';                                     // red for todo
  };

  // Reusable function to render a single column of tasks
  renderColumn = (statusLabel, statusKey) => {
    return (
      <div
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
                <button
                  onClick={() => this.handleDeleteTask(task.id)}
                  style={{
                    marginLeft: '1rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'red',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  X
                </button>
              </li>
            ))}
        </ul>
      </div>
    );
  };

  // Main render method
  render() {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>To Do List</h1>

        {/* Task input and status selection */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
        </div>

        {/* Reset button placed clearly below */}
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={this.handleReset}
            style={{
              backgroundColor: '#f2f2f2',
              border: '1px solid #999',
              padding: '0.5rem 1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reset Board
          </button>
        </div>

        {/* Task columns: To Do, In Progress, Completed */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem' }}>
          {this.renderColumn('To Do', 'todo')}
          {this.renderColumn('In Progress', 'in-progress')}
          {this.renderColumn('Completed', 'completed')}
        </div>

        {/* History log */}
        <div style={{ marginTop: '2rem' }}>
          <h2>Task History</h2>
          <div style={{
            maxHeight: '150px',
            overflowY: 'scroll',
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '4px'
          }}>
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
