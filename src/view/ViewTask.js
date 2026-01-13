/**
 * Task View - Day 2 Implementation
 * 
 * Handles task-related UI components and user interactions.
 * Implements the View layer of the MVC pattern.
 * 
 * Demonstrates:
 * - View pattern implementation
 * - DOM manipulation and event handling
 * - User interface components
 * - Event-driven communication with controller
 * - Responsive and accessible UI design
 * - Data presentation and formatting
 */

/**
 * Base View
 * Provides common functionality for all views
 */
class BaseView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }
        
        this.listeners = new Set();
        this.isInitialized = false;
    }
    
    /**
     * Add event listener
     * @param {function} listener - Callback function
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    
    /**
     * Remove event listener
     * @param {function} listener - Callback function to remove
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    /**
     * Notify all listeners of an event
     * @param {string} eventType - Type of event
     * @param {any} data - Event data
     */
    notifyListeners(eventType, data) {
        this.listeners.forEach(listener => {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('Error in view listener:', error);
            }
        });
    }
    
    /**
     * Create DOM element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {object} attributes - Element attributes
     * @param {string|Node} content - Element content
     * @returns {HTMLElement} - Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'dataset') {
                Object.keys(attributes[key]).forEach(dataKey => {
                    element.dataset[dataKey] = attributes[key][dataKey];
                });
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        }
        
        return element;
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    /**
     * Show info message
     * @param {string} message - Info message
     */
    showInfo(message) {
        this.showMessage(message, 'info');
    }
    
    /**
     * Show message with specified type
     * @param {string} message - Message text
     * @param {string} type - Message type (error, success, info, warning)
     */
    showMessage(message, type = 'info') {
        // Create message element
        const messageElement = this.createElement('div', {
            className: `message message-${type}`,
            role: 'alert'
        }, message);
        
        // Find or create message container
        let messageContainer = document.getElementById('messages');
        if (!messageContainer) {
            messageContainer = this.createElement('div', { id: 'messages' });
            document.body.insertBefore(messageContainer, document.body.firstChild);
        }
        
        // Add message
        messageContainer.appendChild(messageElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
        
        // Add click to dismiss
        messageElement.addEventListener('click', () => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        });
    }
    
    /**
     * Clear container content
     */
    clear() {
        this.container.innerHTML = '';
    }
    
    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        this.container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
        const loading = this.container.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Format date for display
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date
     */
    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString();
    }
    
    /**
     * Format datetime for display
     * @param {Date} date - Date to format
     * @returns {string} - Formatted datetime
     */
    formatDateTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleString();
    }
}

/**
 * Task View
 * Handles task-related UI components and user interactions
 */
class TaskView extends BaseView {
    constructor(containerId) {
        super(containerId);
        this.currentUser = null;
        this.currentTasks = [];
        this.currentFilter = 'all';
    }
    
    /**
     * Initialize the view
     * @param {User} user - Current user
     */
    async initialize(user) {
        this.currentUser = user;
        this.render();
        this.setupEventListeners();
        this.isInitialized = true;
    }
    
