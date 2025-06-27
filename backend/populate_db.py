from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, backref
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timedelta, timezone
import random
import uuid
import os
from dotenv import load_dotenv

load_dotenv()
Base = declarative_base()

# --- Enums ---
class SessionPurposeEnum:
    GENERAL_WALKTHROUGH = "General Walkthrough/Overview"; REQUIREMENTS_GATHERING = "Requirements Gathering"; TECHNICAL_DEEP_DIVE = "Technical Deep Dive"; MEETING_MINUTES = "Meeting Minutes"; TRAINING_SESSION = "Training Session"; PRODUCT_DEMO = "Product Demo"
    @classmethod
    def get_all_values(cls): return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

class TranscriptionStatusEnum:
    DRAFT = "Draft"; INTEGRATED = "Integrated"; PROCESSING = "Processing"; ARCHIVED = "Archived"; ERROR = "Error"
    @classmethod
    def get_all_values(cls): return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

class AnomalyTypeEnum:
    CONTRADICTION = "Contradiction"; OVERLAP = "Significant Overlap"; SEMANTIC_DIFFERENCE = "Semantic Difference"; OUTDATED_INFO = "Outdated Information"
    @classmethod
    def get_all_values(cls): return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

class ConflictStatusEnum:
    PENDING = "Pending Review"; RESOLVED_MERGED = "Resolved (Merged)"; REJECTED= "Rejected"
    @classmethod
    def get_all_values(cls): return [getattr(cls, attr) for attr in dir(cls) if isinstance(getattr(cls, attr), str) and not attr.startswith("__")]

# --- SQLAlchemy Models ---
class Folder(Base):
    __tablename__ = "folders"; id = Column(String(255), primary_key=True, index=True, default=lambda: f"folder_{uuid.uuid4().hex[:12]}"); name = Column(String(255), nullable=False); parent_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True); path = Column(String(1024), nullable=True); created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc)); updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)); count = Column(Integer, nullable=False, default=0); children = relationship("Folder", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan"); transcriptions = relationship("Transcription", back_populates="folder", cascade="all, delete-orphan")
class Quiz(Base):
    __tablename__ = "quizzes"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), unique=True, nullable=False); quiz_content = Column(Text, nullable=True); transcription = relationship("Transcription", back_populates="quiz")
class SessionDetail(Base):
    __tablename__ = "session_details"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), unique=True, nullable=False); purpose = Column(String(255), nullable=True); content = Column(Text, nullable=True); transcription = relationship("Transcription", back_populates="session_detail")
class Transcription(Base):
    __tablename__ = "transcriptions"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); folder_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True); session_title = Column(String(500), nullable=False); source_file_name = Column(String(500), nullable=True); highlights = Column(Text, nullable=True); status = Column(String(50), nullable=False, default=TranscriptionStatusEnum.PROCESSING); cleaned_transcript_text = Column(Text, nullable=True); processing_time_seconds = Column(Integer, nullable=True); topic_names_csv = Column(Text, nullable=True); uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc)); processed_at = Column(DateTime, nullable=True); integrated_at = Column(DateTime, nullable=True); updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)); folder = relationship("Folder", back_populates="transcriptions"); quiz = relationship("Quiz", back_populates="transcription", uselist=False, cascade="all, delete-orphan"); session_detail = relationship("SessionDetail", back_populates="transcription", uselist=False, cascade="all, delete-orphan")
    @hybrid_property
    def folder_name(self) -> str | None:
        if self.folder: return self.folder.name
        return None
class Conflict(Base):
    __tablename__ = "conflicts"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); new_transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False); existing_transcription_id = Column(String(255), nullable=False); new_content_snippet = Column(Text, nullable=True); existing_content_snippet = Column(Text, nullable=True); anomaly_type = Column(String(100), nullable=False); status = Column(String(100), nullable=False, default=ConflictStatusEnum.PENDING); flagged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc)); resolved_at = Column(DateTime, nullable=True); resolution_content = Column(Text, nullable=True); new_transcription_obj = relationship("Transcription", foreign_keys=[new_transcription_id])

