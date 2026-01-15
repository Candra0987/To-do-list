/**
 * Basic UI Implementation - Day 1
 * 
 * Demonstrates:
 * - Component orchestration: Bringing all pieces together
 * - Event-driven architecture: Responding to user interactions
 * - DOM manipulation: Updating the user interface
 */

// Global application state
let taskService;
let storageManager;

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('🚀 Initializing Task Management System...');
    
    // Initialize storage manager
    storageManager = new StorageManager('taskApp');
    
    // Initialize task service
    taskService = new TaskService(storageManager);
    
    // Set up event listeners
    setupEventListeners();
    
    // Listen for task service events
    taskService.addListener(handleTaskServiceEvent);
    
    // Render initial UI
    renderTaskList();
    renderTaskStats();
    
    console.log('✅ Application initialized successfully!');
    console.log(`📊 Loaded ${taskService.getAllTasks().length} existing tasks`);
}

/**
 * Set up DOM event listeners
 */
function setupEventListeners() {
    // Task creation form
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskFormSubmit);
    }
    
    // Clear all tasks button
    const clearAllBtn = document.getElementById('clearAllTasks');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAllTasks);
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });
}

/**
 * Handle task form submission
 */
function handleTaskFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const priority = formData.get('priority') || 'medium';
    
    if (!title) {
        showMessage('Please enter a task title', 'error');
        return;
    }
    
    try {
        const task = taskService.createTask(title, description, priority);
        showMessage(`Task "${task.title}" created successfully!`, 'success');
        
        // Reset form
        event.target.reset();
        
        // Focus back to title input
        const titleInput = document.getElementById('taskTitle');
        if (titleInput) {
            titleInput.focus();
        }
    } catch (error) {
        showMessage(`Failed to create task: ${error.message}`, 'error');
    }
}

/**
 * Handle task service events
 */
function handleTaskServiceEvent(eventType, data) {
    console.log(`📢 Task service event: ${eventType}`, data);
    
    // Re-render UI when tasks change
    renderTaskList();
    renderTaskStats();
}

/**
 * Handle task completion toggle
 */
function handleTaskToggle(taskId) {
    const task = taskService.getTaskById(taskId);
    if (!task) return;
    
    try {
        taskService.updateTask(taskId, { completed: !task.completed });
        const status = task.completed ? 'incomplete' : 'complete';
        showMessage(`Task marked as ${status}`, 'info');
    } catch (error) {
        showMessage(`Failed to update task: ${error.message}`, 'error');
    }
}

/**
 * Handle task deletion
 */
function handleTaskDelete(taskId) {
    const task = taskService.getTaskById(taskId);
    if (!task) return;
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        if (taskService.deleteTask(taskId)) {
            showMessage('Task deleted successfully', 'info');
        } else {
            showMessage('Failed to delete task', 'error');
        }
    }
}

/**
 * Handle clear all tasks
 */
function handleClearAllTasks() {
    const taskCount = taskService.getAllTasks().length;
    
    if (taskCount === 0) {
        showMessage('No tasks to clear', 'info');
        return;
    }
    
    if (confirm(`Are you sure you want to delete all ${taskCount} tasks?`)) {
        taskService.clearAllTasks();
        showMessage('All tasks cleared', 'info');
    }
}

/**
 * Handle filter changes
 */
function handleFilterChange(event) {
    const filterType = event.target.dataset.filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Re-render with filter
    renderTaskList(filterType);
}

/**
 * Render the task list
 */
function renderTaskList(filter = 'all') {
    const taskListContainer = document.getElementById('taskList');
    if (!taskListContainer) return;
    
    let tasks = taskService.getAllTasks();
    
    // Apply filter
    switch (filter) {
        case 'pending':
            tasks = tasks.filter(task => !task.completed);
            break;
        case 'completed':
            tasks = tasks.filter(task => task.completed);
            break;
        case 'high':
            tasks = tasks.filter(task => task.priority === 'high');
            break;
        case 'medium':
            tasks = tasks.filter(task => task.priority === 'medium');
            break;
        case 'low':
            tasks = tasks.filter(task => task.priority === 'low');
            break;
    }
    
    // Sort tasks by creation date (newest first)
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (tasks.length === 0) {
        taskListContainer.innerHTML = `
            <div class="empty-state">
                <p>No tasks found</p>
                <small>Create your first task using the form above</small>
            </div>
        `;
        return;
    }
    
    const taskHTML = tasks.map(task => createTaskHTML(task)).join('');
    taskListContainer.innerHTML = taskHTML;
}

/**
 * Create HTML for a single task
 */
function createTaskHTML(task) {
    const priorityClass = `priority-${task.priority}`;
    const completedClass = task.completed ? 'completed' : '';
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    
    return `
        <div class="task-item ${priorityClass} ${completedClass}" data-task-id="${task.id}">
            <div class="task-content">
                <div class="task-header">
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    <span class="task-priority">${task.priority}</span>
                </div>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <small>Created: ${createdDate}</small>
                    ${task.completed ? `<small>Completed: ${new Date(task.updatedAt).toLocaleDateString()}</small>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn btn-toggle" onclick="handleTaskToggle('${task.id}')" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
                    ${task.completed ? '↶' : '✓'}
                </button>
                <button class="btn btn-delete" onclick="handleTaskDelete('${task.id}')" title="Delete task">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

/**
 * Render task statistics
 */
function renderTaskStats() {
    const statsContainer = document.getElementById('taskStats');
    if (!statsContainer) return;
    
    const stats = taskService.getTaskStats();
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-number">${stats.total}</span>
                <span class="stat-label">Total Tasks</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.pending}</span>
                <span class="stat-label">Pending</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.completed}</span>
                <span class="stat-label">Completed</span>
            </div>
            <div class="stat-item priority-high">
                <span class="stat-number">${stats.byPriority.high}</span>
                <span class="stat-label">High Priority</span>
            </div>
        </div>
    `;
}

/**
 * Show user message
 */
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messages');
    if (!messageContainer) {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    messageContainer.appendChild(messageElement);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions for testing (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        handleTaskFormSubmit,
        handleTaskToggle,
        handleTaskDelete,
        renderTaskList,
        renderTaskStats,
        showMessage,
        escapeHtml
    };
}