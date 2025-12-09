/**
 * AuthService - Firebase Authentication Service
 * Handles email/password authentication
 */
import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';

/**
 * @typedef {Object} AuthUser
 * @property {string} uid - User's unique ID
 * @property {string} email - User's email
 */

class AuthService {
    constructor() {
        /** @type {import('firebase/auth').User | null} */
        this.currentUser = null;
        /** @type {Function[]} */
        this.listeners = [];

        // Initialize auth state listener
        firebaseOnAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.notifyListeners(user);
        });
    }

    /**
     * Sign in with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{success: boolean, user?: AuthUser, error?: string}>}
     */
    async signIn(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return {
                success: true,
                user: {
                    uid: result.user.uid,
                    email: result.user.email
                }
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    /**
     * Create new account with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{success: boolean, user?: AuthUser, error?: string}>}
     */
    async signUp(email, password) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return {
                success: true,
                user: {
                    uid: result.user.uid,
                    email: result.user.email
                }
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    /**
     * Sign out current user
     * @returns {Promise<void>}
     */
    async signOut() {
        await firebaseSignOut(auth);
    }

    /**
     * Get current user
     * @returns {AuthUser | null}
     */
    getCurrentUser() {
        if (!this.currentUser) return null;
        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email
        };
    }

    /**
     * Get current user's UID
     * @returns {string | null}
     */
    getUid() {
        return this.currentUser?.uid || null;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Subscribe to auth state changes
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        // Immediately call with current state
        callback(this.getCurrentUser());

        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Wait for auth to be ready (initial load)
     * @returns {Promise<AuthUser | null>}
     */
    waitForAuth() {
        return new Promise((resolve) => {
            const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
                unsubscribe();
                resolve(user ? { uid: user.uid, email: user.email } : null);
            });
        });
    }

    /**
     * Notify all listeners of auth state change
     * @private
     * @param {import('firebase/auth').User | null} user 
     */
    notifyListeners(user) {
        const authUser = user ? { uid: user.uid, email: user.email } : null;
        this.listeners.forEach(callback => {
            try {
                callback(authUser);
            } catch (e) {
                console.error('Auth listener error:', e);
            }
        });
    }

    /**
     * Convert Firebase error codes to user-friendly messages
     * @private
     * @param {string} code 
     * @returns {string}
     */
    getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Email/password sign-in is not enabled',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/too-many-requests': 'Too many attempts. Please try again later'
        };
        return messages[code] || 'An error occurred. Please try again.';
    }
}

// Singleton instance
let authServiceInstance = null;

/**
 * Get or create the AuthService instance
 * @returns {AuthService}
 */
export function getAuthService() {
    if (!authServiceInstance) {
        authServiceInstance = new AuthService();
    }
    return authServiceInstance;
}

export { AuthService };
