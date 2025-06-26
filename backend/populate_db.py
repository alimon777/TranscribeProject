from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, backref
from sqlalchemy.orm import sessionmaker, Session, declarative_base # Import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property # Needed for folder_name
from datetime import datetime, timedelta
import random
import uuid
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Define Base here, as it's needed by the models below ---
Base = declarative_base()

# --- Enums (SessionPurposeEnum, etc.) ---
class SessionPurposeEnum:
    GENERAL_WALKTHROUGH = "General Walkthrough/Overview"
    REQUIREMENTS_GATHERING = "Requirements Gathering"
    TECHNICAL_DEEP_DIVE = "Technical Deep Dive"
    MEETING_MINUTES = "Meeting Minutes"
    TRAINING_SESSION = "Training Session"
    PRODUCT_DEMO = "Product Demo"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]

class TranscriptionStatusEnum:
    DRAFT = "Draft"
    INTEGRATED = "Integrated"
    ARCHIVED = "Archived" # Added for completeness if you use it later
    PROCESSING = "Processing"
    ERROR = "Error"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]

class AnomalyTypeEnum:
    CONTRADICTION = "Contradiction"
    OVERLAP = "Significant Overlap"
    SEMANTIC_DIFFERENCE = "Semantic Difference"
    OUTDATED_INFO = "Outdated Information"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]

class ConflictStatusEnum:
    PENDING = "Pending Review"
    RESOLVED_MERGED = "Resolved (Merged)"
    REJECTED= "Rejected"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]

# --- SQLAlchemy Models ---
class Folder(Base):
    __tablename__ = "folders"
    id = Column(String(255), primary_key=True, index=True, default=lambda: f"folder_{uuid.uuid4().hex[:12]}")
    name = Column(String(255), nullable=False)
    parent_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    children = relationship("Folder", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")
    transcriptions = relationship("Transcription", back_populates="folder", cascade="all, delete-orphan")

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), unique=True, nullable=False)
    quiz_content = Column(Text, nullable=True)
    transcription = relationship("Transcription", back_populates="quiz")

class SessionDetail(Base):
    __tablename__ = "session_details"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), unique=True, nullable=False)
    purpose = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    transcription = relationship("Transcription", back_populates="session_detail")

class Transcription(Base):
    __tablename__ = "transcriptions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    folder_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    folder_path = Column(String(500), nullable=True) 
    session_title = Column(String(500), nullable=False)
    source_file_name = Column(String(500), nullable=True)
    highlights = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default=TranscriptionStatusEnum.PROCESSING)
    cleaned_transcript_text = Column(Text, nullable=True)
    processing_time_seconds = Column(Integer, nullable=True)
    topic_names_csv = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=func.now())
    processed_at = Column(DateTime, nullable=True)
    integrated_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    folder = relationship("Folder", back_populates="transcriptions")
    quiz = relationship("Quiz", back_populates="transcription", uselist=False, cascade="all, delete-orphan")
    session_detail = relationship("SessionDetail", back_populates="transcription", uselist=False, cascade="all, delete-orphan")

    @hybrid_property
    def folder_name(self) -> str | None: # For Pydantic schema
        if self.folder:
            return self.folder.name
        return None

class Conflict(Base):
    __tablename__ = "conflicts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    new_transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False)
    existing_transcription_id = Column(String(255), nullable=False)
    new_content_snippet = Column(Text, nullable=True)
    existing_content_snippet = Column(Text, nullable=True)
    anomaly_type = Column(String(100), nullable=False)
    status = Column(String(100), nullable=False, default=ConflictStatusEnum.PENDING)
    flagged_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    resolution_content = Column(Text, nullable=True)
    new_transcription_obj = relationship("Transcription", foreign_keys=[new_transcription_id])

# --- Database Connection ---
DATABASE_URL_STR = os.getenv("DATABASE_URL")
if not DATABASE_URL_STR:
    raise ValueError("DATABASE_URL environment variable not set or .env file not found.")

