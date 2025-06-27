from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, backref
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timedelta, timezone # Import timezone
import random
import uuid
import os
from dotenv import load_dotenv

load_dotenv()
Base = declarative_base()

# --- Enums ---
class SessionPurposeEnum:
    GENERAL_WALKTHROUGH = "General Walkthrough/Overview"
    REQUIREMENTS_GATHERING = "Requirements Gathering"
    TECHNICAL_DEEP_DIVE = "Technical Deep Dive"
    MEETING_MINUTES = "Meeting Minutes"
    TRAINING_SESSION = "Training Session"
    PRODUCT_DEMO = "Product Demo"
    @classmethod
    def get_all_values(cls):
        return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

class TranscriptionStatusEnum:
    DRAFT = "Draft"
    INTEGRATED = "Integrated"
    PROCESSING = "Processing"
    # Added ARCHIVED for potential use in random selection for dummy data
    ARCHIVED = "Archived"
    ERROR = "Error"
    @classmethod
    def get_all_values(cls):
        return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

class AnomalyTypeEnum:
    CONTRADICTION = "Contradiction"
    OVERLAP = "Significant Overlap"
    SEMANTIC_DIFFERENCE = "Semantic Difference"
    OUTDATED_INFO = "Outdated Information"
    @classmethod
    def get_all_values(cls):
        return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

class ConflictStatusEnum:
    PENDING = "Pending Review"
    RESOLVED_MERGED = "Resolved (Merged)"
    REJECTED= "Rejected"
    @classmethod
    def get_all_values(cls):
        return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

# --- SQLAlchemy Models ---
class Folder(Base):
    __tablename__ = "folders"
    id = Column(String(255), primary_key=True, index=True, default=lambda: f"folder_{uuid.uuid4().hex[:12]}")
    name = Column(String(255), nullable=False)
    parent_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    count = Column(Integer, nullable=False, default=0) # Counts direct INTEGRATED transcriptions
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
    folder_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True) # Nullable
    folder_path = Column(String(500), nullable=True) # Nullable
    session_title = Column(String(500), nullable=False)
    source_file_name = Column(String(500), nullable=True)
    highlights = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default=TranscriptionStatusEnum.PROCESSING)
    cleaned_transcript_text = Column(Text, nullable=True)
    processing_time_seconds = Column(Integer, nullable=True)
    topic_names_csv = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime, nullable=True)
    integrated_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    folder = relationship("Folder", back_populates="transcriptions")
    quiz = relationship("Quiz", back_populates="transcription", uselist=False, cascade="all, delete-orphan")
    session_detail = relationship("SessionDetail", back_populates="transcription", uselist=False, cascade="all, delete-orphan")

    @hybrid_property
    def folder_name(self) -> str | None:
        if self.folder: return self.folder.name
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
    flagged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    resolution_content = Column(Text, nullable=True)
    new_transcription_obj = relationship("Transcription", foreign_keys=[new_transcription_id])

DATABASE_URL_STR = os.getenv("DATABASE_URL")
if not DATABASE_URL_STR:
    raise ValueError("DATABASE_URL environment variable not set or .env file not found.")

