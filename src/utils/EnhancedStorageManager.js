/**
 * Enhanced Storage Manager - Day 2 Implementation
 * 
 * Enhanced version of the storage manager to support multiple entity types,
 * better error handling, and improved performance with caching.
 * 
 * Demonstrates:
 * - Enhanced separation of concerns for data storage
 * - Support for multiple entity types (tasks, users, etc.)
 * - Improved error handling and validation
 * - Caching for better performance
 * - Data migration and versioning support
 * - Backup and restore functionality
 */
class EnhancedStorageManager {
    constructor(storageKey = 'taskManagementApp_v2') {
        this.storageKey = storageKey;
        this.isAvailable = this._checkStorageAvailability();
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.version = '2.0';
        
        // Initialize storage structure if needed
        this._initializeStorage();
    }
    
    /**
     * Save data to localStorage with entity type support
     * @param {string} entityType - The entity type (e.g., 'tasks', 'users')
     * @param {any} data - The data to store
     * @returns {boolean} - Success status
     */
    save(entityType, data) {
        if (!this.isAvailable) {
            console.warn('localStorage not available, data will not persist');
            return false;
        }
        
        try {
            const fullKey = `${this.storageKey}_${entityType}`;
            const dataToStore = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: data
            };
            
            const jsonData = JSON.stringify(dataToStore);
            localStorage.setItem(fullKey, jsonData);
            
            // Update cache
            this.cache.set(entityType, {
                data: data,
                timestamp: Date.now()
            });
            
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            this._handleStorageError(error, 'save', entityType);
            return false;
        }
    }
    
    /**
     * Load data from localStorage with entity type support
     * @param {string} entityType - The entity type to load
     * @param {any} defaultValue - Default value if entity doesn't exist
     * @returns {any} - The loaded data or default value
     */
    load(entityType, defaultValue = null) {
        if (!this.isAvailable) {
            return defaultValue;
        }
        
        try {
            // Check cache first
            const cached = this._getFromCache(entityType);
            if (cached !== null) {
                return cached;
            }
            
            const fullKey = `${this.storageKey}_${entityType}`;
            const jsonData = localStorage.getItem(fullKey);
            
            if (jsonData === null) {
                return defaultValue;
            }
            
            const storedData = JSON.parse(jsonData);
            
            // Handle version migration if needed
            const migratedData = this._migrateData(storedData, entityType);
            
            // Cache the result
            this.cache.set(entityType, {
                data: migratedData.data,
                timestamp: Date.now()
            });
            
            return migratedData.data;
        } catch (error) {
            console.error('Failed to load data:', error);
            this._handleStorageError(error, 'load', entityType);
            return defaultValue;
        }
    }
    
    /**
     * Remove data from localStorage
     * @param {string} entityType - The entity type to remove
     * @returns {boolean} - Success status
     */
    remove(entityType) {
        if (!this.isAvailable) {
            return false;
        }
        
        try {
            const fullKey = `${this.storageKey}_${entityType}`;
            localStorage.removeItem(fullKey);
            
            // Remove from cache
            this.cache.delete(entityType);
            
            return true;
        } catch (error) {
            console.error('Failed to remove data:', error);
            this._handleStorageError(error, 'remove', entityType);
            return false;
        }
    }
    
    /**
     * Clear all app data from localStorage
     * @returns {boolean} - Success status
     */
    clear() {
        if (!this.isAvailable) {
            return false;
        }
        
        try {
            // Remove all keys that start with our storage key
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storageKey)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Clear cache
            this.cache.clear();
            
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            this._handleStorageError(error, 'clear');
            return false;
        }
    }
    
    /**
     * Get all entity types stored
     * @returns {string[]} - Array of entity types
     */
    getEntityTypes() {
        if (!this.isAvailable) {
            return [];
        }
        
        try {
            const entityTypes = [];
            const prefix = `${this.storageKey}_`;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const entityType = key.substring(prefix.length);
                    entityTypes.push(entityType);
                }
            }
            
            return entityTypes;
        } catch (error) {
            console.error('Failed to get entity types:', error);
            return [];
        }
    }
    
    /**
     * Check if entity type exists
     * @param {string} entityType - Entity type to check
     * @returns {boolean} - Whether entity exists
     */
    exists(entityType) {
        if (!this.isAvailable) {
            return false;
        }
        
        const fullKey = `${this.storageKey}_${entityType}`;
        return localStorage.getItem(fullKey) !== null;
    }
    
    /**
     * Get storage usage information
     * @returns {object} - Storage usage stats
     */
    getStorageInfo() {
        if (!this.isAvailable) {
            return { available: false };
        }
        
        try {
            let totalSize = 0;
            let appSize = 0;
            const entitySizes = {};
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const itemSize = key.length + value.length;
                
                totalSize += itemSize;
                
                if (key.startsWith(this.storageKey)) {
                    appSize += itemSize;
                    
                    // Track size by entity type
                    const entityType = key.substring(`${this.storageKey}_`.length);
                    entitySizes[entityType] = itemSize;
                }
            }
            
            return {
                available: true,
                totalSize,
                appSize,
                entitySizes,
                itemCount: localStorage.length,
                cacheSize: this.cache.size,
                version: this.version
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { available: false, error: error.message };
        }
    }
    
    /**
     * Export all data for backup
     * @returns {object} - Exported data
     */
    exportData() {
        if (!this.isAvailable) {
            return null;
        }
        
        try {
            const exportData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                entities: {}
            };
            
            const entityTypes = this.getEntityTypes();
            entityTypes.forEach(entityType => {
                exportData.entities[entityType] = this.load(entityType, []);
            });
            
            return exportData;
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }
    
    /**
     * Import data from backup
     * @param {object} importData - Data to import
     * @param {boolean} overwrite - Whether to overwrite existing data
     * @returns {boolean} - Success status
     */
    importData(importData, overwrite = false) {
        if (!this.isAvailable || !importData || !importData.entities) {
            return false;
        }
        
        try {
            // Validate import data structure
            if (!this._validateImportData(importData)) {
                throw new Error('Invalid import data structure');
            }
            
            // Import each entity type
            Object.keys(importData.entities).forEach(entityType => {
                const existingData = this.load(entityType, []);
                
                if (overwrite || existingData.length === 0) {
                    this.save(entityType, importData.entities[entityType]);
                } else {
                    // Merge data (avoid duplicates by ID if possible)
                    const mergedData = this._mergeEntityData(existingData, importData.entities[entityType]);
                    this.save(entityType, mergedData);
                }
            });
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
    
    /**
     * Backup data to a downloadable file
     * @param {string} filename - Backup filename
     */
    downloadBackup(filename = null) {
        const exportData = this.exportData();
        if (!exportData) {
            console.error('Failed to create backup');
            return;
        }
        
        const backupFilename = filename || `task-management-backup-${new Date().toISOString().split('T')[0]}.json`;
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = backupFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(link.href);
    }
    
    /**
     * Clear cache for specific entity type or all
     * @param {string} entityType - Entity type to clear (optional)
     */
    clearCache(entityType = null) {
        if (entityType) {
            this.cache.delete(entityType);
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * Get cache statistics
     * @returns {object} - Cache statistics
     */
    getCacheStats() {
        const stats = {
            size: this.cache.size,
            entities: [],
            totalMemoryUsage: 0
        };
        
        this.cache.forEach((value, key) => {
            const memoryUsage = JSON.stringify(value.data).length;
            stats.entities.push({
                entityType: key,
                timestamp: value.timestamp,
                age: Date.now() - value.timestamp,
                memoryUsage
            });
            stats.totalMemoryUsage += memoryUsage;
        });
        
        return stats;
    }
    
    // Private helper methods
    
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
    
    _initializeStorage() {
        if (!this.isAvailable) return;
        
        try {
            // Check if this is a first-time initialization
            const metaKey = `${this.storageKey}_meta`;
            const meta = localStorage.getItem(metaKey);
            
            if (!meta) {
                // First time initialization
                const metaData = {
                    version: this.version,
                    initialized: new Date().toISOString(),
                    entityTypes: []
                };
                
                localStorage.setItem(metaKey, JSON.stringify(metaData));
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }
    
    _getFromCache(entityType) {
        const cached = this.cache.get(entityType);
        if (!cached) return null;
        
        // Check if cache entry is expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(entityType);
            return null;
        }
        
        return cached.data;
    }
    
    _migrateData(storedData, entityType) {
        // Handle data migration between versions
        if (!storedData.version) {
            // Migrate from v1 to v2
            return {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: storedData // v1 data was stored directly
            };
        }
        
        // Add more migration logic as needed for future versions
        return storedData;
    }
    
    _handleStorageError(error, operation, entityType = null) {
        const errorInfo = {
            operation,
            entityType,
            error: error.message,
            timestamp: new Date().toISOString()
        };
        
        // In a real app, you might want to send this to an error tracking service
        console.error('Storage error:', errorInfo);
        
        // Try to recover from quota exceeded errors
        if (error.name === 'QuotaExceededError') {
            this._handleQuotaExceeded();
        }
    }
    
    _handleQuotaExceeded() {
        console.warn('Storage quota exceeded, attempting to free space...');
        
        try {
            // Clear cache first
            this.clearCache();
            
            // Remove old backup data if any
            const keysToCheck = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('backup')) {
                    keysToCheck.push(key);
                }
            }
            
            keysToCheck.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    // Ignore errors when cleaning up
                }
            });
            
            console.log('Storage cleanup completed');
        } catch (error) {
            console.error('Failed to clean up storage:', error);
        }
    }
    
    _validateImportData(importData) {
        if (!importData || typeof importData !== 'object') {
            return false;
        }
        
        if (!importData.entities || typeof importData.entities !== 'object') {
            return false;
        }
        
        // Validate each entity type
        for (const entityType in importData.entities) {
            if (!Array.isArray(importData.entities[entityType])) {
                return false;
            }
        }
        
        return true;
    }
    
    _mergeEntityData(existingData, newData) {
        if (!Array.isArray(existingData) || !Array.isArray(newData)) {
            return newData;
        }
        
        const merged = [...existingData];
        const existingIds = new Set(existingData.map(item => item.id).filter(id => id));
        
        newData.forEach(item => {
            if (!item.id || !existingIds.has(item.id)) {
                merged.push(item);
            }
        });
        
        return merged;
    }
}

// Backward compatibility - extend the original StorageManager interface
class StorageManager extends EnhancedStorageManager {
    constructor(storageKey = 'taskManagementApp_v2') {
        super(storageKey);
    }
    
    // Maintain backward compatibility with Day 1 interface
    save(key, data) {
        // If called with old interface (key, data), treat key as entityType
        return super.save(key, data);
    }
    
    load(key, defaultValue = null) {
        // If called with old interface (key, defaultValue), treat key as entityType
        return super.load(key, defaultValue);
    }
    
    remove(key) {
        // If called with old interface (key), treat key as entityType
        return super.remove(key);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, EnhancedStorageManager };
} else {
    window.StorageManager = StorageManager;
    window.EnhancedStorageManager = EnhancedStorageManager;
}