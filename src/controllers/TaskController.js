/**
 * Task Controller - Day 2 Implementation
 * 
 * Handles all task-related operations and coordinates between TaskService and TaskView.
 * Implements the Controller layer of the MVC pattern.
 * 
 * Demonstrates:
 * - Controller pattern implementation
 * - Coordination between service and view layers
 * - User input handling and validation
 * - Permission checking and security
 * - Event-driven architecture
 * - Error handling and user feedback
 */

/**
 * Base Controller
 * Provides common functionality for all controllers
 */
class BaseController {
    constructor() {
        this.listeners = new Set();
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
                console.error('Error in controller listener:', error);
            }
        });
    }
    
    /**
     * Handle errors consistently
     * @param {Error} error - The error to handle
     * @param {string} operation - The operation that failed
     */
    handleError(error, operation) {
        console.error(`Error in ${operation}:`, error);
        this.notifyListeners('error', {
            operation,
            error: error.message,
            timestamp: new Date()
        });
        throw error;
    }
    
    /**
     * Validate required parameters
     * @param {object} params - Parameters to validate
     * @param {string[]} required - Required parameter names
     */
    validateParams(params, required) {
        const missing = required.filter(param => 
            params[param] === undefined || params[param] === null || params[param] === ''
        );
        
        if (missing.length > 0) {
            throw new Error(`Missing required parameters: ${missing.join(', ')}`);
        }
    }
}

/**
 * Task Controller
 * Handles all task-related operations and coordinates between TaskService and TaskView
 */
class TaskController extends BaseController {
    constructor(taskService, userService, taskView) {
        super();
        this.taskService = taskService;
        this.userService = userService;
        this.taskView = taskView;
        this.currentUser = null;
        this.currentFilter = 'all';
        
        // Set up service listeners
        if (this.taskService && typeof this.taskService.addListener === 'function') {
            this.taskService.addListener(this.handleTaskServiceEvent.bind(this));
        }
        
        // Set up view listeners
        if (this.taskView && typeof this.taskView.addListener === 'function') {
            this.taskView.addListener(this.handleTaskViewEvent.bind(this));
        }
    }
    
    /**
     * Initialize the controller
     * @param {string} userId - Current user ID
     */
    async initialize(userId) {
        try {
            // Load current user
            this.currentUser = await this.userService.getUserById(userId);
            if (!this.currentUser) {
                throw new Error('User not found');
            }
            
            // Initialize view if available
            if (this.taskView && typeof this.taskView.initialize === 'function') {
                await this.taskView.initialize(this.currentUser);
            }
            
            // Load and display tasks
            await this.refreshTasks();
            
            this.notifyListeners('initialized', { userId });
        } catch (error) {
            this.handleError(error, 'initialize');
        }
    }
    
    /**
     * Create a new task
     * @param {object} taskData - Task creation data
     */
    async createTask(taskData) {
        try {
            this.validateParams(taskData, ['title']);
            
            // Ensure user is set
            taskData.userId = this.currentUser.id;
            taskData.assignedTo = taskData.assignedTo || this.currentUser.id;
            
            // Create task through service
            const task = await this.taskService.createTask(taskData);
            
            // Update view if available
            if (this.taskView && typeof this.taskView.addTask === 'function') {
                await this.taskView.addTask(task);
                await this.updateTaskStats();
            }
            
            this.notifyListeners('taskCreated', task);
            return task;
        } catch (error) {
            this.handleError(error, 'createTask');
        }
    }
    
    /**
     * Update an existing task
     * @param {string} taskId - Task ID
     * @param {object} updates - Updates to apply
     */
    async updateTask(taskId, updates) {
        try {
            this.validateParams({ taskId }, ['taskId']);
            
            // Check permissions
            const task = await this.taskService.getTaskById(taskId);
            if (!this.canModifyTask(task)) {
                throw new Error('Permission denied: Cannot modify this task');
            }
            
            // Update task through service
            const updatedTask = await this.taskService.updateTask(taskId, updates);
            
            // Update view if available
            if (this.taskView && typeof this.taskView.updateTask === 'function') {
                await this.taskView.updateTask(updatedTask);
                await this.updateTaskStats();
            }
            
            this.notifyListeners('taskUpdated', updatedTask);
            return updatedTask;
        } catch (error) {
            this.handleError(error, 'updateTask');
        }
    }
    
    /**
     * Delete a task
     * @param {string} taskId - Task ID
     */
    async deleteTask(taskId) {
        try {
            this.validateParams({ taskId }, ['taskId']);
            
            // Check permissions
            const task = await this.taskService.getTaskById(taskId);
            if (!this.canModifyTask(task)) {
                throw new Error('Permission denied: Cannot delete this task');
            }
            
            // Confirm deletion through view if available
            let confirmed = true;
            if (this.taskView && typeof this.taskView.confirmDeletion === 'function') {
                confirmed = await this.taskView.confirmDeletion(task);
            }
            
            if (!confirmed) {
                return false;
            }
            
            // Delete task through service
            const success = await this.taskService.deleteTask(taskId);
            
            if (success) {
                // Update view if available
                if (this.taskView && typeof this.taskView.removeTask === 'function') {
                    await this.taskView.removeTask(taskId);
                    await this.updateTaskStats();
                }
                
                this.notifyListeners('taskDeleted', { taskId, task });
            }
            
            return success;
        } catch (error) {
            this.handleError(error, 'deleteTask');
        }
    }
    
