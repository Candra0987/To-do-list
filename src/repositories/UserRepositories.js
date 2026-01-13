/**
 * User Repository - Day 2 Implementation
 * 
 * Implements the Repository pattern for User entities.
 * Handles all data access operations for users with proper validation and caching.
 * 
 * Demonstrates:
 * - Repository pattern for user management
 * - User-specific query methods
 * - Authentication-related data access
 * - Proper validation and error handling
 * - Caching for performance optimization
 */

// Import BaseRepository if available, otherwise define it
let BaseRepository;
if (typeof require !== 'undefined') {
    try {
        BaseRepository = require('./task-repository').BaseRepository;
    } catch (e) {
        // Define BaseRepository if not available
        BaseRepository = class {
            async create(entity) { throw new Error('create method must be implemented'); }
            async findById(id) { throw new Error('findById method must be implemented'); }
            async findAll(options = {}) { throw new Error('findAll method must be implemented'); }
            async update(id, updates) { throw new Error('update method must be implemented'); }
            async delete(id) { throw new Error('delete method must be implemented'); }
            async exists(id) {
                const entity = await this.findById(id);
                return entity !== null;
            }
            async count(criteria = {}) {
                const entities = await this.findAll();
                return entities.length;
            }
        };
    }
} else if (typeof window !== 'undefined' && window.BaseRepository) {
    BaseRepository = window.BaseRepository;
} else {
    // Define BaseRepository for browser environment
    BaseRepository = class {
        async create(entity) { throw new Error('create method must be implemented'); }
        async findById(id) { throw new Error('findById method must be implemented'); }
        async findAll(options = {}) { throw new Error('findAll method must be implemented'); }
        async update(id, updates) { throw new Error('update method must be implemented'); }
        async delete(id) { throw new Error('delete method must be implemented'); }
        async exists(id) {
            const entity = await this.findById(id);
            return entity !== null;
        }
        async count(criteria = {}) {
            const entities = await this.findAll();
            return entities.length;
        }
    };
}

/**
 * User Repository
 * Handles all data access operations for User entities
 */
class UserRepository extends BaseRepository {
    constructor(storageManager) {
        super();
        this.storage = storageManager;
        this.entityKey = 'users';
        this._cache = new Map();
        this._cacheExpiry = 10 * 60 * 1000; // 10 minutes
    }
    
