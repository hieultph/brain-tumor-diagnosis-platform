# Database Backup Script

This script creates Excel backups of the Models and Contributions tables from the Supabase database.

## Features

- Creates timestamped backup directories
- Backs up Models table to Excel
- Creates separate backup for experimental models
- Backs up Contributions table with related model and user information
- Includes logging for tracking backup operations

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. The script uses the following database connection parameters:
- Database: postgres
- Host: db.pyixjrtxuxapgejfcprr.supabase.co
- Port: 5432
- User: postgres
- Password: Brain123

## Usage

### Manual Run

Run the script:
```bash
python backup_database.py
```

The script will:
1. Create a new backup directory with timestamp
2. Create Excel files for:
   - All models (models_backup.xlsx)
   - Experimental models (experimental_models_backup.xlsx)
   - All contributions (contributions_backup.xlsx)
3. Log all operations to backup.log

### Automatic Nightly Backups

#### Windows Setup (Task Scheduler)

1. Open Task Scheduler:
   - Press `Windows + R`
   - Type `taskschd.msc` and press Enter

2. Create a new task:
   - Click "Create Basic Task" in the right panel
   - Name: "Database Backup"
   - Description: "Nightly backup of database tables"

3. Set the trigger:
   - Choose "Daily"
   - Set start time to when you want the backup to run (e.g., 2:00 AM)
   - Check "Repeat task every: 1 day"

4. Set the action:
   - Action: "Start a program"
   - Program/script: Browse to your `run_backup_windows.bat` file
   - Start in: Leave empty

5. Additional settings:
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"

#### Ubuntu Setup (Cron)

1. Make the shell script executable:
```bash
chmod +x /path/to/run_backup_ubuntu.sh
```

2. Open the crontab editor:
```bash
crontab -e
```

3. Add the following line to run the backup at 2 AM every day:
```bash
0 2 * * * /path/to/run_backup_ubuntu.sh >> /path/to/backup.log 2>&1
```

## Output

The script creates a directory structure like this:
```
backups/
  └── backup_YYYYMMDD_HHMMSS/
      ├── models_backup.xlsx
      ├── experimental_models_backup.xlsx
      └── contributions_backup.xlsx
```

## Logging

The script logs all operations to both:
- Console output
- backup.log file

Check the log file for detailed information about the backup process and any errors that may occur. 