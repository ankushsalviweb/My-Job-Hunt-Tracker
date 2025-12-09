/**
 * FirebaseStorageService - Firestore CRUD for Applications
 * Mirrors the StorageService interface for seamless swapping
 */
import { db } from './firebase-config.js';
import { getAuthService } from './AuthService.js';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    writeBatch,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';

/**
 * @typedef {import('../models/Application.js').ApplicationData} ApplicationData
 */

class FirebaseStorageService {
    constructor() {
        /** @type {ApplicationData[]} */
        this.applications = [];
        /** @type {Function[]} */
        this.listeners = [];
        /** @type {Function | null} */
        this.unsubscribeSnapshot = null;
        this.initialized = false;
    }

    /**
     * Get the collection reference for current user
     * @private
     * @returns {import('firebase/firestore').CollectionReference}
     */
    getCollectionRef() {
        const uid = getAuthService().getUid();
        if (!uid) throw new Error('User not authenticated');
        return collection(db, 'users', uid, 'applications');
    }

    /**
     * Initialize real-time listener for applications
     * Waits for first data load before resolving
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;

        const uid = getAuthService().getUid();
        if (!uid) return;

        // Return a promise that resolves after first snapshot
        return new Promise((resolve, reject) => {
            const q = query(this.getCollectionRef(), orderBy('lastUpdated', 'desc'));

            let firstSnapshot = true;

            this.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                this.applications = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                }));
                this.notifyListeners();

                // Resolve on first snapshot
                if (firstSnapshot) {
                    firstSnapshot = false;
                    this.initialized = true;
                    resolve();
                }
            }, (error) => {
                console.error('Firestore snapshot error:', error);
                if (firstSnapshot) {
                    firstSnapshot = false;
                    reject(error);
                }
            });
        });
    }

    /**
     * Load all applications from Firestore
     * @returns {ApplicationData[]}
     */
    load() {
        return [...this.applications];
    }

    /**
     * Load applications asynchronously (for initial load)
     * @returns {Promise<ApplicationData[]>}
     */
    async loadAsync() {
        try {
            const snapshot = await getDocs(this.getCollectionRef());
            this.applications = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            return this.applications;
        } catch (error) {
            console.error('Failed to load applications:', error);
            return [];
        }
    }

    /**
     * Save a single application to Firestore
     * @param {ApplicationData} application 
     * @returns {Promise<void>}
     */
    async saveOne(application) {
        try {
            const docRef = doc(this.getCollectionRef(), application.id);
            await setDoc(docRef, application);
        } catch (error) {
            console.error('Failed to save application:', error);
            throw error;
        }
    }

    /**
     * Save all applications to Firestore (batch write)
     * Used for import operations
     * @param {ApplicationData[]} applications 
     * @returns {Promise<void>}
     */
    async save(applications) {
        try {
            const batch = writeBatch(db);
            const collectionRef = this.getCollectionRef();

            // Delete all existing docs first
            const snapshot = await getDocs(collectionRef);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Add all new docs
            applications.forEach(app => {
                const docRef = doc(collectionRef, app.id);
                batch.set(docRef, app);
            });

            await batch.commit();
            this.applications = applications;
        } catch (error) {
            console.error('Failed to save applications:', error);
            throw error;
        }
    }

    /**
     * Delete an application from Firestore
     * @param {string} appId 
     * @returns {Promise<void>}
     */
    async delete(appId) {
        try {
            const docRef = doc(this.getCollectionRef(), appId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Failed to delete application:', error);
            throw error;
        }
    }

    /**
     * Subscribe to data changes
     * @param {Function} callback 
     */
    subscribe(callback) {
        this.listeners.push(callback);
    }

    /**
     * Unsubscribe from data changes
     * @param {Function} callback 
     */
    unsubscribe(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners
     * @private
     */
    notifyListeners() {
        this.listeners.forEach(cb => {
            try {
                cb(this.applications);
            } catch (e) {
                console.error('Storage listener error:', e);
            }
        });
    }

    /**
     * Cleanup - remove snapshot listener
     */
    cleanup() {
        if (this.unsubscribeSnapshot) {
            this.unsubscribeSnapshot();
            this.unsubscribeSnapshot = null;
        }
        this.initialized = false;
        this.applications = [];
    }

    /**
     * Export data as JSON string (same interface as StorageService)
     * @param {ApplicationData[]} applications
     * @returns {string}
     */
    exportData(applications) {
        return JSON.stringify(applications, null, 2);
    }

    /**
     * Import data from JSON string (same interface as StorageService)
     * @param {string} jsonString
     * @returns {{success: boolean, data?: ApplicationData[], error?: string}}
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) {
                return { success: false, error: 'Invalid data format: expected array' };
            }
            return { success: true, data };
        } catch (error) {
            return { success: false, error: 'Invalid JSON format' };
        }
    }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get or create the FirebaseStorageService instance
 * @returns {FirebaseStorageService}
 */
export function getFirebaseStorageService() {
    if (!serviceInstance) {
        serviceInstance = new FirebaseStorageService();
    }
    return serviceInstance;
}

/**
 * Reset the service (for logout)
 */
export function resetFirebaseStorageService() {
    if (serviceInstance) {
        serviceInstance.cleanup();
        serviceInstance = null;
    }
}

export { FirebaseStorageService };
