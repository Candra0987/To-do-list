/**
 * Day 2 Complete Application - MVC Implementation
 * 
 * This file demonstrates the complete Day 2 implementation with proper MVC architecture,
 * Repository pattern, enhanced models, and full integration of all components.
 * 
 * Demonstrates:
 * - Complete MVC architecture implementation
 * - Repository pattern integration
 * - Enhanced models with multi-user support
 * - Proper separation of concerns
 * - Event-driven architecture
 * - Error handling and user feedback
 */

/**
 * Enhanced Task Service - Day 2 Implementation
 * Coordinates between repositories and provides business logic
 */
class TaskService {
    constructor(taskRepository, userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.listeners = new Set();
    }
    
    addListener(listener) {
        this.listeners.add(listener);
    }
    
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    notifyListeners(eventType, data) {
        this.listeners.forEach(listener => {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('Error in task service listener:', error);
            }
        });
    }
    
    async createTask(taskData) {
        try {
            // Validate user exists
            const user = await this.userRepository.findById(taskData.userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Create task instance
            const task = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            
            // Save through repository
            const savedTask = await this.taskRepository.create(task);
            
            this.notifyListeners('taskCreated', savedTask);
            return savedTask;
        } catch (error) {
            this.notifyListeners('error', { operation: 'createTask', error: error.message });
            throw error;
        }
    }
    
    async getTaskById(taskId) {
        return await this.taskRepository.findById(taskId);
    }
    
    async updateTask(taskId, updates) {
        try {
            const updatedTask = await this.taskRepository.update(taskId, updates);
            if (updatedTask) {
                this.notifyListeners('taskUpdated', updatedTask);
            }
            return updatedTask;
        } catch (error) {
            this.notifyListeners('error', { operation: 'updateTask', error: error.message });
            throw error;
        }
    }
    
    async deleteTask(taskId) {
        try {
            const success = await this.taskRepository.delete(taskId);
            if (success) {
                this.notifyListeners('taskDeleted', { taskId });
            }
            return success;
        } catch (error) {
            this.notifyListeners('error', { operation: 'deleteTask', error: error.message });
            throw error;
        }
    }
    
    async getTasksForUser(userId) {
        return await this.taskRepository.findAll({ userId });
    }
    
    async getPendingTasks(userId) {
        return await this.taskRepository.findAll({ userId, completed: false });
    }
    
    async getCompletedTasks(userId) {
        return await this.taskRepository.findAll({ userId, completed: true });
    }
    
    async getOverdueTasks(userId) {
        const allTasks = await this.taskRepository.findAll({ userId });
        return allTasks.filter(task => task.isOverdue);
    }
    
    async getTasksByPriority(userId, priority) {
        return await this.taskRepository.findAll({ userId, priority });
    }
    
    async getTasksByCategory(userId, category) {
        return await this.taskRepository.findAll({ userId, category });
    }
    
    async getTasksAssignedToUser(userId) {
        return await this.taskRepository.findAll({ assignedTo: userId });
    }
    
    async searchTasks(userId, query) {
        const userTasks = await this.taskRepository.findAll({ userId });
        return userTasks.filter(task => 
            task.title.toLowerCase().includes(query.toLowerCase()) ||
            task.description.toLowerCase().includes(query.toLowerCase()) ||
            task.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
    }
    
    async getTaskStats(userId) {
        return await this.taskRepository.getStatistics(userId);
    }
}

/**
 * Enhanced User Service - Day 2 Implementation
 */
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.listeners = new Set();
    }
    
    addListener(listener) {
        this.listeners.add(listener);
    }
    
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    notifyListeners(eventType, data) {
        this.listeners.forEach(listener => {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('Error in user service listener:', error);
            }
        });
    }
    
    async createUser(userData) {
        try {
            const user = new User(userData.username, userData.email, userData);
            const savedUser = await this.userRepository.create(user);
            
            this.notifyListeners('userCreated', savedUser);
            return savedUser;
        } catch (error) {
            this.notifyListeners('error', { operation: 'createUser', error: error.message });
            throw error;
        }
    }
    
    async getUserById(userId) {
        return await this.userRepository.findById(userId);
    }
    
    async updateUser(userId, updates) {
        try {
            const updatedUser = await this.userRepository.update(userId, updates);
            if (updatedUser) {
                this.notifyListeners('userUpdated', updatedUser);
            }
            return updatedUser;
        } catch (error) {
            this.notifyListeners('error', { operation: 'updateUser', error: error.message });
            throw error;
        }
    }
    
    async getAllUsers() {
        return await this.userRepository.findAll();
    }
    
    async authenticateUser(usernameOrEmail, password) {
        return await this.userRepository.authenticate(usernameOrEmail, password);
    }
    
    async logoutUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (user) {
            user.logout();
            await this.userRepository.update(userId, user.toJSON());
        }
    }
}