DATABASE_URL_STR = os.getenv("DATABASE_URL")
if not DATABASE_URL_STR: raise ValueError("DATABASE_URL environment variable not set.")
engine = create_engine(DATABASE_URL_STR, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_conflict_content(anomaly_type: str, new_title: str, existing_title: str) -> dict:
    """Generates realistic content snippets and resolutions based on the anomaly type."""
    content_map = {
        AnomalyTypeEnum.CONTRADICTION: {
            "new": f"From '{new_title}': The final deployment date is set for Friday.",
            "existing": f"From '{existing_title}': All sources indicate the deployment is scheduled for Tuesday.",
            "merged": "Confirmed with the product team. The correct deployment date is Friday. The old documentation was outdated.",
            "rejected": "The information from the new transcription was a misstatement. The correct date remains Tuesday."
        },
        AnomalyTypeEnum.OVERLAP: {
            "new": f"As discussed in '{new_title}', user authentication will be handled by the Auth0 service.",
            "existing": f"The document '{existing_title}' states that the Auth0 service is responsible for user authentication.",
            "merged": "Consolidated the information. The point that Auth0 handles authentication is now in a single, authoritative document.",
            "rejected": "The new entry is a complete duplicate. Rejecting to avoid redundancy."
        },
        AnomalyTypeEnum.OUTDATED_INFO: {
            "new": f"In '{new_title}', it was mentioned that the new project manager is Jane Smith.",
            "existing": f"The '{existing_title}' document lists the project manager as John Doe.",
            "merged": "Updated the knowledge base. The current project manager is confirmed to be Jane Smith.",
            "rejected": "The new transcription was from an old meeting. John Doe is still the correct contact."
        },
        AnomalyTypeEnum.SEMANTIC_DIFFERENCE: {
            "new": f"The session '{new_title}' specified that the API cache has a TTL of 3600 seconds.",
            "existing": f"According to '{existing_title}', the API cache expires after one hour.",
            "merged": "Clarified the documentation to consistently use '1 hour (3600 seconds)' to avoid confusion.",
            "rejected": "The existing phrasing 'one hour' is preferred for user-facing documentation. Rejecting the more technical phrasing."
        }
    }
    return content_map.get(anomaly_type, content_map[AnomalyTypeEnum.OVERLAP])

def create_dummy_data(db: Session):
    print("Populating database with dummy data...")

    # 1. Clear existing data in the correct order
    try:
        db.query(Conflict).delete(); db.query(Quiz).delete(); db.query(SessionDetail).delete(); db.query(Transcription).delete()
        while True:
            leaf_folder_ids_subquery = db.query(Folder.parent_id).distinct().subquery()
            leaf_folders = db.query(Folder).filter(~Folder.id.in_(leaf_folder_ids_subquery)).all()
            if not leaf_folders:
                all_remaining_folders = db.query(Folder).all()
                if not all_remaining_folders: break
                for folder in all_remaining_folders: db.delete(folder)
                db.commit(); break
            for folder in leaf_folders: db.delete(folder)
            db.commit()
            if not db.query(Folder).count(): break
        print("Existing data cleared successfully.")
    except Exception as e: db.rollback(); print(f"Error clearing data: {e}")

    # 2. Create Folders
    folders_to_create_data = [{"name": "Client Projects", "parent_id": None, "id_suffix": "cproj"}, {"name": "Internal Meetings", "parent_id": None, "id_suffix": "imeet"}, {"name": "Product Documentation", "parent_id": None, "id_suffix": "pdoc"}]
    created_folder_objects = {}
    for f_data in folders_to_create_data:
        folder_id_val = f"folder_{f_data['id_suffix']}_{uuid.uuid4().hex[:6]}"
        folder = Folder(id=folder_id_val, name=f_data['name'], parent_id=f_data['parent_id'], path=f_data['name'], count=0)
        db.add(folder); created_folder_objects[f_data['name']] = folder
    try: db.commit(); [db.refresh(f) for f in created_folder_objects.values()]; print(f"{len(folders_to_create_data)} top-level folders created.")
    except Exception as e: db.rollback(); print(f"Error creating top-level folders: {e}"); return
    subfolders_data = [{"name": "Project Alpha", "parent_name": "Client Projects", "id_suffix": "alpha"}, {"name": "Project Beta", "parent_name": "Client Projects", "id_suffix": "beta"}, {"name": "Weekly Syncs", "parent_name": "Internal Meetings", "id_suffix": "wsync"}, {"name": "API Guides", "parent_name": "Product Documentation", "id_suffix": "apig"}]
    for sf_data in subfolders_data:
        parent_folder_obj = created_folder_objects.get(sf_data["parent_name"])
        if parent_folder_obj:
            folder_id_val = f"folder_{sf_data['id_suffix']}_{uuid.uuid4().hex[:6]}"; new_path = f"{parent_folder_obj.path} / {sf_data['name']}"
            folder = Folder(id=folder_id_val, name=sf_data['name'], parent_id=parent_folder_obj.id, path=new_path, count=0)
            db.add(folder); created_folder_objects[sf_data['name']] = folder
    try: db.commit(); [db.refresh(created_folder_objects[sf["name"]]) for sf in subfolders_data if sf["name"] in created_folder_objects]; print("Subfolders created.")
    except Exception as e: db.rollback(); print(f"Error creating subfolders: {e}"); return
    db.expire_all()
    all_session_purpose_values = SessionPurposeEnum.get_all_values()
    all_transcription_status_values = [TranscriptionStatusEnum.INTEGRATED, TranscriptionStatusEnum.DRAFT, TranscriptionStatusEnum.PROCESSING]
    
    # 3. Create Transcriptions
    transcriptions_to_create = []
    folder_names_for_transcriptions = list(created_folder_objects.keys())
    num_integrated, max_integrated = 0, 5 # Create enough integrated ones to be conflict candidates
    for i in range(8):
        chosen_folder_name = random.choice(folder_names_for_transcriptions)
        target_folder_obj = created_folder_objects.get(chosen_folder_name)
        if not target_folder_obj: continue
        status = TranscriptionStatusEnum.INTEGRATED if num_integrated < max_integrated and random.choice([True, True, False]) else random.choice([s for s in all_transcription_status_values if s != TranscriptionStatusEnum.INTEGRATED] or [TranscriptionStatusEnum.DRAFT])
        if status == TranscriptionStatusEnum.INTEGRATED: num_integrated += 1
        title = f"Session {i+1} ({status}) in {chosen_folder_name}"; days_ago = random.randint(1, 60); topics = random.sample(["Tech", "Business", "Planning", "Review", "Demo"], k=random.randint(2,3))
        transcriptions_to_create.append({"folder_obj": target_folder_obj, "title": title, "status": status, "days_ago": days_ago, "topics": topics})
    
    folder_direct_integrated_counts = {}
    for data in transcriptions_to_create:
        target_folder_obj = data["folder_obj"]; upload_time = datetime.now(timezone.utc) - timedelta(days=data["days_ago"]); process_time = upload_time + timedelta(minutes=random.randint(5, 30)); integrate_time = process_time + timedelta(hours=random.randint(1,5)) if data["status"] == TranscriptionStatusEnum.INTEGRATED else None
        current_folder_id = None
        if data["status"] == TranscriptionStatusEnum.INTEGRATED:
            current_folder_id = target_folder_obj.id; folder_direct_integrated_counts[current_folder_id] = folder_direct_integrated_counts.get(current_folder_id, 0) + 1
        transcription = Transcription(folder_id=current_folder_id, session_title=data["title"], source_file_name=f"{data['title'].lower().replace(' ', '-').replace('(', '').replace(')', '')}.mp4", highlights=f"Key highlights for {data['title']}.", status=data["status"], cleaned_transcript_text=f"Transcript for {data['title']}.\nTopics: {', '.join(data['topics'])}.", processing_time_seconds=random.randint(60, 300), topic_names_csv=",".join(data["topics"]), uploaded_at=upload_time, processed_at=process_time if data["status"] != TranscriptionStatusEnum.PROCESSING else None, integrated_at=integrate_time, updated_at=integrate_time or process_time or upload_time)
        transcription.session_detail = SessionDetail(purpose=random.choice(all_session_purpose_values), content=f"Detailed session notes for {data['title']}.")
        if random.random() < 0.6: transcription.quiz = Quiz(quiz_content=f"Quiz for {data['title']}:\nQ1: ...\nQ2: ...")
        db.add(transcription)
    try: db.commit(); print(f"{len(transcriptions_to_create)} Transcriptions created.")
    except Exception as e: db.rollback(); print(f"Error creating transcriptions: {e}"); return
    print("Updating direct folder counts for INTEGRATED transcriptions...")
    for folder_id_to_update, count_val in folder_direct_integrated_counts.items():
        folder_to_update = db.query(Folder).filter(Folder.id == folder_id_to_update).first()
        if folder_to_update: folder_to_update.count = count_val
    try: db.commit(); print("Folder counts (direct integrated) updated.")
    except Exception as e: db.rollback(); print(f"Error updating folder counts: {e}")

    # 4. Create Conflicts based on the transcriptions just created
    db.expire_all()
    all_integrated_trans = db.query(Transcription).filter(Transcription.status == TranscriptionStatusEnum.INTEGRATED, Transcription.folder_id.isnot(None)).all()
    if len(all_integrated_trans) < 2:
        print("Not enough integrated transcriptions (need at least 2) to create conflicts. Skipping.")
        return
    num_conflicts_to_create = random.randint(1, min(3, len(all_integrated_trans) // 2))
    print(f"Attempting to create {num_conflicts_to_create} realistic conflicts...")
    used_transcription_ids = set()
    for i in range(num_conflicts_to_create):
        is_new_vs_new = random.random() < 0.5
        available_trans = [t for t in all_integrated_trans if t.id not in used_transcription_ids]
        if len(available_trans) < 2 and is_new_vs_new: is_new_vs_new = False
        if len(available_trans) < 1: break
        if is_new_vs_new:
            new_trans, existing_trans = random.sample(available_trans, 2)
            used_transcription_ids.add(new_trans.id); used_transcription_ids.add(existing_trans.id)
            existing_id_str = f"transcription_id:{existing_trans.id}"; existing_title = existing_trans.session_title
            print(f"  - Creating New vs. New conflict between T-ID {new_trans.id} and T-ID {existing_trans.id}")
        else:
            new_trans = random.choice(available_trans)
            used_transcription_ids.add(new_trans.id)
            existing_id_str = f"KB_DOC_{uuid.uuid4().hex[:6].upper()}"; existing_title = "an old Knowledge Base article"
            print(f"  - Creating New vs. Legacy conflict for T-ID {new_trans.id} against {existing_id_str}")
        anomaly_type = random.choice(AnomalyTypeEnum.get_all_values()); status = random.choice(ConflictStatusEnum.get_all_values()); content = get_conflict_content(anomaly_type, new_trans.session_title, existing_title); is_resolved = status != ConflictStatusEnum.PENDING
        conflict = Conflict(new_transcription_id=new_trans.id, existing_transcription_id=existing_id_str, new_content_snippet=content["new"], existing_content_snippet=content["existing"], anomaly_type=anomaly_type, status=status, flagged_at=datetime.now(timezone.utc) - timedelta(days=random.randint(2, 10)), resolved_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 1)) if is_resolved else None, resolution_content=content["merged"] if status == ConflictStatusEnum.RESOLVED_MERGED else content["rejected"] if status == ConflictStatusEnum.REJECTED else None)
        db.add(conflict)
    try:
        db.commit(); print("Conflicts created successfully.")
    except Exception as e: db.rollback(); print(f"Error creating conflicts: {e}")

    print("Database population complete.")

if __name__ == "__main__":
    print(f"Using database: {DATABASE_URL_STR}")
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    try:
        create_dummy_data(db_session)
    except Exception as main_e:
        print(f"A critical error occurred during data population: {main_e}")
        if db_session.is_active: db_session.rollback()
    finally:
        if db_session.is_active: db_session.close()
        print("DB Session closed.")