engine = create_engine(DATABASE_URL_STR, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Helper function to get folder path ---
def get_folder_path(db: Session, folder_id: str, current_path: list = None) -> str:
    if current_path is None:
        current_path = []
    
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        return "Unknown Path" # Should not happen if data is consistent

    current_path.insert(0, folder.name) # Prepend current folder name

    if folder.parent_id:
        # Avoid infinite loop if 'all' folder is its own parent or similar issues.
        # Assuming 'all' folder has parent_id=None
        if folder.parent_id == folder_all_id and folder_id == folder_all_id: # "all" folder might be its own parent_id based on some logic
             return " / ".join(current_path) # Stop if it's the root 'all' folder
        return get_folder_path(db, folder.parent_id, current_path)
    else:
        # If it's a top-level folder (not 'all') and we want 'All Transcriptions' as the ultimate root in the path
        if folder.id != folder_all_id and "All Transcriptions" not in current_path :
            # Check if "All Transcriptions" is already there due to a different logic path.
            # This is a bit of a heuristic. A more robust way would be to have a clear root folder concept.
            # For now, let's assume if it's not 'all' and parent_id is None, it's directly under the conceptual root.
            # current_path.insert(0, "All Transcriptions") # Optionally prepend the root "All Transcriptions"
            pass


        return " / ".join(current_path)

# Global for folder_all_id to be accessible in get_folder_path
folder_all_id = "all"

def create_dummy_data(db: Session):
    print("Populating database with dummy data...")
    global folder_all_id # Ensure we are using the global variable

    # --- Clean up existing data ---
    print("Attempting to clear existing data...")
    try:
        db.query(Conflict).delete()
        db.query(Quiz).delete()
        db.query(SessionDetail).delete()
        db.query(Transcription).delete()
        # Be careful with folder deletion order if there are FK constraints from children to parent
        # Option 1: Delete children first (complex)
        # Option 2: Set parent_id to NULL for children of folders to be deleted, then delete folders
        # Option 3: For simplicity in dummy data, if cascade isn't perfect, delete specific folders in order or all at once if possible
        # Deleting all folders might fail if there's a specific order required or if 'all' is special
        # Let's try deleting them one by one, children first, or rely on cascade if well-defined.
        # For this script, let's assume cascade works or we delete specific ones if needed.
        # For simplicity, we'll try to delete all and catch errors.
        db.query(Folder).delete()
        db.commit()
        print("Existing data cleared successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing data (might be first run or constraints): {e}")

    # --- Create Folders ---
    # folder_all_id is already global
    folder_all = db.query(Folder).filter(Folder.id == folder_all_id).first()
    if not folder_all:
        folder_all = Folder(id=folder_all_id, name="All Transcriptions", parent_id=None)
        db.add(folder_all)
        try:
            db.commit()
            db.refresh(folder_all)
            print(f"Folder '{folder_all.name}' created/ensured.")
        except Exception as e:
            db.rollback()
            print(f"Error committing '{folder_all.name}' folder: {e}")
            return

    folders_to_create_data = [
        {"name": "Projects", "parent_id": None, "id_suffix": "proj"}, # Top level
        {"name": "Meetings", "parent_id": None, "id_suffix": "meet"}, # Top level
        {"name": "Training Sessions", "parent_id": None, "id_suffix": "train"} # Top level
    ]
    
    created_folder_ids = {} # To store actual IDs for children

    for f_data in folders_to_create_data:
        folder_id = f"folder_{f_data['id_suffix']}_{uuid.uuid4().hex[:6]}"
        created_folder_ids[f_data['name']] = folder_id
        folder = Folder(id=folder_id, name=f_data['name'], parent_id=f_data['parent_id'])
        db.add(folder)

    try:
        db.commit()
        print(f"{len(folders_to_create_data)} top-level folders created.")
    except Exception as e:
        db.rollback()
        print(f"Error creating top-level folders: {e}")
        return
    
    # Refresh to get IDs if needed, or use the generated ones
    for name, fid in created_folder_ids.items():
        folder = db.query(Folder).filter(Folder.id == fid).first()
        if folder:
            db.refresh(folder) # Ensure all attributes are loaded

    # Subfolders
    folder_phoenix_id = f"folder_phoenix_{uuid.uuid4().hex[:6]}"
    folder_crm_id = f"folder_crm_{uuid.uuid4().hex[:6]}"

    if "Projects" in created_folder_ids:
        projects_folder_id = created_folder_ids["Projects"]
        db.add(Folder(id=folder_phoenix_id, name="Project Phoenix", parent_id=projects_folder_id))
        db.add(Folder(id=folder_crm_id, name="CRM Enhancement", parent_id=projects_folder_id))
        try:
            db.commit()
            print("Subfolders for Projects created.")
        except Exception as e:
            db.rollback()
            print(f"Error creating subfolders: {e}")
            return
    else:
        print("Projects folder not found, skipping subfolder creation.")
        return


    # --- Fetch folder objects again after all commits ---
    db.expire_all() # Ensure fresh data is loaded
    folder_phoenix_db = db.query(Folder).filter(Folder.id == folder_phoenix_id).first()
    folder_crm_db = db.query(Folder).filter(Folder.id == folder_crm_id).first()
    folder_meetings_db = db.query(Folder).filter(Folder.id == created_folder_ids.get("Meetings")).first()
    folder_training_db = db.query(Folder).filter(Folder.id == created_folder_ids.get("Training Sessions")).first()
    folder_projects_db = db.query(Folder).filter(Folder.id == created_folder_ids.get("Projects")).first()

    if not all([folder_phoenix_db, folder_crm_db, folder_meetings_db, folder_training_db, folder_projects_db]):
        print("One or more necessary folders not found after creation. Aborting transcription population.")
        # Print which ones are missing
        if not folder_phoenix_db: print("Missing: folder_phoenix_db")
        if not folder_crm_db: print("Missing: folder_crm_db")
        if not folder_meetings_db: print("Missing: folder_meetings_db")
        if not folder_training_db: print("Missing: folder_training_db")
        if not folder_projects_db: print("Missing: folder_projects_db")
        return

    # --- Create Transcriptions ---
    transcriptions_data = [
        # ... (Your existing transcriptions_data, ensure 'folder_obj' key is added)
        {
            "folder_obj": folder_phoenix_db, # Pass the ORM object
            "session_title": "Q3 Project Phoenix Planning",
            "source_file_name": "phoenix-planning-q3.mp4",
            "highlights": "Key Milestones: API v1 release by July, User testing in August. Resource Allocation: Need 2 more backend devs. Dependencies: Marketing team for launch assets.",
            "session_purpose_enum": SessionPurposeEnum.REQUIREMENTS_GATHERING,
            "status_enum": TranscriptionStatusEnum.INTEGRATED,
            "cleaned_transcript_text": "### Q3 Project Phoenix Planning Session\n...",
            "quiz_text": "### Quiz: What are the key phases discussed for Project Phoenix Q3?",
            "topic_names": ["Project Management", "Phoenix", "Q3 Planning", "API Integration", "Resource Allocation"],
            "processing_time": 154, "days_ago": 5
        },
        {
            "folder_obj": folder_crm_db,
            "session_title": "API Design Walkthrough v2",
            "source_file_name": "api-design-v2.wav",
            "highlights": "Endpoints updated: /users, /orders. Auth: OAuth 2.0. Data validation: Pydantic models. Rate limiting: 100 req/min.",
            "session_purpose_enum": SessionPurposeEnum.TECHNICAL_DEEP_DIVE,
            "status_enum": TranscriptionStatusEnum.DRAFT, # Drafts might not have a folder_path yet, or a temporary one
            "cleaned_transcript_text": "### API Design Walkthrough v2\n...",
            "quiz_text": None, 
            "topic_names": ["API Design", "CRM", "Development", "Security", "OAuth"],
            "processing_time": 95, "days_ago": 6
        },
        {
            "folder_obj": folder_meetings_db,
            "session_title": f"Weekly Team Standup - Jan {datetime.utcnow().year}",
            "source_file_name": "standup-current.m4a",
            "highlights": "Alice: Feature X complete. Bob: UI component delayed, needs design input. Charlie: Investigating bug #123.",
            "session_purpose_enum": SessionPurposeEnum.MEETING_MINUTES,
            "status_enum": TranscriptionStatusEnum.INTEGRATED,
            "cleaned_transcript_text": "### Weekly Standup\n...",
            "quiz_text": None,
            "topic_names": ["Standup", "Team Sync", "Progress Update", "Blockers"],
            "processing_time": 60, "days_ago": 7
        },
        {
            "folder_obj": folder_training_db,
            "session_title": "New Employee Onboarding - Session 1",
            "source_file_name": "onboarding-session1.mp4",
            "highlights": "Company Values: Innovation, Collaboration. Tools: Slack, Jira, Confluence. HR Policies: PTO, WFH. First Project: Shadow Alice on Feature Y.",
            "session_purpose_enum": SessionPurposeEnum.TRAINING_SESSION,
            "status_enum": TranscriptionStatusEnum.INTEGRATED,
            "cleaned_transcript_text": "### Onboarding Session\n...",
            "quiz_text": "### Onboarding Quiz\n\n1. Where can you find information about company benefits?\n2. What is the primary communication tool for the team?",
            "topic_names": ["Onboarding", "HR", "Company Policy", "Training", "Jira", "Slack"],
            "processing_time": 180, "days_ago": 8
        },
        {
            "folder_obj": folder_projects_db, # This is a top-level "Projects" folder
            "session_title": "Cross-Project Sync on Microservices",
            "source_file_name": "microservice-sync.mp3",
            "highlights": "Service Discovery: Consul vs. Eureka. Communication: gRPC preferred. API Gateway: Kong. Standardization efforts ongoing.",
            "session_purpose_enum": SessionPurposeEnum.TECHNICAL_DEEP_DIVE,
            "status_enum": TranscriptionStatusEnum.PROCESSING, # Processing items might not have a final folder_path
            "cleaned_transcript_text": "Discussion on standardizing microservice architecture...",
            "quiz_text": None,
            "topic_names": ["Microservices", "Architecture", "Cross-Project", "gRPC", "Consul"],
            "processing_time": 120, "days_ago": 2
        },
    ]

    created_transcriptions_orm = []
    for data in transcriptions_data:
        upload_time = datetime.utcnow() - timedelta(days=data["days_ago"])
        process_time = upload_time + timedelta(minutes=random.randint(5, 30))
        integrate_time = process_time + timedelta(hours=random.randint(1,5)) if data["status_enum"] == TranscriptionStatusEnum.INTEGRATED else None
        
        current_folder_path = None
        if data["folder_obj"] and data["status_enum"] == TranscriptionStatusEnum.INTEGRATED: # Only set path for integrated items with a folder
            current_folder_path = get_folder_path(db, data["folder_obj"].id)
        elif data["folder_obj"] and data["status_enum"] == TranscriptionStatusEnum.DRAFT : # Drafts might be in a folder but not yet "integrated" with a final path
            current_folder_path = get_folder_path(db, data["folder_obj"].id) # Or set to "Drafts" or None
            # Or perhaps Drafts don't have a folder_path until integrated. Let's make it nullable and set if folder is present.

        transcription = Transcription(
            folder_id=data["folder_obj"].id if data["folder_obj"] else None,
            folder_path=current_folder_path, # Set the constructed path
            session_title=data["session_title"],
            source_file_name=data["source_file_name"],
            highlights=data.get("highlights"),
            status=data["status_enum"],
            cleaned_transcript_text=data["cleaned_transcript_text"],
            processing_time_seconds=data["processing_time"],
            topic_names_csv=",".join(data["topic_names"]),
            uploaded_at=upload_time,
            processed_at=process_time if data["status_enum"] != TranscriptionStatusEnum.PROCESSING else None,
            integrated_at=integrate_time,
            updated_at=integrate_time or process_time or upload_time
        )
        session_detail = SessionDetail(
            purpose=data["session_purpose_enum"],
            content=f"Detailed notes for session: {data['session_title']} focusing on {data['session_purpose_enum']}."
        )
        transcription.session_detail = session_detail
        if data["quiz_text"]:
            quiz = Quiz(quiz_content=data["quiz_text"])
            transcription.quiz = quiz
        
        db.add(transcription)
        created_transcriptions_orm.append(transcription)
    
    try:
        db.commit()
        print(f"{len(created_transcriptions_orm)} Transcriptions created.")
    except Exception as e:
        db.rollback()
        print(f"Error creating transcriptions: {e}")
        return

    # --- Create Conflicts ---
    db.expire_all()
    # Fetch transcriptions again if needed for conflicts
    new_trans_for_conflict_1 = db.query(Transcription).filter(Transcription.session_title == "Q3 Project Phoenix Planning").first()
    # ... (rest of your conflict creation logic) ...
    # Ensure conflict data uses existing transcriptions
    
    # --- Create Conflicts (Copied from your script, ensure transcription objects exist) ---
    # Refresh transcription objects if their IDs are used for conflicts.
    # It's better to use the ORM objects if they are still in scope and valid.

    # Example:
    # trans_phoenix_planning = next((t for t in created_transcriptions_orm if t.session_title == "Q3 Project Phoenix Planning"), None)

    # Use the fetched objects from DB as they are more reliable after commit
    conf_trans_1 = db.query(Transcription).filter(Transcription.session_title == "Q3 Project Phoenix Planning").first()
    conf_trans_2 = db.query(Transcription).filter(Transcription.session_title == "API Design Walkthrough v2").first()
    conf_trans_3 = db.query(Transcription).filter(Transcription.session_title == "New Employee Onboarding - Session 1").first()

    conflicts_to_add = []
    if conf_trans_1:
        conflicts_to_add.append(Conflict(
            new_transcription_id=conf_trans_1.id,
            existing_transcription_id="KB_DOC_CRM_STRATEGY_V2",
            new_content_snippet="AWS should be prioritized for Phoenix infrastructure...",
            existing_content_snippet="Microsoft Azure is preferred for all new projects...",
            anomaly_type=AnomalyTypeEnum.CONTRADICTION,
            status=ConflictStatusEnum.PENDING,
            flagged_at=datetime.utcnow() - timedelta(days=4)
        ))
    if conf_trans_2:
        conflicts_to_add.append(Conflict(
            new_transcription_id=conf_trans_2.id,
            existing_transcription_id="KB_DOC_PROJECT_MGMT_BP",
            new_content_snippet="Requirements gathering needs extensive direct user interviews...",
            existing_content_snippet="Stakeholder interviews and workshops are the primary methods...",
            anomaly_type=AnomalyTypeEnum.SEMANTIC_DIFFERENCE,
            status=ConflictStatusEnum.PENDING,
            flagged_at=datetime.utcnow() - timedelta(days=5)
        ))
    if conf_trans_3: # This was 'archived_trans_for_conflict'
        conflicts_to_add.append(Conflict(
            new_transcription_id=conf_trans_3.id,
            existing_transcription_id="KB_DOC_DATA_PRIVACY_GUIDE_V1",
            new_content_snippet="GDPR requires explicit consent for data collection...",
            existing_content_snippet="Data minimization should be followed according to GDPR...",
            anomaly_type=AnomalyTypeEnum.OVERLAP,
            status=ConflictStatusEnum.RESOLVED_MERGED,
            flagged_at=datetime.utcnow() - timedelta(days=10),
            resolved_at=datetime.utcnow() - timedelta(days=3),
            resolution_content="Merged new GDPR consent details into existing guide."
        ))

    if conflicts_to_add:
        db.add_all(conflicts_to_add)
        try:
            db.commit()
            print(f"{len(conflicts_to_add)} Conflicts created.")
        except Exception as e:
            db.rollback()
            print(f"Error creating conflicts: {e}")

    print("Database population complete.")

if __name__ == "__main__":
    print(f"Attempting to connect to database: {os.getenv('DATABASE_URL')}")
    Base.metadata.create_all(bind=engine)
    
    db_session = SessionLocal()
    try:
        create_dummy_data(db_session)
    except Exception as main_e:
        print(f"A critical error occurred during data population: {main_e}")
        if db_session.is_active:
            db_session.rollback()
    finally:
        if db_session.is_active:
            db_session.close()
        print("DB Session closed.")