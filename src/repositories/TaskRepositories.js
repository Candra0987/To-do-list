/**
 * Task Repository - Day 2 Implementation
 * 
 * Implements the Repository pattern for Task entities.
 * Provides abstraction between business logic and data storage.
 * 
 * Demonstrates:
 * - Repository pattern implementation
 * - Data access abstraction
 * - Query methods for filtering and searching
 * - Caching for performance optimization
 * - Error handling and validation
 * - Consistent data access interface
 */

/**
 * Base Repository Interface
 * Defines standard CRUD operations that all repositories should implement
 */
class BaseRepository {
    /**
     * Create a new entity
     * @param {Object} entity - The entity to create
     * @returns {Promise<Object>} The created entity with generated ID
     */
    async create(entity) {
        throw new Error('create method must be implemented');
    }
    
    /**
     * Find entity by ID
     * @param {string} id - The entity ID
     * @returns {Promise<Object|null>} The entity or null if not found
     */
    async findById(id) {
        throw new Error('findById method must be implemented');
    }
    
    /**
     * Find all entities
     * @param {Object} options - Query options (limit, offset, sort)
     * @returns {Promise<Array>} Array of entities
     */
    async findAll(options = {}) {
        throw new Error('findAll method must be implemented');
    }
    
    /**
     * Update entity by ID
     * @param {string} id - The entity ID
     * @param {Object} updates - Properties to update
     * @returns {Promise<Object|null>} Updated entity or null if not found
     */
    async update(id, updates) {
        throw new Error('update method must be implemented');
    }
    
    /**
     * Delete entity by ID
     * @param {string} id - The entity ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    async delete(id) {
        throw new Error('delete method must be implemented');
    }
    
    /**
     * Check if entity exists
     * @param {string} id - The entity ID
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async exists(id) {
        const entity = await this.findById(id);
        return entity !== null;
    }
    
    /**
     * Count total entities
     * @param {Object} criteria - Optional filtering criteria
     * @returns {Promise<number>} Total count
     */
    async count(criteria = {}) {
        const entities = await this.findAll();
        return entities.length;
    }
}

/**
 * Task Repository
 * Handles all data access operations for Task entities
 */
class TaskRepository extends BaseRepository {
    constructor(storageManager) {
        super();
        this.storage = storageManager;
        this.entityKey = 'tasks';
        this._cache = new Map(); // In-memory cache for performance
        this._cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }
    