    /**
     * Toggle task completion status
     * @param {string} taskId - Task ID
     */
    async toggleTaskCompletion(taskId) {
        try {
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            
            const updates = { completed: !task.completed };
            return await this.updateTask(taskId, updates);
        } catch (error) {
            this.handleError(error, 'toggleTaskCompletion');
        }
    }
    
    /**
     * Assign task to a user
     * @param {string} taskId - Task ID
     * @param {string} userId - User ID to assign to
     */
    async assignTask(taskId, userId) {
        try {
            this.validateParams({ taskId, userId }, ['taskId', 'userId']);
            
            // Validate assignee exists
            const assignee = await this.userService.getUserById(userId);
            if (!assignee) {
                throw new Error('Assignee not found');
            }
            
            return await this.updateTask(taskId, { assignedTo: userId });
        } catch (error) {
            this.handleError(error, 'assignTask');
        }
    }
    
    /**
     * Filter tasks
     * @param {string} filterType - Type of filter to apply
     * @param {any} filterValue - Filter value
     */
    async filterTasks(filterType, filterValue = null) {
        try {
            this.currentFilter = filterType;
            
            let tasks;
            switch (filterType) {
                case 'all':
                    tasks = await this.taskService.getTasksForUser(this.currentUser.id);
                    break;
                case 'pending':
                    tasks = await this.taskService.getPendingTasks(this.currentUser.id);
                    break;
                case 'completed':
                    tasks = await this.taskService.getCompletedTasks(this.currentUser.id);
                    break;
                case 'overdue':
                    tasks = await this.taskService.getOverdueTasks(this.currentUser.id);
                    break;
                case 'priority':
                    tasks = await this.taskService.getTasksByPriority(this.currentUser.id, filterValue);
                    break;
                case 'category':
                    tasks = await this.taskService.getTasksByCategory(this.currentUser.id, filterValue);
                    break;
                case 'assigned':
                    tasks = await this.taskService.getTasksAssignedToUser(this.currentUser.id);
                    break;
                default:
                    throw new Error(`Unknown filter type: ${filterType}`);
            }
            
            // Display tasks in view if available
            if (this.taskView && typeof this.taskView.displayTasks === 'function') {
                await this.taskView.displayTasks(tasks, filterType);
            }
            
            this.notifyListeners('tasksFiltered', { filterType, filterValue, count: tasks.length });
            return tasks;
        } catch (error) {
            this.handleError(error, 'filterTasks');
        }
    }
    
    /**
     * Search tasks
     * @param {string} query - Search query
     */
    async searchTasks(query) {
        try {
            if (!query || query.trim() === '') {
                return await this.filterTasks(this.currentFilter);
            }
            
            const tasks = await this.taskService.searchTasks(this.currentUser.id, query.trim());
            
            // Display tasks in view if available
            if (this.taskView && typeof this.taskView.displayTasks === 'function') {
                await this.taskView.displayTasks(tasks, 'search');
            }
            
            this.notifyListeners('tasksSearched', { query, count: tasks.length });
            return tasks;
        } catch (error) {
            this.handleError(error, 'searchTasks');
        }
    }
    
    /**
     * Refresh task list
     */
    async refreshTasks() {
        try {
            await this.filterTasks(this.currentFilter);
            await this.updateTaskStats();
        } catch (error) {
            this.handleError(error, 'refreshTasks');
        }
    }
    
    /**
     * Update task statistics display
     */
    async updateTaskStats() {
        try {
            const stats = await this.taskService.getTaskStats(this.currentUser.id);
            
            // Display stats in view if available
            if (this.taskView && typeof this.taskView.displayStats === 'function') {
                await this.taskView.displayStats(stats);
            }
            
            return stats;
        } catch (error) {
            this.handleError(error, 'updateTaskStats');
        }
    }
    
    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     */
    async getTask(taskId) {
        try {
            return await this.taskService.getTaskById(taskId);
        } catch (error) {
            this.handleError(error, 'getTask');
        }
    }
    
    /**
     * Get all tasks for current user
     */
    async getAllTasks() {
        try {
            return await this.taskService.getTasksForUser(this.currentUser.id);
        } catch (error) {
            this.handleError(error, 'getAllTasks');
        }
    }
    
    /**
     * Add time spent on a task
     * @param {string} taskId - Task ID
     * @param {number} hours - Hours spent
     */
    async addTimeSpent(taskId, hours) {
        try {
            this.validateParams({ taskId, hours }, ['taskId', 'hours']);
            
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            
            if (!this.canModifyTask(task)) {
                throw new Error('Permission denied: Cannot modify this task');
            }
            
            const currentHours = task.actualHours || 0;
            return await this.updateTask(taskId, { actualHours: currentHours + hours });
        } catch (error) {
            this.handleError(error, 'addTimeSpent');
        }
    }
    