engine = create_engine(DATABASE_URL_STR, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_folder_path(db: Session, folder_id: str, current_path_list: list = None) -> str:
    if current_path_list is None: current_path_list = []
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder: return " / ".join(reversed(current_path_list)) if current_path_list else "Unknown Path"
    current_path_list.insert(0, folder.name)
    if folder.parent_id: return get_folder_path(db, folder.parent_id, current_path_list)
    return " / ".join(current_path_list)

def create_dummy_data(db: Session):
    print("Populating database with dummy data...")
    print("Attempting to clear existing data...")
    try:
        db.query(Conflict).delete()
        db.query(Quiz).delete()
        db.query(SessionDetail).delete()
        db.query(Transcription).delete()
        
        # Iteratively delete leaf folders until all are gone
        while True:
            # Find folders that are not parents to any other folder
            leaf_folder_ids_subquery = db.query(Folder.parent_id).distinct().subquery()
            leaf_folders = db.query(Folder).filter(~Folder.id.in_(leaf_folder_ids_subquery)).all()
            
            # If no folders are left or only root folders (which can't be found by ~Folder.id.in_(subquery) if subquery is empty)
            # handle the case where all folders might be roots.
            if not leaf_folders:
                all_remaining_folders = db.query(Folder).all()
                if not all_remaining_folders: # No folders left
                    break
                else: # Delete remaining (likely root) folders
                    for folder in all_remaining_folders:
                        db.delete(folder)
                    db.commit()
                    break # Exit after deleting remaining root folders

            for folder in leaf_folders:
                db.delete(folder)
            db.commit()
            if not db.query(Folder).count(): # Check if all folders are deleted
                 break
        print("Existing data cleared successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing data: {e}")

    # --- Create Folders ---
    folders_to_create_data = [
        {"name": "Client Projects", "parent_id": None, "id_suffix": "cproj"},
        {"name": "Internal Meetings", "parent_id": None, "id_suffix": "imeet"},
        {"name": "Product Documentation", "parent_id": None, "id_suffix": "pdoc"}
    ]
    created_folder_objects = {} # Store ORM objects

    for f_data in folders_to_create_data:
        folder_id_val = f"folder_{f_data['id_suffix']}_{uuid.uuid4().hex[:6]}"
        folder = Folder(id=folder_id_val, name=f_data['name'], parent_id=f_data['parent_id'], count=0)
        db.add(folder)
        created_folder_objects[f_data['name']] = folder # Store the ORM object
    try:
        db.commit()
        for folder_obj in created_folder_objects.values(): db.refresh(folder_obj)
        print(f"{len(folders_to_create_data)} top-level folders created.")
    except Exception as e:
        db.rollback()
        print(f"Error creating top-level folders: {e}")
        return

    subfolders_data = [
        {"name": "Project Alpha", "parent_name": "Client Projects", "id_suffix": "alpha"},
        {"name": "Project Beta", "parent_name": "Client Projects", "id_suffix": "beta"},
        {"name": "Weekly Syncs", "parent_name": "Internal Meetings", "id_suffix": "wsync"},
        {"name": "API Guides", "parent_name": "Product Documentation", "id_suffix": "apig"},
    ]
    for sf_data in subfolders_data:
        parent_folder_obj = created_folder_objects.get(sf_data["parent_name"])
        if parent_folder_obj:
            folder_id_val = f"folder_{sf_data['id_suffix']}_{uuid.uuid4().hex[:6]}"
            folder = Folder(id=folder_id_val, name=sf_data['name'], parent_id=parent_folder_obj.id, count=0)
            db.add(folder)
            created_folder_objects[sf_data['name']] = folder
    try:
        db.commit()
        for folder_name in [sf["name"] for sf in subfolders_data]:
            if folder_name in created_folder_objects:
                 db.refresh(created_folder_objects[folder_name])
        print("Subfolders created.")
    except Exception as e:
        db.rollback()
        print(f"Error creating subfolders: {e}")
        return
    
    db.expire_all() # Ensure fresh objects are loaded if needed later
    
    # Get all actual string values for enums
    all_session_purpose_values = SessionPurposeEnum.get_all_values()
    all_transcription_status_values = [
        TranscriptionStatusEnum.INTEGRATED, 
        TranscriptionStatusEnum.DRAFT, 
        TranscriptionStatusEnum.PROCESSING
    ] # Focus on these for variety
    all_anomaly_type_values = AnomalyTypeEnum.get_all_values()
    all_conflict_status_values = ConflictStatusEnum.get_all_values()

    # --- Create 5 Transcriptions ---
    transcriptions_to_create = []
    folder_names_for_transcriptions = list(created_folder_objects.keys()) # Use all created folders
    
    # Ensure at least a few are INTEGRATED to test counts
    num_integrated = 0
    max_integrated = 3 # Let's try to make up to 3 integrated

    for i in range(5):
        chosen_folder_name = random.choice(folder_names_for_transcriptions)
        target_folder_obj = created_folder_objects.get(chosen_folder_name)
        
        if not target_folder_obj:
            print(f"Critical error: Folder object for '{chosen_folder_name}' is None. Skipping transcription.")
            continue

        # Determine status: try to make some integrated
        if num_integrated < max_integrated and random.choice([True, True, False]): # Higher chance for integrated initially
            status = TranscriptionStatusEnum.INTEGRATED
            num_integrated += 1
        else:
            status = random.choice([s for s in all_transcription_status_values if s != TranscriptionStatusEnum.INTEGRATED] or [TranscriptionStatusEnum.DRAFT])


        title = f"Sample Session {i+1} ({status}) in {chosen_folder_name}"
        days_ago = random.randint(1, 60)
        topics = random.sample(["Tech", "Business", "Planning", "Review", "Demo", "Internal", "Client"], k=random.randint(2,4))

        transcriptions_to_create.append({
            "folder_obj": target_folder_obj,
            "title": title,
            "status": status,
            "days_ago": days_ago,
            "topics": topics
        })

    folder_direct_integrated_counts = {} # folder_id: count

    for data in transcriptions_to_create:
        target_folder_obj = data["folder_obj"]
        
        upload_time = datetime.now(timezone.utc) - timedelta(days=data["days_ago"])
        process_time = upload_time + timedelta(minutes=random.randint(5, 30))
        integrate_time = process_time + timedelta(hours=random.randint(1,5)) if data["status"] == TranscriptionStatusEnum.INTEGRATED else None
        
        current_folder_id = None
        current_folder_path = None

        if data["status"] == TranscriptionStatusEnum.INTEGRATED:
            current_folder_id = target_folder_obj.id # Assign folder_id only if integrated
            current_folder_path = get_folder_path(db, current_folder_id)
            folder_direct_integrated_counts[current_folder_id] = folder_direct_integrated_counts.get(current_folder_id, 0) + 1
        
        transcription = Transcription(
            folder_id=current_folder_id, # Will be None if not INTEGRATED
            folder_path=current_folder_path, # Will be None if not INTEGRATED
            session_title=data["title"], 
            source_file_name=f"{data['title'].lower().replace(' ', '-').replace('(', '').replace(')', '')}.mp4",
            highlights=f"Key highlights for {data['title']}.", 
            status=data["status"],
            cleaned_transcript_text=f"Transcript for {data['title']}.\nTopics: {', '.join(data['topics'])}.",
            processing_time_seconds=random.randint(60, 300), 
            topic_names_csv=",".join(data["topics"]),
            uploaded_at=upload_time,
            processed_at=process_time if data["status"] != TranscriptionStatusEnum.PROCESSING else None,
            integrated_at=integrate_time, 
            updated_at=integrate_time or process_time or upload_time 
        )
        
        transcription.session_detail = SessionDetail(
            purpose=random.choice(all_session_purpose_values), 
            content=f"Detailed session notes for {data['title']}."
        )
        
        if random.random() < 0.6: # 60% chance of having a quiz
            transcription.quiz = Quiz(quiz_content=f"Quiz for {data['title']}:\nQ1: ...\nQ2: ...")
        
        db.add(transcription)
    
    try:
        db.commit()
        print(f"{len(transcriptions_to_create)} Transcriptions created.")
    except Exception as e:
        db.rollback()
        print(f"Error creating transcriptions: {e}")
        return

    # Update direct counts for folders that received INTEGRATED transcriptions
    print("Updating direct folder counts for INTEGRATED transcriptions...")
    for folder_id_to_update, count_val in folder_direct_integrated_counts.items():
        folder_to_update = db.query(Folder).filter(Folder.id == folder_id_to_update).first()
        if folder_to_update: 
            folder_to_update.count = count_val # Set, not increment, as we calculated fresh
    try:
        db.commit()
        print("Folder counts (direct integrated) updated.")
    except Exception as e:
        db.rollback()
        print(f"Error updating folder counts: {e}")

    # --- Create 0 to 2 Conflicts ---
    db.expire_all()
    # Fetch only INTEGRATED transcriptions that have a folder_id
    candidate_transcriptions_for_conflict = db.query(Transcription)\
        .filter(Transcription.status == TranscriptionStatusEnum.INTEGRATED)\
        .filter(Transcription.folder_id.isnot(None))\
        .limit(5).all() # Limit just in case there are many, we only need a few for conflicts
    
    conflicts_to_add = []
    num_conflicts_to_create = random.randint(0, 2)

    if candidate_transcriptions_for_conflict and num_conflicts_to_create > 0:
        for _ in range(min(num_conflicts_to_create, len(candidate_transcriptions_for_conflict))):
            trans_for_conflict = random.choice(candidate_transcriptions_for_conflict)
            # Ensure we don't pick the same transcription twice for new_transcription_id if creating multiple conflicts
            candidate_transcriptions_for_conflict.remove(trans_for_conflict) 
            
            conflicts_to_add.append(Conflict(
                new_transcription_id=trans_for_conflict.id, 
                existing_transcription_id=f"KB_DOC_OLD_{uuid.uuid4().hex[:4]}", 
                new_content_snippet=f"New content from {trans_for_conflict.session_title[:30]}...", 
                existing_content_snippet="Some old content that creates a conflict.", 
                anomaly_type=random.choice(all_anomaly_type_values), 
                status=random.choice(all_conflict_status_values), # Mix statuses for conflicts
                flagged_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1,10)),
                resolved_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0,2)) if ConflictStatusEnum.PENDING not in ConflictStatusEnum.get_all_values()[-1] else None, # only if not pending
                resolution_content="Resolution notes if applicable." if ConflictStatusEnum.PENDING not in ConflictStatusEnum.get_all_values()[-1] else None
            ))
            if not candidate_transcriptions_for_conflict: break # No more candidates

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
    print(f"Using database: {DATABASE_URL_STR}")
    Base.metadata.create_all(bind=engine) # Ensure tables exist
    
    db_session = SessionLocal()
    try:
        create_dummy_data(db_session)
    except Exception as main_e:
        print(f"A critical error occurred during data population: {main_e}")
        if db_session.is_active: db_session.rollback()
    finally:
        if db_session.is_active: db_session.close()
        print("DB Session closed.")