    /**
     * Render the main task interface
     */
    render() {
        this.container.innerHTML = `
            <div class="task-management">
                <header class="task-header">
                    <h1>Task Management</h1>
                    <div class="user-info">
                        <span class="user-avatar">${this.currentUser.initials}</span>
                        <span class="user-name">Welcome, ${this.escapeHtml(this.currentUser.displayName)}</span>
                    </div>
                </header>
                
                <div class="task-controls">
                    <div class="task-form-container">
                        <form id="taskForm" class="task-form">
                            <div class="form-row">
                                <input type="text" id="taskTitle" name="title" placeholder="Task title" required>
                                <select id="taskPriority" name="priority">
                                    <option value="low">Low Priority</option>
                                    <option value="medium" selected>Medium Priority</option>
                                    <option value="high">High Priority</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <textarea id="taskDescription" name="description" placeholder="Task description (optional)" rows="2"></textarea>
                            </div>
                            <div class="form-row">
                                <input type="text" id="taskCategory" name="category" placeholder="Category (e.g., work, personal)">
                                <input type="date" id="taskDueDate" name="dueDate">
                                <input type="number" id="taskEstimatedHours" name="estimatedHours" placeholder="Est. hours" min="0" step="0.5">
                            </div>
                            <div class="form-row">
                                <input type="text" id="taskTags" name="tags" placeholder="Tags (comma-separated)">
                                <button type="submit" class="btn btn-primary">Add Task</button>
                            </div>
                        </form>
                    </div>
                    
                    <div class="task-filters">
                        <div class="filter-group">
                            <button class="filter-btn active" data-filter="all">All Tasks</button>
                            <button class="filter-btn" data-filter="pending">Pending</button>
                            <button class="filter-btn" data-filter="completed">Completed</button>
                            <button class="filter-btn" data-filter="overdue">Overdue</button>
                        </div>
                        <div class="priority-filters">
                            <button class="filter-btn" data-filter="priority" data-value="high">High Priority</button>
                            <button class="filter-btn" data-filter="priority" data-value="medium">Medium Priority</button>
                            <button class="filter-btn" data-filter="priority" data-value="low">Low Priority</button>
                        </div>
                        <div class="search-group">
                            <input type="text" id="taskSearch" placeholder="Search tasks...">
                            <button id="clearSearch" class="btn btn-secondary">Clear</button>
                            <button id="refreshTasks" class="btn btn-secondary">Refresh</button>
                        </div>
                    </div>
                </div>
                
                <div class="task-stats" id="taskStats">
                    <!-- Stats will be populated here -->
                </div>
                
                <div class="task-list-container">
                    <div id="taskList" class="task-list">
                        <div class="empty-state">
                            <p>No tasks found</p>
                            <small>Create your first task using the form above</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Task form submission
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', this.handleTaskFormSubmit.bind(this));
        }
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', this.handleFilterClick.bind(this));
        });
        
        // Search functionality
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }
        
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', this.handleClearSearch.bind(this));
        }
        
        const refreshBtn = document.getElementById('refreshTasks');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh.bind(this));
        }
        
        // Task list event delegation
        const taskList = document.getElementById('taskList');
        if (taskList) {
            taskList.addEventListener('click', this.handleTaskListClick.bind(this));
        }
    }
    
    /**
     * Handle task form submission
     * @param {Event} event - Form submit event
     */
    handleTaskFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const taskData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            priority: formData.get('priority'),
            category: formData.get('category').trim() || 'general',
            dueDate: formData.get('dueDate') || null,
            estimatedHours: formData.get('estimatedHours') ? parseFloat(formData.get('estimatedHours')) : null,
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        
        if (!taskData.title) {
            this.showError('Task title is required');
            return;
        }
        
        this.notifyListeners('createTaskRequested', taskData);
        
        // Reset form
        event.target.reset();
        const titleInput = document.getElementById('taskTitle');
        if (titleInput) {
            titleInput.focus();
        }
    }
    
    /**
     * Handle filter button clicks
     * @param {Event} event - Click event
     */
    handleFilterClick(event) {
        const filterType = event.target.dataset.filter;
        const filterValue = event.target.dataset.value || null;
        
        // Update active filter button
        if (!filterValue) { // Only update for main filter buttons, not priority sub-filters
            document.querySelectorAll('.filter-btn[data-filter]:not([data-value])').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
        }
        
        this.currentFilter = filterType;
        this.notifyListeners('filterRequested', { filterType, filterValue });
    }
    
    /**
     * Handle search input
     * @param {Event} event - Input event
     */
    handleSearchInput(event) {
        const query = event.target.value;
        // Debounce search to avoid too many requests
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.notifyListeners('searchRequested', { query });
        }, 300);
    }
    
    /**
     * Handle clear search
     */
    handleClearSearch() {
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        this.notifyListeners('searchRequested', { query: '' });
    }
    
    /**
     * Handle refresh button
     */
    handleRefresh() {
        this.notifyListeners('refreshRequested');
    }
    
    /**
     * Handle task list clicks (event delegation)
     * @param {Event} event - Click event
     */
    handleTaskListClick(event) {
        const taskElement = event.target.closest('.task-item');
        if (!taskElement) return;
        
        const taskId = taskElement.dataset.taskId;
        
        if (event.target.classList.contains('task-toggle')) {
            this.notifyListeners('toggleCompletionRequested', { taskId });
        } else if (event.target.classList.contains('task-delete')) {
            this.notifyListeners('deleteTaskRequested', { taskId });
        } else if (event.target.classList.contains('task-edit')) {
            this.showEditTaskModal(taskId);
        } else if (event.target.classList.contains('add-time-btn')) {
            this.showAddTimeModal(taskId);
        } else if (event.target.classList.contains('task-tag')) {
            // Handle tag clicks for filtering
            const tag = event.target.textContent.trim();
            this.notifyListeners('filterRequested', { filterType: 'tag', filterValue: tag });
        }
    }
    
    /**
     * Display tasks in the list
     * @param {Task[]} tasks - Tasks to display
     * @param {string} filterType - Current filter type
     */
    async displayTasks(tasks, filterType = 'all') {
        this.currentTasks = tasks;
        this.currentFilter = filterType;
        const taskList = document.getElementById('taskList');
        
        if (!taskList) return;
        
        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <p>No tasks found</p>
                    <small>${this.getEmptyStateMessage(filterType)}</small>
                </div>
            `;
            return;
        }
        