    /**
     * Set task due date
     * @param {string} taskId - Task ID
     * @param {Date|string} dueDate - Due date
     */
    async setDueDate(taskId, dueDate) {
        try {
            this.validateParams({ taskId }, ['taskId']);
            
            return await this.updateTask(taskId, { dueDate });
        } catch (error) {
            this.handleError(error, 'setDueDate');
        }
    }
    
    /**
     * Add tag to task
     * @param {string} taskId - Task ID
     * @param {string} tag - Tag to add
     */
    async addTaskTag(taskId, tag) {
        try {
            this.validateParams({ taskId, tag }, ['taskId', 'tag']);
            
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            
            const currentTags = task.tags || [];
            if (!currentTags.includes(tag.toLowerCase())) {
                currentTags.push(tag.toLowerCase());
                return await this.updateTask(taskId, { tags: currentTags });
            }
            
            return task;
        } catch (error) {
            this.handleError(error, 'addTaskTag');
        }
    }
    
    /**
     * Remove tag from task
     * @param {string} taskId - Task ID
     * @param {string} tag - Tag to remove
     */
    async removeTaskTag(taskId, tag) {
        try {
            this.validateParams({ taskId, tag }, ['taskId', 'tag']);
            
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            
            const currentTags = task.tags || [];
            const updatedTags = currentTags.filter(t => t !== tag.toLowerCase());
            
            return await this.updateTask(taskId, { tags: updatedTags });
        } catch (error) {
            this.handleError(error, 'removeTaskTag');
        }
    }
    
    /**
     * Handle events from task service
     * @param {string} eventType - Event type
     * @param {any} data - Event data
     */
    handleTaskServiceEvent(eventType, data) {
        switch (eventType) {
            case 'taskCreated':
            case 'taskUpdated':
            case 'taskDeleted':
                // Refresh view when tasks change
                this.refreshTasks();
                break;
            case 'error':
                if (this.taskView && typeof this.taskView.showError === 'function') {
                    this.taskView.showError(data.error);
                }
                break;
        }
    }
    
    /**
     * Handle events from task view
     * @param {string} eventType - Event type
     * @param {any} data - Event data
     */
    async handleTaskViewEvent(eventType, data) {
        try {
            switch (eventType) {
                case 'createTaskRequested':
                    await this.createTask(data);
                    break;
                case 'updateTaskRequested':
                    await this.updateTask(data.taskId, data.updates);
                    break;
                case 'deleteTaskRequested':
                    await this.deleteTask(data.taskId);
                    break;
                case 'toggleCompletionRequested':
                    await this.toggleTaskCompletion(data.taskId);
                    break;
                case 'assignTaskRequested':
                    await this.assignTask(data.taskId, data.userId);
                    break;
                case 'filterRequested':
                    await this.filterTasks(data.filterType, data.filterValue);
                    break;
                case 'searchRequested':
                    await this.searchTasks(data.query);
                    break;
                case 'refreshRequested':
                    await this.refreshTasks();
                    break;
                case 'addTimeRequested':
                    await this.addTimeSpent(data.taskId, data.hours);
                    break;
                case 'setDueDateRequested':
                    await this.setDueDate(data.taskId, data.dueDate);
                    break;
                case 'addTagRequested':
                    await this.addTaskTag(data.taskId, data.tag);
                    break;
                case 'removeTagRequested':
                    await this.removeTaskTag(data.taskId, data.tag);
                    break;
            }
        } catch (error) {
            this.handleError(error, `handleTaskViewEvent:${eventType}`);
        }
    }
    
    /**
     * Check if current user can modify a task
     * @param {Task} task - Task to check
     * @returns {boolean} - Whether user can modify the task
     */
    canModifyTask(task) {
        if (!task || !this.currentUser) {
            return false;
        }
        
        // User can modify if they own the task or are assigned to it
        if (task.userId === this.currentUser.id || task.assignedTo === this.currentUser.id) {
            return true;
        }
        
        // Admins can modify any task
        if (this.currentUser.isAdmin) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if current user can view a task
     * @param {Task} task - Task to check
     * @returns {boolean} - Whether user can view the task
     */
    canViewTask(task) {
        if (!task || !this.currentUser) {
            return false;
        }
        
        // User can view if they own the task or are assigned to it
        if (task.userId === this.currentUser.id || task.assignedTo === this.currentUser.id) {
            return true;
        }
        
        // Admins and moderators can view any task
        if (this.currentUser.isAdmin || this.currentUser.canManageUsers) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get current user
     * @returns {User} - Current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Set current user
     * @param {string} userId - User ID
     */
    async setCurrentUser(userId) {
        await this.initialize(userId);
    }
    
    /**
     * Get current filter
     * @returns {string} - Current filter type
     */
    getCurrentFilter() {
        return this.currentFilter;
    }
    
    /**
     * Check if controller is initialized
     * @returns {boolean} - Whether controller is initialized
     */
    isInitialized() {
        return this.currentUser !== null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseController, TaskController };
} else {
    window.BaseController = BaseController;
    window.TaskController = TaskController;
}