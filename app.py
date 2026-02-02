import os
import secrets
from flask import Flask, render_template, request, session, redirect, url_for, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Initialize Flask App
app = Flask(__name__)
# Generate a random secret key for session management
app.secret_key = secrets.token_hex(16)

# Initialize Firebase Admin
# NOTE: You must place your 'serviceAccountKey.json' in the same directory as this file.
cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin Initialized successfully.")
else:
    print(f"WARNING: '{cred_path}' not found. Firebase functionality will fail until you add it.")
    db = None

def is_user_allowed(email):
    """Check if the email exists in the 'allowed_users' Firestore collection."""
    if not db:
        return False
    
    # Check if a document with this email exists in 'allowed_users' AND has access=True
    # Or just check for existence of the document if that's the rule
    # The prompt says: "Only allow login if the email exists in the database."
    # We'll assume the document ID is the email, or we query for field 'email'.
    # Let's try querying for email field first, and also check if ID is email.
    
    # Option 1: Document ID is email
    doc_ref = db.collection('allowed_users').document(email)
    doc = doc_ref.get()
    if doc.exists:
        return True
    
    # Option 2: Query for email field
    users_ref = db.collection('Users') 
# Note: It must be 'Users' with a Capital U if that is what is in the database
    query = users_ref.where('email', '==', email).stream()
    for _ in query:
        return True
        
    return False

@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    if not db:
        return jsonify({'success': False, 'message': 'Server misconfigured: Missing serviceAccountKey.json'}), 500

    data = request.json
    id_token = data.get('idToken')
    
    if not id_token:
        return jsonify({'success': False, 'message': 'Missing ID token'}), 400

    try:
        # Verify the token with Firebase Admin
        decoded_token = auth.verify_id_token(id_token)
        email = decoded_token.get('email')
        
        if not email:
            return jsonify({'success': False, 'message': 'Invalid token: No email found'}), 400

        # meaningful check against Firestore
        if is_user_allowed(email):
            session['user'] = email
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Access denied: Email not recognized.'}), 403

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'Invalid token or authentication failed.'}), 401

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    # Sample data for the dashboard
    # In a real app, this might come from Firestore too
    pdf_files = [
        {"name": "Anatomy Lecture 1", "link": "https://t.me/MyBot?start=anatomy1"},
        {"name": "Physiology Notes", "link": "https://t.me/MyBot?start=physio_notes"},
        {"name": "Biochemistry Basics", "link": "https://t.me/MyBot?start=biochem_basics"},
    ]
    
    # YouTube Video ID (can be dynamic)
    video_id = "dQw4w9WgXcQ" # Placeholder: Rick Roll (classic placeholder), or user provided.
    # User didn't specify video, so I'll use a generic medical one or placeholder. 
    # Let's use a generic placeholder ID for now.
    
    return render_template('dashboard.html', user_email=session['user'], pdf_files=pdf_files, video_id=video_id)

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
