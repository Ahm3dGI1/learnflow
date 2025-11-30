"""
Initialize Firebase Admin SDK and provide token verification utilities.

This module supports initialization using either a local file path or
a JSON string for the Firebase service account. It exposes a `verify_id_token`
helper that wraps `firebase_admin.auth.verify_id_token`.

Environment variables:
- FIREBASE_SERVICE_ACCOUNT_FILE: path to a credentials JSON file
- FIREBASE_SERVICE_ACCOUNT_JSON: JSON string containing the service account
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, auth

def _initialize_app():
    """
    Initialize or return the existing Firebase Admin app instance.

    Returns:
        firebase_admin.App: initialized Firebase app instance.

    Raises:
        RuntimeError: When no service account information is provided via
            FIREBASE_SERVICE_ACCOUNT_FILE or FIREBASE_SERVICE_ACCOUNT_JSON.
    """
    # If app is already initialized, simply return it
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred_file = os.getenv('FIREBASE_SERVICE_ACCOUNT_FILE')
    cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')

    if cred_file:
        # Resolve path relative to project root if needed
        # Handle both absolute paths and paths relative to project root
        if not os.path.isabs(cred_file):
            # Get the directory containing this file (server/)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up one level to project root
            project_root = os.path.dirname(current_dir)
            # Resolve the credential file path
            cred_file = os.path.join(project_root, cred_file)

        if os.path.exists(cred_file):
            cred = credentials.Certificate(cred_file)
        else:
            raise RuntimeError(
                f"Firebase service account file not found at: {cred_file}"
            )
    elif cred_json:
        cred_dict = json.loads(cred_json)
        cred = credentials.Certificate(cred_dict)
    else:
        raise RuntimeError(
            "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_FILE or FIREBASE_SERVICE_ACCOUNT_JSON in environment"
        )

    return firebase_admin.initialize_app(cred)


def verify_id_token(id_token: str):
    """
    Verify a Firebase ID token and return the decoded token claims.

    This calls Firebase Admin SDK's `auth.verify_id_token` and returns the
    decoded claims (a dictionary) if verification succeeds.

    Args:
        id_token (str): Firebase ID token as a string.

    Returns:
        dict: Decoded token claims (e.g., uid, email, name, custom claims).

    Raises:
        ValueError: If id_token is falsy.
        firebase_admin.exceptions.FirebaseError: For token verification errors
            raised by the Firebase Admin SDK (invalid token, expired).
    """
    if not id_token:
        raise ValueError("id_token must be provided")

    _initialize_app()
    return auth.verify_id_token(id_token)