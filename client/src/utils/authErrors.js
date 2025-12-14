/**
 * Maps Firebase authentication error codes to user-friendly messages.
 * 
 * @param {string} code - The error code returned by Firebase
 * @returns {string} A user-friendly error message
 */
export function mapAuthError(code) {
    switch (code) {
        // Login specific
        case 'auth/invalid-credential':
            return "Invalid email or password. Please try again.";
        case 'auth/user-not-found':
            return "No account found with this email.";
        case 'auth/wrong-password':
            return "Incorrect password.";

        // Signup specific
        case 'auth/weak-password':
            return "Password should be at least 6 characters.";

        // Common
        case 'auth/email-already-in-use':
            return "This email is already registered. Please log in instead.";
        case 'auth/invalid-email':
            return "Please enter a valid email address.";
        case 'auth/network-request-failed':
            return "Network error. Please check your internet connection.";
        case 'auth/user-disabled':
            return "This account has been disabled. Please contact support.";
        case 'auth/too-many-requests':
            return "Too many failed attempts. Please wait 15 minutes before trying again.";

        // Google OAuth
        case 'auth/popup-blocked':
            return "Popup blocked by browser. Please allow popups for this site.";
        case 'auth/popup-closed-by-user':
            return "Sign-in cancelled. The popup was closed.";
        case 'auth/cancelled-popup-request':
            return "Operation cancelled. Another popup request is active.";

        default:
            return "Authentication failed. Please check your information and try again.";
    }
}
