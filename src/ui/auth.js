/**
 * Auth UI Components
 * Login and Registration screens
 */

/**
 * Render the login screen
 * @returns {string} HTML string
 */
export function renderLoginScreen() {
    return `
        <div class="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <!-- Logo/Header -->
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                        <i class="fas fa-briefcase text-3xl text-white"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-white mb-2">Job Hunt Tracker</h1>
                    <p class="text-gray-400">Track every opportunity, interaction & milestone</p>
                </div>

                <!-- Login Form Card -->
                <div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 shadow-xl">
                    <h2 class="text-xl font-semibold text-white mb-6 text-center">Sign In</h2>

                    <!-- Error Display -->
                    <div id="authError" class="hidden mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    </div>

                    <!-- Login Form -->
                    <form id="loginForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <div class="relative">
                                <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                <input type="email" id="loginEmail" required
                                    class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="you@example.com">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <div class="relative">
                                <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                <input type="password" id="loginPassword" required minlength="6"
                                    class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="••••••••">
                            </div>
                        </div>

                        <button type="submit" id="loginButton"
                            class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30">
                            <span>Sign In</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>
                </div>

                <!-- Footer -->
                <p class="text-center text-gray-500 text-sm mt-6">
                    Your data is stored securely in the cloud
                </p>
            </div>
        </div>
    `;
}

/**
 * Setup auth form event handlers
 * @param {Object} callbacks
 * @param {Function} callbacks.onLogin
 * @param {Function} callbacks.onRegister
 */
export function setupAuthHandlers(callbacks) {
    // Login form handler only (registration removed for security)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const button = document.getElementById('loginButton');
            const errorDiv = document.getElementById('authError');

            // Show loading state
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            errorDiv.classList.add('hidden');

            const result = await callbacks.onLogin(email, password);

            if (!result.success) {
                errorDiv.textContent = result.error;
                errorDiv.classList.remove('hidden');
                button.disabled = false;
                button.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
            }
        });
    }
}

/**
 * Show auth error message
 * @param {string} message
 */
export function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}