/**
 * Day 2 Task Management Application
 * Orchestrates all MVC components and manages application lifecycle
 */
class Day2TaskManagementApp {
    constructor() {
        this.storageManager = null;
        this.taskRepository = null;
        this.userRepository = null;
        this.taskService = null;
        this.userService = null;
        this.taskController = null;
        this.taskView = null;
        this.currentUser = null;
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Day 2 Task Management Application...');
            
            // Initialize storage layer
            this.storageManager = new StorageManager('taskManagementApp_day2');
            
            // Initialize repositories
            this.taskRepository = new TaskRepository(this.storageManager);
            this.userRepository = new UserRepository(this.storageManager);
            
            // Initialize services
            this.taskService = new TaskService(this.taskRepository, this.userRepository);
            this.userService = new UserService(this.userRepository);
            
            // Initialize views
            this.taskView = new TaskView('app');
            
            // Initialize controllers
            this.taskController = new TaskController(this.taskService, this.userService, this.taskView);
            
            // Set up cross-component communication
            this.setupCommunication();
            
            // Load or create default user
            await this.initializeUser();
            
            console.log('✅ Day 2 Application initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize Day 2 application:', error);
            throw error;
        }
    }
    
    /**
     * Set up communication between components
     */
    setupCommunication() {
        // Listen for task controller events
        this.taskController.addListener((eventType, data) => {
            console.log(`Task Controller Event: ${eventType}`, data);
        });
        
        // Listen for service events
        this.taskService.addListener((eventType, data) => {
            console.log(`Task Service Event: ${eventType}`, data);
        });
        
        this.userService.addListener((eventType, data) => {
            console.log(`User Service Event: ${eventType}`, data);
        });
    }
    
    /**
     * Initialize user (create default user if none exists)
     */
    async initializeUser() {
        try {
            // Try to load existing users
            const users = await this.userService.getAllUsers();
            
            if (users.length === 0) {
                // Create default user
                console.log('Creating default user...');
                this.currentUser = await this.userService.createUser({
                    username: 'demo_user',
                    email: 'demo@example.com',
                    displayName: 'Demo User',
                    firstName: 'Demo',
                    lastName: 'User'
                });
            } else {
                // Use first user as current user
                this.currentUser = users[0];
            }
            
            // Initialize task controller with current user
            await this.taskController.initialize(this.currentUser.id);
            
        } catch (error) {
            console.error('Failed to initialize user:', error);
            throw error;
        }
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Switch to a different user
     */
    async switchUser(userId) {
        try {
            const user = await this.userService.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            this.currentUser = user;
            await this.taskController.setCurrentUser(userId);
            
            console.log(`Switched to user: ${user.displayName}`);
        } catch (error) {
            console.error('Failed to switch user:', error);
            throw error;
        }
    }
    
    /**
     * Create a new user
     */
    async createUser(userData) {
        return await this.userService.createUser(userData);
    }
    
    /**
     * Get application statistics
     */
    async getAppStats() {
        const taskStats = await this.taskService.getTaskStats();
        const userCount = (await this.userService.getAllUsers()).length;
        
        return {
            users: userCount,
            tasks: taskStats,
            storage: this.storageManager.getStorageInfo()
        };
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create app container if it doesn't exist
        let appContainer = document.getElementById('app');
        if (!appContainer) {
            appContainer = document.createElement('div');
            appContainer.id = 'app';
            document.body.appendChild(appContainer);
        }
        
        const app = new Day2TaskManagementApp();
        await app.initialize();
        
        // Make app globally available for debugging
        window.day2App = app;
        
        console.log('🎉 Day 2 Task Management Application is ready!');
        
    } catch (error) {
        console.error('Failed to start Day 2 application:', error);
        document.body.innerHTML = `
            <div class="error-container">
                <h1>Application Error</h1>
                <p>Failed to initialize the Day 2 application. Please refresh the page and try again.</p>
                <details>
                    <summary>Error Details</summary>
                    <pre>${error.message}</pre>
                </details>
            </div>
        `;
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Day2TaskManagementApp, TaskService, UserService };
} else {
    window.Day2TaskManagementApp = Day2TaskManagementApp;
    window.TaskService = TaskService;
    window.UserService = UserService;
}