    /**
     * Create a new task
     */
    async create(task) {
        try {
            // Validate task object
            this._validateTask(task);
            
            // Ensure task has an ID
            if (!task.id) {
                task.id = this._generateId();
            }
            
            // Get existing tasks
            const tasks = await this._getAllTasks();
            
            // Check for duplicate ID
            if (tasks.some(t => t.id === task.id)) {
                throw new Error(`Task with ID ${task.id} already exists`);
            }
            
            // Add to collection
            tasks.push(task.toJSON ? task.toJSON() : task);
            
            // Save to storage
            await this._saveTasks(tasks);
            
            // Update cache
            this._cache.set(task.id, {
                data: task,
                timestamp: Date.now()
            });
            
            return task;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }
    
    /**
     * Find task by ID
     */
    async findById(id) {
        try {
            // Check cache first
            const cached = this._getFromCache(id);
            if (cached) {
                return cached;
            }
            
            // Load from storage
            const tasks = await this._getAllTasks();
            const taskData = tasks.find(t => t.id === id);
            
            if (!taskData) {
                return null;
            }
            
            // Convert to Task object if needed
            const task = this._hydrateTask(taskData);
            
            // Cache the result
            this._cache.set(id, {
                data: task,
                timestamp: Date.now()
            });
            
            return task;
        } catch (error) {
            console.error('Error finding task by ID:', error);
            throw error;
        }
    }
    
    /**
     * Find all tasks with optional filtering
     */
    async findAll(options = {}) {
        try {
            const tasks = await this._getAllTasks();
            let result = tasks.map(taskData => this._hydrateTask(taskData));
            
            // Apply filters
            if (options.userId) {
                result = result.filter(task => task.userId === options.userId);
            }
            
            if (options.completed !== undefined) {
                result = result.filter(task => task.completed === options.completed);
            }
            
            if (options.priority) {
                result = result.filter(task => task.priority === options.priority);
            }
            
            if (options.category) {
                result = result.filter(task => task.category === options.category);
            }
            
            if (options.assignedTo) {
                result = result.filter(task => task.assignedTo === options.assignedTo);
            }
            
            // Apply sorting
            if (options.sortBy) {
                result = this._sortTasks(result, options.sortBy, options.sortOrder);
            }
            
            // Apply pagination
            if (options.limit || options.offset) {
                const offset = options.offset || 0;
                const limit = options.limit || result.length;
                result = result.slice(offset, offset + limit);
            }
            
            return result;
        } catch (error) {
            console.error('Error finding all tasks:', error);
            throw error;
        }
    }
    
    /**
     * Update task by ID
     */
    async update(id, updates) {
        try {
            const tasks = await this._getAllTasks();
            const taskIndex = tasks.findIndex(t => t.id === id);
            
            if (taskIndex === -1) {
                return null;
            }
            
            // Get current task data
            const currentTask = this._hydrateTask(tasks[taskIndex]);
            
            // Apply updates to task object
            Object.keys(updates).forEach(key => {
                if (currentTask.hasOwnProperty(`_${key}`) || currentTask.hasOwnProperty(key)) {
                    // Use setter methods if available
                    const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
                    const updateMethodName = `update${key.charAt(0).toUpperCase() + key.slice(1)}`;
                    
                    if (typeof currentTask[setterName] === 'function') {
                        currentTask[setterName](updates[key]);
                    } else if (typeof currentTask[updateMethodName] === 'function') {
                        currentTask[updateMethodName](updates[key]);
                    } else {
                        // Direct property update
                        if (currentTask.hasOwnProperty(`_${key}`)) {
                            currentTask[`_${key}`] = updates[key];
                        } else {
                            currentTask[key] = updates[key];
                        }
                    }
                }
            });
            
            // Update timestamp
            if (currentTask._updatedAt !== undefined) {
                currentTask._updatedAt = new Date();
            }
            
            // Update in storage
            tasks[taskIndex] = currentTask.toJSON ? currentTask.toJSON() : currentTask;
            await this._saveTasks(tasks);
            
            // Update cache
            this._cache.set(id, {
                data: currentTask,
                timestamp: Date.now()
            });
            
            return currentTask;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }
    
    /**
     * Delete task by ID
     */
    async delete(id) {
        try {
            const tasks = await this._getAllTasks();
            const taskIndex = tasks.findIndex(t => t.id === id);
            
            if (taskIndex === -1) {
                return false;
            }
            
            // Remove from array
            tasks.splice(taskIndex, 1);
            
            // Save to storage
            await this._saveTasks(tasks);
            
            // Remove from cache
            this._cache.delete(id);
            
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
    
    // Specialized query methods
    
    /**
     * Find tasks by user ID
     */
    async findByUserId(userId) {
        return this.findAll({ userId });
    }
    
    /**
     * Find tasks by category
     */
    async findByCategory(category) {
        return this.findAll({ category });
    }
    
    /**
     * Find tasks by priority
     */
    async findByPriority(priority) {
        return this.findAll({ priority });
    }
    
    /**
     * Find tasks by completion status
     */
    async findByStatus(completed) {
        return this.findAll({ completed });
    }
    
    /**
     * Find tasks assigned to a specific user
     */
    async findByAssignee(assignedTo) {
        return this.findAll({ assignedTo });
    }
    
    /**
     * Find overdue tasks
     */
    async findOverdue() {
        const tasks = await this.findAll();
        const now = new Date();
        
        return tasks.filter(task => {
            return !task.completed && 
                   task.dueDate && 
                   new Date(task.dueDate) < now;
        });
    }
    
    /**
     * Find tasks due within a date range
     */
    async findByDueDateRange(startDate, endDate) {
        const tasks = await this.findAll();
        
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            
            const dueDate = new Date(task.dueDate);
            return dueDate >= startDate && dueDate <= endDate;
        });
    }
    
    /**
     * Search tasks by text
     */
    async search(query) {
        const tasks = await this.findAll();
        const searchTerm = query.toLowerCase();
        
        return tasks.filter(task => {
            return task.title.toLowerCase().includes(searchTerm) ||
                   task.description.toLowerCase().includes(searchTerm) ||
                   (task.tags && task.tags.some(tag => 
                       tag.toLowerCase().includes(searchTerm)));
        });
    }
    
    /**
     * Get task statistics
     */
    async getStatistics(userId = null) {
        const tasks = userId ? 
            await this.findByUserId(userId) : 
            await this.findAll();
        
        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.completed).length,
            pending: tasks.filter(t => !t.completed).length,
            overdue: 0,
            byPriority: {
                high: tasks.filter(t => t.priority === 'high').length,
                medium: tasks.filter(t => t.priority === 'medium').length,
                low: tasks.filter(t => t.priority === 'low').length
            },
            byCategory: {}
        };
        
        // Count overdue tasks
        const now = new Date();
        stats.overdue = tasks.filter(task => {
            return !task.completed && 
                   task.dueDate && 
                   new Date(task.dueDate) < now;
        }).length;
        
        // Count by category
        tasks.forEach(task => {
            const category = task.category || 'uncategorized';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        });
        
        return stats;
    }
    
    // Private helper methods
    
    async _getAllTasks() {
        return this.storage.load(this.entityKey, []);
    }
    
    async _saveTasks(tasks) {
        return this.storage.save(this.entityKey, tasks);
    }
    
    _validateTask(task) {
        if (!task) {
            throw new Error('Task is required');
        }
        
        if (!task.title || task.title.trim() === '') {
            throw new Error('Task title is required');
        }
        
        if (!task.userId) {
            throw new Error('Task must be assigned to a user');
        }
    }
    
    _hydrateTask(taskData) {
        // Convert plain object back to Task instance
        // This assumes you have a Task.fromJSON method
        if (typeof Task !== 'undefined' && Task.fromJSON) {
            return Task.fromJSON(taskData);
        }
        return taskData;
    }
    
    _generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    _getFromCache(id) {
        const cached = this._cache.get(id);
        if (!cached) return null;
        
        // Check if cache entry is expired
        if (Date.now() - cached.timestamp > this._cacheExpiry) {
            this._cache.delete(id);
            return null;
        }
        
        return cached.data;
    }
    
    _sortTasks(tasks, sortBy, sortOrder = 'asc') {
        return tasks.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            // Handle date sorting
            if (sortBy.includes('Date') || sortBy.includes('At')) {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            // Handle string sorting
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            let comparison = 0;
            if (aValue > bValue) {
                comparison = 1;
            } else if (aValue < bValue) {
                comparison = -1;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseRepository, TaskRepository };
} else {
    window.BaseRepository = BaseRepository;
    window.TaskRepository = TaskRepository;
}