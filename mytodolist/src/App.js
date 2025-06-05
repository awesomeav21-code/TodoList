import React, { Component } from "react";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tasks: [],
      newTask: "",
      newStatus: "todo",
      draggedTaskId: null,
      history: [],
      currentFrame: ""
    };
  }

  getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString();
  };

  fetchAll = () => {
    fetch("http://127.0.0.1:5050/tasks")
      .then(res => res.json())
      .then(data => this.setState({ tasks: data }))
      .catch(err => console.error("Error loading tasks:", err));

    fetch("http://127.0.0.1:5050/history")
      .then(res => res.json())
      .then(data => this.setState({ history: data }))
      .catch(err => console.error("Error loading history:", err));
  };

  componentDidMount() {
    this.fetchAll();
  }

  handleChange = (event) => {
    this.setState({ newTask: event.target.value });
  };

  handleStatusChange = (event) => {
    this.setState({ newStatus: event.target.value });
  };

  handleAddTask = () => {
    if (this.state.newTask.trim() === "") {
      alert("No task entered");
      return;
    }
  
    const newTask = {
      id: `task-${Date.now()}`,
      text: this.state.newTask,
      status: this.state.newStatus
    };
  
    const time = this.getCurrentTime();
    const newHistoryEntry = {
      action: `Task "${newTask.text}" added to ${newTask.status}`,
      timestamp: time
    };
  
    // First add the task
    fetch("http://127.0.0.1:5050/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask)
    })
      // Then add history
      .then(() =>
        fetch("http://127.0.0.1:5050/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newHistoryEntry)
        })
      )
      // Then pull updated task + history together (backend is always source of truth)
      .then(() => this.fetchAll())
      // Then clear inputs
      .then(() =>
        this.setState({
          newTask: "",
          newStatus: "todo"
        })
      )
      .catch(err => {
        console.error("Failed to add task or update history", err);
      });
  };
  

  handleDeleteTask = (taskId) => {
    const taskToDelete = this.state.tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
  
    // Remove from backend task list
    fetch(`http://127.0.0.1:5050/tasks/${taskId}`, {
      method: "DELETE"
    })
      .then(() => {
        // Update frontend: remove the task and all matching history entries
        this.setState(prevState => ({
          tasks: prevState.tasks.filter(task => task.id !== taskId),
          history: prevState.history.filter(
            entry =>
              !entry.action.includes(`"${taskToDelete.text}"`)
          )
        }));
      })
      .catch(err => {
        console.error("Failed to delete task or update frontend", err);
      });
  };
  

  handleReset = () => {
    fetch("http://127.0.0.1:5050/reset", { method: "POST" }).then(() => {
      this.setState({
        tasks: [],
        history: [],
        newTask: "",
        newStatus: "todo",
        draggedTaskId: null
      });
    });
  };

  handleDragStart = (taskId) => {
    this.setState({ draggedTaskId: taskId });
  };

  handleDragOver = (event) => {
    event.preventDefault();
  };

  handleDrop = (newStatus) => {
    const taskToUpdate = this.state.tasks.find(
      (task) => task.id === this.state.draggedTaskId
    );
  
    if (!taskToUpdate || taskToUpdate.status === newStatus) {
      this.setState({ draggedTaskId: null });
      return;
    }
  
    fetch(`http://127.0.0.1:5050/tasks/${taskToUpdate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
      .then(() => this.fetchAll())
      .then(() => this.setState({ draggedTaskId: null }))
      .catch((err) =>
        console.error("Failed to update task status or history", err)
      );
  };
  

  getTaskColor = (status) => {
    if (status === "completed") return "#d4edda";
    if (status === "in-progress") return "#fff3cd";
    return "#f8d7da";
  };

  renderColumn = (statusLabel, statusKey) => {
    return (
      <div
        className="column"
        onDragOver={this.handleDragOver}
        onDrop={() => this.handleDrop(statusKey)}
        style={{
          width: "30%",
          minHeight: "200px",
          border: "1px solid #ccc",
          padding: "1rem",
          borderRadius: "4px",
          backgroundColor: "#f9f9f9"
        }}
      >
        <h2>{statusLabel}</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
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
                  padding: "0.5rem",
                  marginBottom: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  cursor: "grab",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span>{task.text}</span>
                <button onClick={() => this.handleDeleteTask(task.id)}>
                  X
                </button>
              </li>
            ))}
        </ul>
      </div>
    );
  };

  render() {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>To Do List</h1>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <input
            type="text"
            value={this.state.newTask}
            onChange={this.handleChange}
            placeholder="Enter a task"
          />

          <select
            value={this.state.newStatus}
            onChange={this.handleStatusChange}
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button onClick={this.handleAddTask}>Add Task</button>

          <a href="http://127.0.0.1:5050/" target="_blank" rel="noreferrer">
            <button>View History</button>
          </a>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <button onClick={this.handleReset}>Reset Board</button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: "2rem"
          }}
        >
          {this.renderColumn("To Do", "todo")}
          {this.renderColumn("In Progress", "in-progress")}
          {this.renderColumn("Completed", "completed")}
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h2>Task History</h2>
          <div
            className="history-container"
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              border: "1px solid #ccc",
              padding: "1rem",
              borderRadius: "4px"
            }}
          >
            {this.state.history.length === 0 ? (
              <p>No history yet.</p>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                {this.state.history.map((entry, index) => (
                  <li key={index}>
                    {typeof entry === "string"
                      ? entry
                      : `${entry.action} at ${entry.timestamp}`}
                  </li>
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
