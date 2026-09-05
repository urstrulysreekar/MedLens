# api/index.py
import sys
import os

# Ensure Python can find modules inside the backend/ folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from backend.main import app