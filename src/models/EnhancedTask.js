/**
 * Enhanced Task Model - Day 2 Implementation
 * 
 * Represents a task with enhanced properties for multi-user support,
 * categorization, time tracking, and improved organization.
 * 
 * Demonstrates:
 * - Enhanced encapsulation with additional properties
 * - Multi-user support with ownership and assignment
 * - Category and tag management for organization
 * - Time tracking with estimated and actual hours
 * - Due date management with overdue detection
 * - Status management beyond simple completion
 * - Note and attachment support for rich task data
 * - Dependency tracking between tasks
 */
class Task {
    constructor(title, description, userId, options = {}) {
        // Validate required parameters
        this._validateConstructorParams(title, description, userId);
        
        // Core properties (immutable after creation)
        this._id = options.id || this._generateId();
        this._createdAt = options.createdAt ? new Date(options.createdAt) : new Date();
        
        // Basic properties (from Day 1, enhanced)
        this._title = title.trim();
        this._description = description ? description.trim() : '';
        this._priority = this._validatePriority(options.priority || 'medium');
        this._completed = Boolean(options.completed);
        this._updatedAt = options.updatedAt ? new Date(options.updatedAt) : new Date();
        
        // User-related properties (new in Day 2)
        this._userId = userId; // Owner of the task
        this._assignedTo = options.assignedTo || userId; // Who should complete it
        
        // Organization properties (new in Day 2)
        this._category = this._validateCategory(options.category || 'general');
        this._tags = this._validateTags(options.tags || []);
        
        // Time-related properties (new in Day 2)
        this._dueDate = options.dueDate ? new Date(options.dueDate) : null;
        this._estimatedHours = this._validateHours(options.estimatedHours);
        this._actualHours = this._validateHours(options.actualHours);
        
        // Status properties (enhanced in Day 2)
        this._status = this._validateStatus(options.status || 'pending');
        this._completedAt = options.completedAt ? new Date(options.completedAt) : null;
        
        // Metadata (new in Day 2)
        this._notes = options.notes || [];
        this._attachments = options.attachments || [];
        this._dependencies = options.dependencies || []; // Task IDs this task depends on
    }
    
    // Immutable properties (read-only)
    get id() { return this._id; }
    get createdAt() { return new Date(this._createdAt); }
    get userId() { return this._userId; }
    
    // Basic properties (with controlled access)
    get title() { return this._title; }
    get description() { return this._description; }
    get priority() { return this._priority; }
    get completed() { return this._completed; }
    get updatedAt() { return new Date(this._updatedAt); }
    
    // User-related properties
    get assignedTo() { return this._assignedTo; }
    
    // Organization properties
    get category() { return this._category; }
    get tags() { return [...this._tags]; } // Return copy to prevent mutation
    
    // Time-related properties
    get dueDate() { return this._dueDate ? new Date(this._dueDate) : null; }
    get estimatedHours() { return this._estimatedHours; }
    get actualHours() { return this._actualHours; }
    
    // Status properties
    get status() { return this._status; }
    get completedAt() { return this._completedAt ? new Date(this._completedAt) : null; }
    
    // Metadata properties
    get notes() { return [...this._notes]; }
    get attachments() { return [...this._attachments]; }
    get dependencies() { return [...this._dependencies]; }
    
    // Computed properties
    get isOverdue() {
        if (!this._dueDate || this._completed) return false;
        return new Date() > this._dueDate;
    }
    
