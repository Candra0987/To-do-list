/**
 * StorageManager - Day 1 Implementation
 * 
 * Demonstrates:
 * - Separation of concerns: Data storage is separate from business logic
 * - Error handling: Graceful handling of storage failures
 * - Abstraction: Provides simple interface for complex operations
 * - Input validation: Comprehensive validation of all inputs
 * - Error recovery: Graceful degradation when storage is unavailable
 */
class StorageManager {
    constructor(storageKey = 'taskManagementApp') {
        try {
            if (!storageKey || typeof storageKey !== 'string' || storageKey.trim() === '') {
                throw new StorageValidationError('Storage key must be a non-empty string');
            }
            
            this.storageKey = storageKey.trim();
            this.isAvailable = this._checkStorageAvailability();
            
            if (!this.isAvailable) {
                console.warn('localStorage not available - data will not persist between sessions');
            }
        } catch (error) {
            if (error instanceof StorageValidationError) {
                throw error;
            }
            throw new StorageError('Failed to initialize StorageManager', error);
        }
    }
    
    /**
     * Save data to localStorage
     * @param {string} key - The key to store data under
     * @param {any} data - The data to store (will be JSON stringified)
     * @returns {boolean} - Success status
     */
    save(key, data) {
        try {
            // Input validation
            if (!key || typeof key !== 'string' || key.trim() === '') {
                throw new StorageValidationError('Save key must be a non-empty string');
            }
            
            if (data === undefined) {
                throw new StorageValidationError('Cannot save undefined data');
            }
            
            if (!this.isAvailable) {
                console.warn('localStorage not available, data will not persist');
                return false;
            }
            
            const fullKey = `${this.storageKey}_${key.trim()}`;
            
            // Check if key is too long
            if (fullKey.length > 1000) {
                throw new StorageValidationError('Storage key is too long (max 1000 characters)');
            }
            
            let jsonData;
            try {
                jsonData = JSON.stringify(data);
            } catch (jsonError) {
                throw new StorageError('Failed to serialize data to JSON', jsonError);
            }
            
            // Check storage quota
            try {
                localStorage.setItem(fullKey, jsonData);
            } catch (quotaError) {
                if (quotaError.name === 'QuotaExceededError') {
                    throw new StorageQuotaError('Storage quota exceeded. Consider clearing old data.');
                }
                throw new StorageError('Failed to save to localStorage', quotaError);
            }
            
            return true;
        } catch (error) {
            if (error instanceof StorageError) {
                console.error('Storage save error:', error.message);
                throw error;
            }
            
            const storageError = new StorageError('Unexpected error during save operation', error);
            console.error('Storage save error:', storageError.message);
            throw storageError;
        }
    }
    
    /**
     * Load data from localStorage
     * @param {string} key - The key to load data from
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} - The loaded data or default value
     */
    load(key, defaultValue = null) {
        try {
            // Input validation
            if (!key || typeof key !== 'string' || key.trim() === '') {
                throw new StorageValidationError('Load key must be a non-empty string');
            }
            
            if (!this.isAvailable) {
                console.warn('localStorage not available, returning default value');
                return defaultValue;
            }
            
            const fullKey = `${this.storageKey}_${key.trim()}`;
            
            let jsonData;
            try {
                jsonData = localStorage.getItem(fullKey);
            } catch (accessError) {
                throw new StorageError('Failed to access localStorage', accessError);
            }
            
            if (jsonData === null) {
                return defaultValue;
            }
            
            try {
                return JSON.parse(jsonData);
            } catch (parseError) {
                console.warn(`Failed to parse stored data for key "${key}", returning default value`);
                // Optionally remove corrupted data
                this.remove(key);
                return defaultValue;
            }
        } catch (error) {
            if (error instanceof StorageError) {
                console.error('Storage load error:', error.message);
                return defaultValue;
            }
            
            console.error('Unexpected error during load operation:', error.message);
            return defaultValue;
        }
    }
    
    /**
     * Remove data from localStorage
     * @param {string} key - The key to remove
     * @returns {boolean} - Success status
     */
    remove(key) {
        try {
            // Input validation
            if (!key || typeof key !== 'string' || key.trim() === '') {
                throw new StorageValidationError('Remove key must be a non-empty string');
            }
            
            if (!this.isAvailable) {
                console.warn('localStorage not available');
                return false;
            }
            
            const fullKey = `${this.storageKey}_${key.trim()}`;
            
            try {
                localStorage.removeItem(fullKey);
                return true;
            } catch (removeError) {
                throw new StorageError('Failed to remove from localStorage', removeError);
            }
        } catch (error) {
            if (error instanceof StorageError) {
                console.error('Storage remove error:', error.message);
                throw error;
            }
            
            const storageError = new StorageError('Unexpected error during remove operation', error);
            console.error('Storage remove error:', storageError.message);
            throw storageError;
        }
    }
    
