/**
 * StorageServiceAdapter - Returns appropriate storage service based on auth state
 * Enables seamless switching between LocalStorage and Firebase
 * Uses ES module imports instead of require()
 */
import { StorageService } from './StorageService.js';
import { getAuthService } from './AuthService.js';
import { getFirebaseStorageService } from './FirebaseStorageService.js';

/**
 * Get the appropriate storage service
 * Returns FirebaseStorageService when user is authenticated, otherwise StorageService
 * @returns {StorageService | import('./FirebaseStorageService.js').FirebaseStorageService}
 */
export function getStorageService() {
    try {
        if (getAuthService().isAuthenticated()) {
            return getFirebaseStorageService();
        }
    } catch (e) {
        console.warn('Firebase not available, using local storage:', e);
    }

    return new StorageService();
}

/**
 * Reset storage services (used on logout)
 */
export function resetStorageServices() {
    try {
        const { resetFirebaseStorageService } = require('./FirebaseStorageService.js');
        resetFirebaseStorageService();
    } catch (e) {
        // Ignore
    }
}