    get daysUntilDue() {
        if (!this._dueDate) return null;
        const now = new Date();
        const diffTime = this._dueDate - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    get progress() {
        if (this._completed) return 100;
        if (!this._estimatedHours || !this._actualHours) return 0;
        return Math.min(100, (this._actualHours / this._estimatedHours) * 100);
    }
    
    // Basic update methods (from Day 1, enhanced)
    updateTitle(newTitle) {
        if (!newTitle || newTitle.trim() === '') {
            throw new Error('Task title cannot be empty');
        }
        this._title = newTitle.trim();
        this._touch();
        return this;
    }
    
    updateDescription(newDescription) {
        this._description = newDescription ? newDescription.trim() : '';
        this._touch();
        return this;
    }
    
    updatePriority(newPriority) {
        this._priority = this._validatePriority(newPriority);
        this._touch();
        return this;
    }
    
    // Completion methods (enhanced)
    markComplete() {
        if (this._completed) return this;
        
        this._completed = true;
        this._status = 'completed';
        this._completedAt = new Date();
        this._touch();
        return this;
    }
    
    markIncomplete() {
        if (!this._completed) return this;
        
        this._completed = false;
        this._status = 'pending';
        this._completedAt = null;
        this._touch();
        return this;
    }
    
    // Assignment methods (new in Day 2)
    assignTo(userId) {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Valid user ID is required for assignment');
        }
        this._assignedTo = userId;
        this._touch();
        return this;
    }
    
    reassignToOwner() {
        this._assignedTo = this._userId;
        this._touch();
        return this;
    }
    
    // Category methods (new in Day 2)
    setCategory(category) {
        this._category = this._validateCategory(category);
        this._touch();
        return this;
    }
    
    // Tag methods (new in Day 2)
    addTag(tag) {
        if (!tag || typeof tag !== 'string') {
            throw new Error('Tag must be a non-empty string');
        }
        
        const normalizedTag = tag.trim().toLowerCase();
        if (!this._tags.includes(normalizedTag)) {
            this._tags.push(normalizedTag);
            this._touch();
        }
        return this;
    }
    
    removeTag(tag) {
        const normalizedTag = tag.trim().toLowerCase();
        const index = this._tags.indexOf(normalizedTag);
        if (index > -1) {
            this._tags.splice(index, 1);
            this._touch();
        }
        return this;
    }
    
    clearTags() {
        this._tags = [];
        this._touch();
        return this;
    }
    
    hasTag(tag) {
        return this._tags.includes(tag.trim().toLowerCase());
    }
    
    // Time management methods (new in Day 2)
    setDueDate(date) {
        if (date && !(date instanceof Date)) {
            date = new Date(date);
        }
        
        if (date && isNaN(date.getTime())) {
            throw new Error('Invalid due date');
        }
        
        this._dueDate = date;
        this._touch();
        return this;
    }
    
    clearDueDate() {
        this._dueDate = null;
        this._touch();
        return this;
    }
    
    setEstimatedHours(hours) {
        this._estimatedHours = this._validateHours(hours);
        this._touch();
        return this;
    }
    
    setActualHours(hours) {
        this._actualHours = this._validateHours(hours);
        this._touch();
        return this;
    }
    
    addTimeSpent(hours) {
        if (typeof hours !== 'number' || hours < 0) {
            throw new Error('Hours must be a positive number');
        }
        
        this._actualHours = (this._actualHours || 0) + hours;
        this._touch();
        return this;
    }
    
    // Status methods (new in Day 2)
    setStatus(status) {
        this._status = this._validateStatus(status);
        
        // Auto-update completion status based on status
        if (status === 'completed' && !this._completed) {
            this.markComplete();
        } else if (status !== 'completed' && this._completed) {
            this.markIncomplete();
        }
        
        return this;
    }
    
    // Note methods (new in Day 2)
    addNote(note, author = null) {
        if (!note || typeof note !== 'string') {
            throw new Error('Note must be a non-empty string');
        }
        
        const noteObj = {
            id: this._generateId(),
            content: note.trim(),
            author: author,
            createdAt: new Date()
        };
        
        this._notes.push(noteObj);
        this._touch();
        return this;
    }
    
    removeNote(noteId) {
        const index = this._notes.findIndex(note => note.id === noteId);
        if (index > -1) {
            this._notes.splice(index, 1);
            this._touch();
        }
        return this;
    }
    
