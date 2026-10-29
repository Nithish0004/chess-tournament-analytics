import os
from pathlib import Path
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Load settings from server/.env
ENV_PATH = Path(__file__).resolve().parent.parent / 'server' / '.env'
load_dotenv(dotenv_path=ENV_PATH)

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'chess_db')


def get_connection(autocommit=True):
    """Returns a PyMySQL database connection."""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=autocommit
    )
