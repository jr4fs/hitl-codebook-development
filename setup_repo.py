import os
import subprocess
import sys
import shutil

# Configuration
REQUIREMENTS_PATH = os.path.join("pybackend", "requirements.txt")
VENV_DIR_NAMES = ["cais", "venv"]
SEARCH_PATHS = ["pybackend", "."]

def get_venv_path():
    """Finds an existing venv or returns the default path to create one."""
    for path in SEARCH_PATHS:
        for venv_name in VENV_DIR_NAMES:
            full_path = os.path.join(path, venv_name)
            if os.path.exists(os.path.join(full_path, "pyvenv.cfg")):
                return full_path
    
    # Default to creating in pybackend/venv if none found
    return os.path.join("pybackend", "venv")

def get_venv_python(venv_path):
    """Returns the path to the python executable within the venv."""
    if sys.platform == "win32":
        return os.path.join(venv_path, "Scripts", "python.exe")
    return os.path.join(venv_path, "bin", "python")

def create_venv(venv_path):
    """Creates a virtual environment."""
    print(f"Creating virtual environment at {venv_path}...")
    try:
        subprocess.check_call([sys.executable, "-m", "venv", venv_path])
        return True
    except subprocess.CalledProcessError:
        print("Error: Failed to create virtual environment.")
        return False

def install_dependencies(python_path):
    """Installs dependencies using the venv's pip."""
    if not os.path.exists(REQUIREMENTS_PATH):
        print(f"Error: {REQUIREMENTS_PATH} not found.")
        return False
    
    print(f"Installing dependencies from {REQUIREMENTS_PATH}...")
    try:
        subprocess.check_call([python_path, "-m", "pip", "install", "-r", REQUIREMENTS_PATH])
        print("Dependencies installed successfully.")
        return True
    except subprocess.CalledProcessError:
        print("Error: Failed to install dependencies.")
        return False

def setup_directories():
    """Creates necessary directories if they don't exist."""
    dirs_to_create = ["shared_uploads", "val_datasets", "rest_datasets"]
    
    for directory in dirs_to_create:
        if not os.path.exists(directory):
            try:
                os.makedirs(directory)
                print(f"Created directory: {directory}")
            except OSError as e:
                print(f"Error creating directory {directory}: {e}")
        else:
            print(f"Directory already exists: {directory}")

def setup_database():
    """Connects to MongoDB and sets up collections/indexes."""
    try:
        import pymongo
        from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
    except ImportError:
        print("Error: pymongo is not installed.")
        return
    
    print("Connecting to MongoDB at mongodb://localhost:27017...")
    
    try:
        client = pymongo.MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
        # Check connection
        client.admin.command('ping')
        print("Connected to MongoDB.")
        
        db = client["annotationTool"]
        
        # UserDetails
        user_collection = db["UserDetails"]
        # Create unique index on email
        user_collection.create_index("email", unique=True)
        print("Ensured 'UserDetails' collection exists with unique index on 'email'.")
        
        # TaskDetails
        task_collection = db["TaskDetails"]
        print("Ensured 'TaskDetails' collection reference is ready.")
        
        print("Database setup complete.")
        
        client.close()
        
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        print(f"Error connecting to MongoDB: {e}")
        print("Please ensure MongoDB is running locally on port 27017.")

def check_env_file():
    """Checks if backend/.env exists."""
    env_path = os.path.join("backend", ".env")
    if os.path.exists(env_path):
        print(f"Found existing environment file: {env_path}")
    else:
        print(f"Warning: {env_path} not found. You may need to configure environment variables for the backend.")

def is_running_in_venv():
    """Checks if the script is running inside a virtual environment."""
    return sys.prefix != sys.base_prefix

def main():
    # Ensure we are at project root
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    print("Starting repository setup...")

    if is_running_in_venv():
        print(f"Running inside virtual environment: {sys.prefix}")
        try:
            import pymongo
        except ImportError:
            print("Dependencies missing in checking venv. Installing...")
            if not install_dependencies(sys.executable):
                 sys.exit(1)

        setup_directories()
        setup_database()
        check_env_file()
        print("\nSetup finished successfully!")
        
    else:
        # Not in venv. Find or create one, install deps, and re-exec.
        venv_path = get_venv_path()
        venv_python = get_venv_python(venv_path)
        
        if not os.path.exists(venv_python):
            # If default venv path, create it
            if not create_venv(venv_path):
                sys.exit(1)
        
        # Install dependencies using the venv python
        if not install_dependencies(venv_python):
             sys.exit(1)
             
        print(f"Re-launching script within virtual environment: {venv_path}")
        # Re-exec check
        try:
            subprocess.check_call([venv_python, __file__] + sys.argv[1:])
        except subprocess.CalledProcessError as e:
            sys.exit(e.returncode)

if __name__ == "__main__":
    main()