    // Dependency methods (new in Day 2)
    addDependency(taskId) {
        if (!taskId || typeof taskId !== 'string') {
            throw new Error('Task ID must be a non-empty string');
        }
        
        if (taskId === this._id) {
            throw new Error('Task cannot depend on itself');
        }
        
        if (!this._dependencies.includes(taskId)) {
            this._dependencies.push(taskId);
            this._touch();
        }
        return this;
    }
    
    removeDependency(taskId) {
        const index = this._dependencies.indexOf(taskId);
        if (index > -1) {
            this._dependencies.splice(index, 1);
            this._touch();
        }
        return this;
    }
    
    hasDependency(taskId) {
        return this._dependencies.includes(taskId);
    }
    
    // Utility methods
    clone() {
        const clonedData = this.toJSON();
        clonedData.id = this._generateId(); // New ID for clone
        clonedData.createdAt = new Date();
        clonedData.updatedAt = new Date();
        return Task.fromJSON(clonedData);
    }
    
    // Serialization methods
    toJSON() {
        return {
            id: this._id,
            title: this._title,
            description: this._description,
            userId: this._userId,
            assignedTo: this._assignedTo,
            priority: this._priority,
            category: this._category,
            tags: [...this._tags],
            completed: this._completed,
            status: this._status,
            dueDate: this._dueDate ? this._dueDate.toISOString() : null,
            estimatedHours: this._estimatedHours,
            actualHours: this._actualHours,
            notes: [...this._notes],
            attachments: [...this._attachments],
            dependencies: [...this._dependencies],
            createdAt: this._createdAt.toISOString(),
            updatedAt: this._updatedAt.toISOString(),
            completedAt: this._completedAt ? this._completedAt.toISOString() : null
        };
    }
    
    static fromJSON(data) {
        const task = new Task(data.title, data.description, data.userId, {
            id: data.id,
            assignedTo: data.assignedTo,
            priority: data.priority,
            category: data.category,
            tags: data.tags,
            completed: data.completed,
            status: data.status,
            dueDate: data.dueDate,
            estimatedHours: data.estimatedHours,
            actualHours: data.actualHours,
            notes: data.notes,
            attachments: data.attachments,
            dependencies: data.dependencies,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            completedAt: data.completedAt
        });
        
        return task;
    }
    
    // Private validation methods
    _validateConstructorParams(title, description, userId) {
        if (!title || typeof title !== 'string' || title.trim() === '') {
            throw new Error('Task title is required and must be a non-empty string');
        }
        
        if (description !== null && description !== undefined && typeof description !== 'string') {
            throw new Error('Task description must be a string or null');
        }
        
        if (!userId || typeof userId !== 'string') {
            throw new Error('User ID is required and must be a non-empty string');
        }
    }
    
    _validatePriority(priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            throw new Error(`Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`);
        }
        return priority;
    }
    
    _validateCategory(category) {
        if (!category || typeof category !== 'string') {
            throw new Error('Category must be a non-empty string');
        }
        return category.trim().toLowerCase();
    }
    
    _validateTags(tags) {
        if (!Array.isArray(tags)) {
            throw new Error('Tags must be an array');
        }
        
        return tags.map(tag => {
            if (typeof tag !== 'string') {
                throw new Error('All tags must be strings');
            }
            return tag.trim().toLowerCase();
        });
    }
    
    _validateStatus(status) {
        const validStatuses = ['pending', 'in-progress', 'blocked', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
        }
        return status;
    }
    
    _validateHours(hours) {
        if (hours === null || hours === undefined) {
            return null;
        }
        
        if (typeof hours !== 'number' || hours < 0) {
            throw new Error('Hours must be a positive number or null');
        }
        
        return hours;
    }
    
    _generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    _touch() {
        this._updatedAt = new Date();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Task;
} else {
    window.Task = Task;
}