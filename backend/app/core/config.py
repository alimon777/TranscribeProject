import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    TRANSCRIPTION_URL: str = os.getenv("TRANSCRIPTION_URL")
    SUBSCRIPTION_KEY: str = os.getenv("SUBSCRIPTION_KEY")
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH")
    BLOB_URL: str = os.getenv("BLOB_URL")
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION")
    
settings = Settings()