        // Sort tasks by priority and due date
        const sortedTasks = this.sortTasks(tasks);
        
        const taskHTML = sortedTasks.map(task => this.createTaskHTML(task)).join('');
        taskList.innerHTML = taskHTML;
    }
    
    /**
     * Create HTML for a single task
     * @param {Task} task - Task to render
     * @returns {string} - HTML string
     */
    createTaskHTML(task) {
        const priorityClass = `priority-${task.priority}`;
        const completedClass = task.completed ? 'completed' : '';
        const overdueClass = task.isOverdue ? 'overdue' : '';
        
        const dueDate = task.dueDate ? this.formatDate(task.dueDate) : '';
        const tags = task.tags.map(tag => 
            `<span class="task-tag" title="Filter by ${tag}">${this.escapeHtml(tag)}</span>`
        ).join('');
        
        const progress = task.progress || 0;
        const progressBar = task.estimatedHours ? 
            `<div class="task-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${Math.round(progress)}%</span>
            </div>` : '';
        
        return `
            <div class="task-item ${priorityClass} ${completedClass} ${overdueClass}" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                        <div class="task-meta">
                            <span class="task-priority priority-${task.priority}">${task.priority}</span>
                            <span class="task-category">${this.escapeHtml(task.category)}</span>
                            ${dueDate ? `<span class="task-due-date ${task.isOverdue ? 'overdue' : ''}">Due: ${dueDate}</span>` : ''}
                            ${task.isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}
                        </div>
                    </div>
                    
                    ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                    
                    ${tags ? `<div class="task-tags">${tags}</div>` : ''}
                    
                    ${progressBar}
                    
                    <div class="task-footer">
                        <div class="task-info">
                            <small class="task-created">Created: ${this.formatDate(task.createdAt)}</small>
                            ${task.estimatedHours ? `<small class="task-estimated">Est: ${task.estimatedHours}h</small>` : ''}
                            ${task.actualHours ? `<small class="task-actual">Actual: ${task.actualHours}h</small>` : ''}
                            ${task.assignedTo !== task.userId ? `<small class="task-assigned">Assigned to: ${task.assignedTo}</small>` : ''}
                        </div>
                        <div class="task-status">
                            <span class="status-badge status-${task.status}">${task.status}</span>
                        </div>
                    </div>
                </div>
                
                <div class="task-actions">
                    <button class="btn btn-sm task-toggle" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
                        ${task.completed ? '↶' : '✓'}
                    </button>
                    ${!task.completed ? `<button class="btn btn-sm add-time-btn" title="Add time spent">⏱️</button>` : ''}
                    <button class="btn btn-sm task-edit" title="Edit task">
                        ✏️
                    </button>
                    <button class="btn btn-sm task-delete" title="Delete task">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Display task statistics
     * @param {object} stats - Task statistics
     */
    async displayStats(stats) {
        const statsContainer = document.getElementById('taskStats');
        if (!statsContainer) return;
        
        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        
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
                <div class="stat-item ${stats.overdue > 0 ? 'stat-warning' : ''}">
                    <span class="stat-number">${stats.overdue || 0}</span>
                    <span class="stat-label">Overdue</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${completionRate}%</span>
                    <span class="stat-label">Completion Rate</span>
                </div>
            </div>
            
            <div class="priority-breakdown">
                <h4>By Priority</h4>
                <div class="priority-stats">
                    <div class="priority-stat priority-high">
                        <span class="priority-count">${stats.byPriority.high || 0}</span>
                        <span class="priority-label">High</span>
                    </div>
                    <div class="priority-stat priority-medium">
                        <span class="priority-count">${stats.byPriority.medium || 0}</span>
                        <span class="priority-label">Medium</span>
                    </div>
                    <div class="priority-stat priority-low">
                        <span class="priority-count">${stats.byPriority.low || 0}</span>
                        <span class="priority-label">Low</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Add a task to the display
     * @param {Task} task - Task to add
     */
    async addTask(task) {
        this.currentTasks.push(task);
        // Re-render the task list
        await this.displayTasks(this.currentTasks, this.currentFilter);
        this.showSuccess(`Task "${task.title}" created successfully!`);
    }
    
    /**
     * Update a task in the display
     * @param {Task} task - Updated task
     */
    async updateTask(task) {
        const index = this.currentTasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            this.currentTasks[index] = task;
            // Re-render the task list
            await this.displayTasks(this.currentTasks, this.currentFilter);
        }
    }
    
    /**
     * Remove a task from the display
     * @param {string} taskId - Task ID to remove
     */
    async removeTask(taskId) {
        this.currentTasks = this.currentTasks.filter(t => t.id !== taskId);
        // Re-render the task list
        await this.displayTasks(this.currentTasks, this.currentFilter);
        this.showSuccess('Task deleted successfully');
    }
    
    /**
     * Show confirmation dialog for task deletion
     * @param {Task} task - Task to delete
     * @returns {Promise<boolean>} - Whether deletion was confirmed
     */
    async confirmDeletion(task) {
        return confirm(`Are you sure you want to delete "${task.title}"?`);
    }
    
    /**
     * Show edit task modal (simplified version)
     * @param {string} taskId - Task ID to edit
     */
    showEditTaskModal(taskId) {
        const task = this.currentTasks.find(t => t.id === taskId);
        if (!task) return;
        
        // For now, just prompt for new title and description
        const newTitle = prompt('Edit task title:', task.title);
        if (newTitle && newTitle.trim() !== task.title) {
            this.notifyListeners('updateTaskRequested', {
                taskId,
                updates: { title: newTitle.trim() }
            });
        }
    }
    
    /**
     * Show add time modal (simplified version)
     * @param {string} taskId - Task ID
     */
    showAddTimeModal(taskId) {
        const hours = prompt('Hours spent on this task:');
        if (hours && !isNaN(parseFloat(hours))) {
            this.notifyListeners('addTimeRequested', {
                taskId,
                hours: parseFloat(hours)
            });
        }
    }
    
    /**
     * Sort tasks by priority and due date
     * @param {Task[]} tasks - Tasks to sort
     * @returns {Task[]} - Sorted tasks
     */
    sortTasks(tasks) {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        
        return tasks.sort((a, b) => {
            // First, sort by completion status (incomplete first)
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Then by overdue status (overdue first)
            if (a.isOverdue !== b.isOverdue) {
                return a.isOverdue ? -1 : 1;
            }
            
            // Then by priority (higher priority first)
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            
            // Finally by due date (earlier due date first)
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            } else if (a.dueDate) {
                return -1;
            } else if (b.dueDate) {
                return 1;
            }
            
            // If all else is equal, sort by creation date (newer first)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }
    
    /**
     * Get appropriate empty state message based on filter
     * @param {string} filterType - Current filter type
     * @returns {string} - Empty state message
     */
    getEmptyStateMessage(filterType) {
        switch (filterType) {
            case 'pending':
                return 'No pending tasks. Great job!';
            case 'completed':
                return 'No completed tasks yet. Start working on your tasks!';
            case 'overdue':
                return 'No overdue tasks. You\'re on track!';
            case 'search':
                return 'No tasks match your search. Try different keywords.';
            default:
                return 'Create your first task using the form above';
        }
    }
    
    /**
     * Update filter button states
     * @param {string} activeFilter - Currently active filter
     */
    updateFilterButtons(activeFilter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === activeFilter) {
                btn.classList.add('active');
            }
        });
    }
    
    /**
     * Get current tasks
     * @returns {Task[]} - Current tasks
     */
    getCurrentTasks() {
        return this.currentTasks;
    }
    
    /**
     * Get current filter
     * @returns {string} - Current filter
     */
    getCurrentFilter() {
        return this.currentFilter;
    }
    
    /**
     * Check if view is initialized
     * @returns {boolean} - Whether view is initialized
     */
    isViewInitialized() {
        return this.isInitialized;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseView, TaskView };
} else {
    window.BaseView = BaseView;
    window.TaskView = TaskView;
}