    /**
     * Clear all app data from localStorage
     * @returns {boolean} - Success status
     */
    clear() {
        try {
            if (!this.isAvailable) {
                console.warn('localStorage not available');
                return false;
            }
            
            // Remove all keys that start with our storage key
            const keysToRemove = [];
            
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.storageKey)) {
                        keysToRemove.push(key);
                    }
                }
            } catch (accessError) {
                throw new StorageError('Failed to enumerate localStorage keys', accessError);
            }
            
            let failedRemovals = 0;
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (removeError) {
                    failedRemovals++;
                    console.warn(`Failed to remove key "${key}":`, removeError.message);
                }
            });
            
            if (failedRemovals > 0) {
                console.warn(`Failed to remove ${failedRemovals} out of ${keysToRemove.length} keys`);
            }
            
            return failedRemovals === 0;
        } catch (error) {
            if (error instanceof StorageError) {
                console.error('Storage clear error:', error.message);
                throw error;
            }
            
            const storageError = new StorageError('Unexpected error during clear operation', error);
            console.error('Storage clear error:', storageError.message);
            throw storageError;
        }
    }
    
    /**
     * Get storage usage information
     * @returns {object} - Storage usage stats
     */
    getStorageInfo() {
        try {
            if (!this.isAvailable) {
                return { 
                    available: false, 
                    error: 'localStorage not available' 
                };
            }
            
            let totalSize = 0;
            let appSize = 0;
            let appItemCount = 0;
            
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key) continue;
                    
                    const value = localStorage.getItem(key);
                    if (value === null) continue;
                    
                    const itemSize = key.length + value.length;
                    totalSize += itemSize;
                    
                    if (key.startsWith(this.storageKey)) {
                        appSize += itemSize;
                        appItemCount++;
                    }
                }
            } catch (accessError) {
                throw new StorageError('Failed to calculate storage usage', accessError);
            }
            
            return {
                available: true,
                totalSize,
                appSize,
                totalItemCount: localStorage.length,
                appItemCount,
                usagePercentage: totalSize > 0 ? Math.round((appSize / totalSize) * 100) : 0
            };
        } catch (error) {
            if (error instanceof StorageError) {
                console.error('Storage info error:', error.message);
                return { 
                    available: false, 
                    error: error.message 
                };
            }
            
            console.error('Unexpected error getting storage info:', error.message);
            return { 
                available: false, 
                error: 'Unexpected error occurred' 
            };
        }
    }
    
    /**
     * Check if a key exists in storage
     * @param {string} key - The key to check
     * @returns {boolean} - Whether the key exists
     */
    exists(key) {
        try {
            if (!key || typeof key !== 'string' || key.trim() === '') {
                throw new StorageValidationError('Exists key must be a non-empty string');
            }
            
            if (!this.isAvailable) {
                return false;
            }
            
            const fullKey = `${this.storageKey}_${key.trim()}`;
            return localStorage.getItem(fullKey) !== null;
        } catch (error) {
            if (error instanceof StorageError) {
                console.error('Storage exists check error:', error.message);
                return false;
            }
            
            console.error('Unexpected error checking key existence:', error.message);
            return false;
        }
    }
    
    // Private helper method
    _checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Custom Error Classes for better error handling
class StorageError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'StorageError';
        this.originalError = originalError;
        
        if (originalError) {
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
}

class StorageValidationError extends StorageError {
    constructor(message, originalError = null) {
        super(message, originalError);
        this.name = 'StorageValidationError';
    }
}

class StorageQuotaError extends StorageError {
    constructor(message, originalError = null) {
        super(message, originalError);
        this.name = 'StorageQuotaError';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        StorageManager, 
        StorageError, 
        StorageValidationError, 
        StorageQuotaError 
    };
} else {
    window.StorageManager = StorageManager;
    window.StorageError = StorageError;
    window.StorageValidationError = StorageValidationError;
    window.StorageQuotaError = StorageQuotaError;
}