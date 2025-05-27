import os
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backup.log'),
        logging.StreamHandler()
    ]
)

# Database connection parameters
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "Brain123"
DB_HOST = "db.pyixjrtxuxapgejfcprr.supabase.co"
DB_PORT = "5432"

# Create database connection URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def create_backup_directory():
    """Create a backup directory with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"backups/backup_{timestamp}"
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def backup_models(engine, backup_dir):
    """Backup Models table to Excel"""
    try:
        # Query to fetch all models
        query = """
        SELECT 
            model_id,
            model_name,
            model_description,
            version,
            published_date,
            created_date,
            status,
            weights,
            metrics
        FROM Models
        """
        
        # Read data into pandas DataFrame
        df = pd.read_sql(query, engine)
        
        # Convert JSONB columns to string for Excel
        df['weights'] = df['weights'].apply(lambda x: str(x))
        df['metrics'] = df['metrics'].apply(lambda x: str(x))
        
        # Save to Excel
        excel_path = os.path.join(backup_dir, "models_backup.xlsx")
        df.to_excel(excel_path, index=False)
        logging.info(f"Models backup created at: {excel_path}")
        
        # Create separate backup for experimental models
        experimental_models = df[df['status'] == 'experimental']
        exp_excel_path = os.path.join(backup_dir, "experimental_models_backup.xlsx")
        experimental_models.to_excel(exp_excel_path, index=False)
        logging.info(f"Experimental models backup created at: {exp_excel_path}")
        
    except Exception as e:
        logging.error(f"Error backing up Models table: {str(e)}")
        raise

def backup_contributions(engine, backup_dir):
    """Backup Contributions table to Excel"""
    try:
        # Query to fetch all contributions
        query = """
        SELECT 
            c.contribution_id,
            c.researcher_id,
            c.model_id,
            c.upload_date,
            c.weights,
            c.status,
            c.points_earned,
            m.model_name,
            u.username as researcher_name
        FROM Contributions c
        LEFT JOIN Models m ON c.model_id = m.model_id
        LEFT JOIN Users u ON c.researcher_id = u.user_id
        """
        
        # Read data into pandas DataFrame
        df = pd.read_sql(query, engine)
        
        # Convert JSONB column to string for Excel
        df['weights'] = df['weights'].apply(lambda x: str(x))
        
        # Save to Excel
        excel_path = os.path.join(backup_dir, "contributions_backup.xlsx")
        df.to_excel(excel_path, index=False)
        logging.info(f"Contributions backup created at: {excel_path}")
        
    except Exception as e:
        logging.error(f"Error backing up Contributions table: {str(e)}")
        raise

def main():
    try:
        # Create backup directory
        backup_dir = create_backup_directory()
        logging.info(f"Created backup directory: {backup_dir}")
        
        # Create database engine
        engine = create_engine(DATABASE_URL)
        logging.info("Connected to database successfully")
        
        # Perform backups
        backup_models(engine, backup_dir)
        backup_contributions(engine, backup_dir)
        
        logging.info("Backup completed successfully")
        
    except Exception as e:
        logging.error(f"Backup failed: {str(e)}")
        raise

if __name__ == "__main__":
    main() 