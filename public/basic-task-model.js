/**
 * Task Model - Day 1 Implementation
 * 
 * Demonstrates:
 * - Encapsulation: Private data with public methods
 * - Data validation: Ensuring data integrity
 * - Business logic: Task-specific operations
 * - Comprehensive error handling: Input validation and error recovery
 */
class Task {
    constructor(title, description, priority = 'medium') {
        try {
            // Validate required fields
            if (!title || typeof title !== 'string' || title.trim() === '') {
                throw new TaskValidationError('Task title is required and must be a non-empty string');
            }
            
            if (description !== undefined && typeof description !== 'string') {
                throw new TaskValidationError('Task description must be a string');
            }
            
            // Private properties (using convention)
            this._id = this._generateId();
            this._title = title.trim();
            this._description = description ? description.trim() : '';
            this._priority = this._validatePriority(priority);
            this._completed = false;
            this._createdAt = new Date();
            this._updatedAt = new Date();
        } catch (error) {
            if (error instanceof TaskValidationError) {
                throw error;
            }
            throw new TaskError('Failed to create task', error);
        }
    }
    
    // Public getters (read-only access)
    get id() { return this._id; }
    get title() { return this._title; }
    get description() { return this._description; }
    get priority() { return this._priority; }
    get completed() { return this._completed; }
    get createdAt() { return this._createdAt; }
    get updatedAt() { return this._updatedAt; }
    
    // Public methods for task operations
    markComplete() {
        try {
            if (this._completed) {
                console.warn(`Task ${this._id} is already completed`);
                return;
            }
            this._completed = true;
            this._updatedAt = new Date();
        } catch (error) {
            throw new TaskError('Failed to mark task as complete', error);
        }
    }
    
    markIncomplete() {
        try {
            if (!this._completed) {
                console.warn(`Task ${this._id} is already incomplete`);
                return;
            }
            this._completed = false;
            this._updatedAt = new Date();
        } catch (error) {
            throw new TaskError('Failed to mark task as incomplete', error);
        }
    }
    
    updateTitle(newTitle) {
        try {
            if (!newTitle || typeof newTitle !== 'string' || newTitle.trim() === '') {
                throw new TaskValidationError('Task title cannot be empty and must be a string');
            }
            
            if (newTitle.length > 200) {
                throw new TaskValidationError('Task title cannot exceed 200 characters');
            }
            
            this._title = newTitle.trim();
            this._updatedAt = new Date();
        } catch (error) {
            if (error instanceof TaskValidationError) {
                throw error;
            }
            throw new TaskError('Failed to update task title', error);
        }
    }
    
    updateDescription(newDescription) {
        try {
            if (newDescription !== undefined && typeof newDescription !== 'string') {
                throw new TaskValidationError('Task description must be a string');
            }
            
            if (newDescription && newDescription.length > 1000) {
                throw new TaskValidationError('Task description cannot exceed 1000 characters');
            }
            
            this._description = newDescription ? newDescription.trim() : '';
            this._updatedAt = new Date();
        } catch (error) {
            if (error instanceof TaskValidationError) {
                throw error;
            }
            throw new TaskError('Failed to update task description', error);
        }
    }
    
    updatePriority(newPriority) {
        try {
            this._priority = this._validatePriority(newPriority);
            this._updatedAt = new Date();
        } catch (error) {
            if (error instanceof TaskValidationError) {
                throw error;
            }
            throw new TaskError('Failed to update task priority', error);
        }
    }
    
    // Convert to plain object for storage/serialization
    toJSON() {
        try {
            return {
                id: this._id,
                title: this._title,
                description: this._description,
                priority: this._priority,
                completed: this._completed,
                createdAt: this._createdAt.toISOString(),
                updatedAt: this._updatedAt.toISOString()
            };
        } catch (error) {
            throw new TaskError('Failed to serialize task to JSON', error);
        }
    }
    
    // Create Task from stored data
    static fromJSON(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new TaskValidationError('Invalid data provided for task creation');
            }
            
            if (!data.title) {
                throw new TaskValidationError('Task data must include a title');
            }
            
            const task = new Task(data.title, data.description, data.priority);
            
            if (data.id) {
                task._id = data.id;
            }
            
            if (typeof data.completed === 'boolean') {
                task._completed = data.completed;
            }
            
            if (data.createdAt) {
                const createdAt = new Date(data.createdAt);
                if (isNaN(createdAt.getTime())) {
                    throw new TaskValidationError('Invalid createdAt date format');
                }
                task._createdAt = createdAt;
            }
            
            if (data.updatedAt) {
                const updatedAt = new Date(data.updatedAt);
                if (isNaN(updatedAt.getTime())) {
                    throw new TaskValidationError('Invalid updatedAt date format');
                }
                task._updatedAt = updatedAt;
            }
            
            return task;
        } catch (error) {
            if (error instanceof TaskValidationError) {
                throw error;
            }
            throw new TaskError('Failed to create task from JSON data', error);
        }
    }
    
    // Private helper methods
    _generateId() {
        try {
            return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        } catch (error) {
            throw new TaskError('Failed to generate task ID', error);
        }
    }
    
    _validatePriority(priority) {
        try {
            if (typeof priority !== 'string') {
                throw new TaskValidationError('Priority must be a string');
            }
            
            const validPriorities = ['low', 'medium', 'high'];
            const normalizedPriority = priority.toLowerCase().trim();
            
            if (!validPriorities.includes(normalizedPriority)) {
                throw new TaskValidationError(
                    `Invalid priority: "${priority}". Must be one of: ${validPriorities.join(', ')}`
                );
            }
            
            return normalizedPriority;
        } catch (error) {
            if (error instanceof TaskValidationError) {
                throw error;
            }
            throw new TaskError('Failed to validate priority', error);
        }
    }
}

// Custom Error Classes for better error handling
class TaskError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'TaskError';
        this.originalError = originalError;
        
        if (originalError) {
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
}

class TaskValidationError extends TaskError {
    constructor(message, originalError = null) {
        super(message, originalError);
        this.name = 'TaskValidationError';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Task, TaskError, TaskValidationError };
} else {
    window.Task = Task;
    window.TaskError = TaskError;
    window.TaskValidationError = TaskValidationError;
}