    /**
     * Create a new user
     */
    async create(user) {
        try {
            this._validateUser(user);
            
            if (!user.id) {
                user.id = this._generateId();
            }
            
            const users = await this._getAllUsers();
            
            // Check for duplicate username or email
            if (users.some(u => u.username === user.username)) {
                throw new Error(`Username ${user.username} already exists`);
            }
            
            if (users.some(u => u.email === user.email)) {
                throw new Error(`Email ${user.email} already exists`);
            }
            
            users.push(user.toJSON ? user.toJSON() : user);
            await this._saveUsers(users);
            
            this._cache.set(user.id, {
                data: user,
                timestamp: Date.now()
            });
            
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    
    /**
     * Find user by ID
     */
    async findById(id) {
        try {
            const cached = this._getFromCache(id);
            if (cached) return cached;
            
            const users = await this._getAllUsers();
            const userData = users.find(u => u.id === id);
            
            if (!userData) return null;
            
            const user = this._hydrateUser(userData);
            this._cache.set(id, {
                data: user,
                timestamp: Date.now()
            });
            
            return user;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }
    
    /**
     * Find all users with optional filtering
     */
    async findAll(options = {}) {
        try {
            const users = await this._getAllUsers();
            let result = users.map(userData => this._hydrateUser(userData));
            
            // Apply filters
            if (options.isActive !== undefined) {
                result = result.filter(user => user.isActive === options.isActive);
            }
            
            if (options.role) {
                result = result.filter(user => user.role === options.role);
            }
            
            if (options.isVerified !== undefined) {
                result = result.filter(user => user.isVerified === options.isVerified);
            }
            
            // Apply sorting
            if (options.sortBy) {
                result = this._sortUsers(result, options.sortBy, options.sortOrder);
            }
            
            // Apply pagination
            if (options.limit || options.offset) {
                const offset = options.offset || 0;
                const limit = options.limit || result.length;
                result = result.slice(offset, offset + limit);
            }
            
            return result;
        } catch (error) {
            console.error('Error finding all users:', error);
            throw error;
        }
    }
    
    /**
     * Update user by ID
     */
    async update(id, updates) {
        try {
            const users = await this._getAllUsers();
            const userIndex = users.findIndex(u => u.id === id);
            
            if (userIndex === -1) return null;
            
            const currentUser = this._hydrateUser(users[userIndex]);
            
            // Apply updates
            Object.keys(updates).forEach(key => {
                if (currentUser.hasOwnProperty(`_${key}`) || currentUser.hasOwnProperty(key)) {
                    const updateMethodName = `update${key.charAt(0).toUpperCase() + key.slice(1)}`;
                    const setMethodName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
                    
                    if (typeof currentUser[updateMethodName] === 'function') {
                        currentUser[updateMethodName](updates[key]);
                    } else if (typeof currentUser[setMethodName] === 'function') {
                        currentUser[setMethodName](updates[key]);
                    } else {
                        if (currentUser.hasOwnProperty(`_${key}`)) {
                            currentUser[`_${key}`] = updates[key];
                        } else {
                            currentUser[key] = updates[key];
                        }
                    }
                }
            });
            
            // Update timestamp
            if (currentUser._updatedAt !== undefined) {
                currentUser._updatedAt = new Date();
            }
            
            users[userIndex] = currentUser.toJSON ? currentUser.toJSON() : currentUser;
            await this._saveUsers(users);
            
            this._cache.set(id, {
                data: currentUser,
                timestamp: Date.now()
            });
            
            return currentUser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    
    /**
     * Delete user by ID
     */
    async delete(id) {
        try {
            const users = await this._getAllUsers();
            const userIndex = users.findIndex(u => u.id === id);
            
            if (userIndex === -1) return false;
            
            users.splice(userIndex, 1);
            await this._saveUsers(users);
            this._cache.delete(id);
            
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
    
    // Specialized query methods
    
    /**
     * Find user by username
     */
    async findByUsername(username) {
        const users = await this._getAllUsers();
        const userData = users.find(u => u.username === username.toLowerCase());
        return userData ? this._hydrateUser(userData) : null;
    }
    
    /**
     * Find user by email
     */
    async findByEmail(email) {
        const users = await this._getAllUsers();
        const userData = users.find(u => u.email === email.toLowerCase());
        return userData ? this._hydrateUser(userData) : null;
    }
    
    /**
     * Find active users
     */
    async findActiveUsers() {
        return this.findAll({ isActive: true });
    }
    
    /**
     * Find users by role
     */
    async findByRole(role) {
        return this.findAll({ role });
    }
    
    /**
     * Find verified users
     */
    async findVerifiedUsers() {
        return this.findAll({ isVerified: true });
    }
    
    /**
     * Search users by name or username
     */
    async search(query) {
        const users = await this.findAll();
        const searchTerm = query.toLowerCase();
        
        return users.filter(user => {
            return user.username.toLowerCase().includes(searchTerm) ||
                   user.displayName.toLowerCase().includes(searchTerm) ||
                   user.firstName.toLowerCase().includes(searchTerm) ||
                   user.lastName.toLowerCase().includes(searchTerm) ||
                   user.email.toLowerCase().includes(searchTerm);
        });
    }
    
    /**
     * Authenticate user by username/email and password
     * Note: In a real application, this would involve proper password hashing
     */
    async authenticate(usernameOrEmail, password) {
        try {
            // Find user by username or email
            let user = await this.findByUsername(usernameOrEmail);
            if (!user) {
                user = await this.findByEmail(usernameOrEmail);
            }
            
            if (!user) {
                return null; // User not found
            }
            
            if (!user.isActive) {
                throw new Error('User account is deactivated');
            }
            
            // In a real app, you would verify the password hash here
            // For demo purposes, we'll assume authentication is successful
            // if the user exists and is active
            
            // Update login information
            user.login();
            await this.update(user.id, {
                lastLoginAt: user.lastLoginAt,
                loginCount: user.loginCount,
                lastActiveAt: user.lastActiveAt
            });
            
            return user;
        } catch (error) {
            console.error('Error authenticating user:', error);
            throw error;
        }
    }
    
    /**
     * Check if username is available
     */
    async isUsernameAvailable(username) {
        const user = await this.findByUsername(username);
        return user === null;
    }
    
    /**
     * Check if email is available
     */
    async isEmailAvailable(email) {
        const user = await this.findByEmail(email);
        return user === null;
    }
    
    /**
     * Get user statistics
     */
    async getStatistics() {
        const users = await this.findAll();
        
        const stats = {
            total: users.length,
            active: users.filter(u => u.isActive).length,
            verified: users.filter(u => u.isVerified).length,
            byRole: {
                user: users.filter(u => u.role === 'user').length,
                moderator: users.filter(u => u.role === 'moderator').length,
                admin: users.filter(u => u.role === 'admin').length,
                'super-admin': users.filter(u => u.role === 'super-admin').length
            },
            newUsers: users.filter(u => u.isNewUser).length,
            recentlyActive: 0
        };
        
        // Count recently active users (active in last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        stats.recentlyActive = users.filter(user => {
            return user.lastActiveAt && new Date(user.lastActiveAt) > oneDayAgo;
        }).length;
        
        return stats;
    }
    
    /**
     * Get users who joined recently
     */
    async getRecentUsers(days = 7) {
        const users = await this.findAll();
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return users.filter(user => {
            return new Date(user.createdAt) > cutoffDate;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    /**
     * Get users by activity level
     */
    async getUsersByActivity(days = 30) {
        const users = await this.findAll();
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return {
            active: users.filter(user => {
                return user.lastActiveAt && new Date(user.lastActiveAt) > cutoffDate;
            }),
            inactive: users.filter(user => {
                return !user.lastActiveAt || new Date(user.lastActiveAt) <= cutoffDate;
            })
        };
    }
    
    // Private helper methods
    
    async _getAllUsers() {
        return this.storage.load(this.entityKey, []);
    }
    
    async _saveUsers(users) {
        return this.storage.save(this.entityKey, users);
    }
    
    _validateUser(user) {
        if (!user) {
            throw new Error('User is required');
        }
        
        if (!user.username || user.username.trim() === '') {
            throw new Error('Username is required');
        }
        
        if (!user.email || user.email.trim() === '') {
            throw new Error('Email is required');
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
            throw new Error('Invalid email format');
        }
    }
    
    _hydrateUser(userData) {
        if (typeof User !== 'undefined' && User.fromJSON) {
            return User.fromJSON(userData);
        }
        return userData;
    }
    
    _generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    _getFromCache(id) {
        const cached = this._cache.get(id);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this._cacheExpiry) {
            this._cache.delete(id);
            return null;
        }
        
        return cached.data;
    }
    
    _sortUsers(users, sortBy, sortOrder = 'asc') {
        return users.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            if (sortBy.includes('Date') || sortBy.includes('At')) {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
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
    module.exports = UserRepository;
} else {
    window.UserRepository = UserRepository;
}