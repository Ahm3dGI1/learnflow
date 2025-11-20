from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from routes import llm_bp

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(llm_bp)

# Get port from environment or default to 5000
PORT = int(os.getenv('PORT', 5000))

# Health check
@app.route('/')
def health_check():
    return jsonify({'message': 'LearnFlow API is running'})

if __name__ == '__main__':
    print(f"Server running on http://localhost:{PORT}")
    app.run(debug=True, port=PORT)
