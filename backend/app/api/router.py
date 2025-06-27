from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, func, event
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship, backref, joinedload, selectinload
from sqlalchemy.orm.attributes import get_history
from sqlalchemy.orm import attributes as orm_attributes
from sqlalchemy.future import select

# Assuming core.config.settings is defined elsewhere
from core.config import settings

from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from pydantic import BaseModel, Field, model_validator, ConfigDict

# --- Enums (Unchanged) ---
class SessionPurposeEnum:
    GENERAL_WALKTHROUGH = "General Walkthrough/Overview"; REQUIREMENTS_GATHERING = "Requirements Gathering"; TECHNICAL_DEEP_DIVE = "Technical Deep Dive"; MEETING_MINUTES = "Meeting Minutes"; TRAINING_SESSION = "Training Session"; PRODUCT_DEMO = "Product Demo"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]
class TranscriptionStatusEnum:
    DRAFT = "Draft"; INTEGRATED = "Integrated"; PROCESSING = "Processing"; ERROR = "Error"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]
class AnomalyTypeEnum:
    CONTRADICTION = "Contradiction"; OVERLAP = "Significant Overlap"; SEMANTIC_DIFFERENCE = "Semantic Difference"; OUTDATED_INFO = "Outdated Information"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]
class ConflictStatusEnum:
    PENDING = "Pending Review"; RESOLVED_MERGED = "Resolved (Merged)"; REJECTED= "Rejected"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]

# --- Database Setup (Unchanged) ---
DATABASE_URL = settings.DATABASE_URL
Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
router = APIRouter()

# --- ORM Models (Unchanged) ---
class Folder(Base):
    __tablename__ = "folders"; id = Column(String(255), primary_key=True, index=True, default=lambda: f"folder_{uuid.uuid4().hex[:12]}"); name = Column(String(255), nullable=False); parent_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True); path = Column(String(1024), nullable=True); created_at = Column(DateTime, default=func.now()); updated_at = Column(DateTime, default=func.now(), onupdate=func.now()); count = Column(Integer, nullable=False, default=0); children = relationship("Folder", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan", lazy="selectin"); transcriptions = relationship("Transcription", back_populates="folder", cascade="all, delete-orphan")
class Quiz(Base):
    __tablename__ = "quizzes"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), unique=True, nullable=False); quiz_content = Column(Text, nullable=True); transcription = relationship("Transcription", back_populates="quiz")
class SessionDetail(Base):
    __tablename__ = "session_details"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), unique=True, nullable=False); purpose = Column(String(255), nullable=True); content = Column(Text, nullable=True); transcription = relationship("Transcription", back_populates="session_detail")
class Transcription(Base):
    __tablename__ = "transcriptions"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); folder_id = Column(String(255), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True); session_title = Column(String(500), nullable=False); source_file_name = Column(String(500), nullable=True); highlights = Column(Text, nullable=True); status = Column(String(50), nullable=False, default=TranscriptionStatusEnum.PROCESSING); cleaned_transcript_text = Column(Text, nullable=True); processing_time_seconds = Column(Integer, nullable=True); topic_names_csv = Column(Text, nullable=True); uploaded_at = Column(DateTime, default=func.now()); processed_at = Column(DateTime, nullable=True); integrated_at = Column(DateTime, nullable=True); updated_at = Column(DateTime, default=func.now(), onupdate=func.now()); folder = relationship("Folder", back_populates="transcriptions"); quiz = relationship("Quiz", back_populates="transcription", uselist=False, cascade="all, delete-orphan"); session_detail = relationship("SessionDetail", back_populates="transcription", uselist=False, cascade="all, delete-orphan")
class Conflict(Base):
    __tablename__ = "conflicts"; id = Column(Integer, primary_key=True, index=True, autoincrement=True); new_transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False); existing_transcription_id = Column(String(255), nullable=False); new_content_snippet = Column(Text, nullable=True); existing_content_snippet = Column(Text, nullable=True); anomaly_type = Column(String(100), nullable=False); status = Column(String(100), nullable=False, default=ConflictStatusEnum.PENDING); flagged_at = Column(DateTime, default=func.now()); resolved_at = Column(DateTime, nullable=True); resolution_content = Column(Text, nullable=True); new_transcription_obj = relationship("Transcription", foreign_keys=[new_transcription_id])

# --- Pydantic Schemas (MODIFIED) ---
class FolderBaseSchema(BaseModel):
    name: str; parent_id: Optional[str] = None
class FolderCreateSchema(FolderBaseSchema):
    id: Optional[str] = None
class FolderUpdateSchema(BaseModel):
    name: Optional[str] = None
class FolderSchema(FolderBaseSchema):
    id: str; path: Optional[str] = None; created_at: datetime; updated_at: datetime; count: int = 0
    model_config = ConfigDict(from_attributes=True)
class FolderTreeNodeSchema(FolderSchema):
    children: List['FolderTreeNodeSchema'] = []
class QuizBaseSchema(BaseModel):
    quiz_content: Optional[str] = None
class QuizCreateSchema(QuizBaseSchema): pass
class QuizSchema(QuizBaseSchema):
    id: int; transcription_id: int
    model_config = ConfigDict(from_attributes=True)
class SessionDetailBaseSchema(BaseModel):
    purpose: Optional[str] = None; content: Optional[str] = None
class SessionDetailCreateSchema(SessionDetailBaseSchema): pass
class SessionDetailSchema(SessionDetailBaseSchema):
    id: int; transcription_id: int
    model_config = ConfigDict(from_attributes=True)
class TranscriptionBaseSchema(BaseModel):
    session_title: str; folder_id: Optional[str] = None; source_file_name: Optional[str] = None
    highlights: Optional[str] = None; status: Optional[str] = Field(default=TranscriptionStatusEnum.PROCESSING)
    cleaned_transcript_text: Optional[str] = None; processing_time_seconds: Optional[int] = None
    topic_names: Optional[List[str]] = Field(default_factory=list); session_purpose: Optional[str] = Field(default=SessionPurposeEnum.GENERAL_WALKTHROUGH)
    session_purpose_content: Optional[str] = None; quiz_content: Optional[str] = None

class TranscriptionProcessMetadataSchema(BaseModel):
    session_title: Optional[str] = Field(default="Untitled Session"); session_purpose: Optional[str] = Field(default=SessionPurposeEnum.GENERAL_WALKTHROUGH)
    primary_topic_names: Optional[List[str]] = Field(default_factory=list); keywords: Optional[str] = None; generate_quiz: Optional[bool] = False
class ProcessedTranscriptionReviewDataSchema(BaseModel):
    transcription_id: int; session_info: Dict[str, Any]; cleaned_transcription: Optional[str]
    generated_quiz: Optional[str]; knowledge_base_integration: Dict[str, Any]
class TranscriptionUpdateSchema(BaseModel):
    session_title: Optional[str] = None; folder_id: Optional[str] = None; highlights: Optional[str] = None
    status: Optional[str] = None; cleaned_transcript_text: Optional[str] = None; processing_time_seconds: Optional[int] = None
    topic_names: Optional[List[str]] = None; session_purpose: Optional[str] = None; session_purpose_content: Optional[str] = None
    quiz_content: Optional[str] = None; integrated_at: Optional[datetime] = None

class TranscriptionSchema(TranscriptionBaseSchema):
    id: int
    folder_path: Optional[str] = None # MODIFIED: Add folder_path field
    uploaded_at: datetime
    processed_at: Optional[datetime]
    integrated_at: Optional[datetime]
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def populate_from_orm_object(cls, data: Any) -> Any:
        if hasattr(data, '_sa_instance_state'):
            orm_obj = data; result_dict = {}
            for field_name in cls.model_fields:
                if hasattr(orm_obj, field_name): result_dict[field_name] = getattr(orm_obj, field_name)
            
            # MODIFIED: Populate folder_path from the related Folder object
            if hasattr(orm_obj, 'folder') and orm_obj.folder:
                result_dict['folder_path'] = orm_obj.folder.path

            if hasattr(orm_obj, 'topic_names_csv') and orm_obj.topic_names_csv: result_dict['topic_names'] = [name.strip() for name in orm_obj.topic_names_csv.split(',') if name.strip()]
            elif 'topic_names' not in result_dict: result_dict['topic_names'] = []
            if hasattr(orm_obj, 'session_detail') and orm_obj.session_detail:
                result_dict['session_purpose'] = orm_obj.session_detail.purpose; result_dict['session_purpose_content'] = orm_obj.session_detail.content
            elif 'session_purpose' not in result_dict: result_dict['session_purpose'] = cls.model_fields['session_purpose'].default; result_dict['session_purpose_content'] = None
            if hasattr(orm_obj, 'quiz') and orm_obj.quiz: result_dict['quiz_content'] = orm_obj.quiz.quiz_content
            elif 'quiz_content' not in result_dict: result_dict['quiz_content'] = None
            if 'id' not in result_dict and hasattr(orm_obj, 'id'): result_dict['id'] = orm_obj.id
            if 'uploaded_at' not in result_dict and hasattr(orm_obj, 'uploaded_at'): result_dict['uploaded_at'] = orm_obj.uploaded_at
            return result_dict
        return data

class ConflictBaseSchema(BaseModel):
    new_transcription_id: int; existing_transcription_id: str; new_content_snippet: Optional[str] = None
    existing_content_snippet: Optional[str] = None; anomaly_type: str; status: Optional[str] = Field(default=ConflictStatusEnum.PENDING); resolution_content: Optional[str] = None
class ConflictCreateSchema(ConflictBaseSchema): pass
class ConflictUpdateSchema(BaseModel):
    status: Optional[str] = None; resolution_content: Optional[str] = None
class ConflictSchema(ConflictBaseSchema):
    id: int; flagged_at: datetime; resolved_at: Optional[datetime]; new_transcription_title: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
class RepositoryDataSchema(BaseModel):
    transcriptions: List[TranscriptionSchema]
class ConflictDetailSchema(BaseModel):
    id: int; status: str; path_left: List[str]; path_right: List[str]
    existing_content: Optional[str]; incoming_content: Optional[str]; resolution_content: Optional[str]
class AdminDashboardStatsSchema(BaseModel):
    pending: int; resolved: int; rejected: int; total: int
class AdminConflictsResponseSchema(BaseModel):
    conflicts: List[ConflictSchema]; stats: AdminDashboardStatsSchema

# --- DB Dependency and Event Listeners (Unchanged) ---
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def _recursively_update_children_paths(parent_folder: Folder, session: Session):
    base_path = parent_folder.path
    for child in parent_folder.children:
        child.path = f"{base_path} / {child.name}"
        if child.children: _recursively_update_children_paths(child, session)

@event.listens_for(Folder, 'before_insert')
def before_folder_insert(mapper, connection, target: Folder):
    session = Session.object_session(target)
    if session and target.parent_id:
        parent = session.get(Folder, target.parent_id)
        if parent: target.path = f"{parent.path} / {target.name}"
        else: target.path = target.name
    else: target.path = target.name
@event.listens_for(Folder, 'before_update')
def before_folder_update(mapper, connection, target: Folder):
    session = Session.object_session(target)
    if not session: return
    state = orm_attributes.instance_state(target)
    if not state.modified: return
    if not any(c.key in ['name', 'parent_id'] for c in state.committed_state.values()): return
    if target.parent_id:
        parent = session.get(Folder, target.parent_id)
        new_path = f"{parent.path} / {target.name}" if parent else target.name
    else: new_path = target.name
    if target.path != new_path:
        target.path = new_path
        if target.children: _recursively_update_children_paths(target, session)
@event.listens_for(Transcription, 'after_update')
def sync_folder_count_on_update(mapper, connection, target: Transcription):
    session = Session.object_session(target)
    if not session: return
    history = get_history(target, 'folder_id')
    old_folder_id = history.deleted[0] if history.deleted and history.deleted[0] is not None else None
    new_folder_id = history.added[0] if history.added and history.added[0] is not None else None
    if old_folder_id == new_folder_id: return
    if old_folder_id:
        old_folder = session.get(Folder, old_folder_id)
        if old_folder: old_folder.count = max(0, (old_folder.count or 0) - 1)
    if new_folder_id:
        new_folder = session.get(Folder, new_folder_id)
        if new_folder: new_folder.count = (new_folder.count or 0) + 1
@event.listens_for(Transcription, 'before_delete')
def sync_folder_count_on_delete(mapper, connection, target: Transcription):
    if target.folder_id:
        session = Session.object_session(target)
        if session:
            folder = session.get(Folder, target.folder_id)
            if folder: folder.count = max(0, (folder.count or 0) - 1)

# --- FastAPI Routes (MODIFIED) ---

def build_folder_tree(db: Session, parent_id: Optional[str] = None) -> List[FolderTreeNodeSchema]:
    current_level_folders_query = db.query(Folder).filter(Folder.parent_id == parent_id)
    folder_nodes = []
    for folder_db in current_level_folders_query.all():
        node = FolderTreeNodeSchema.model_validate(folder_db)
        node.children = build_folder_tree(db, folder_db.id)
        children_total_count = sum(child.count for child in node.children)
        node.count += children_total_count
        folder_nodes.append(node)
    return folder_nodes

@router.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        folders_to_update = db.query(Folder).all()
        changed = False
        for folder_obj in folders_to_update:
            actual_direct_count = db.query(func.count(Transcription.id)).filter(Transcription.folder_id == folder_obj.id).scalar()
            if folder_obj.count != actual_direct_count:
                folder_obj.count = actual_direct_count; changed = True
        if changed: db.commit()
    finally: db.close()

@router.get("/transcriptions/pending-reviews", response_model=List[TranscriptionSchema], tags=["Transcriptions"])
def get_pending_transcriptions_for_review(db: Session = Depends(get_db)):
    pending_statuses = [TranscriptionStatusEnum.DRAFT, TranscriptionStatusEnum.PROCESSING, TranscriptionStatusEnum.ERROR]
    # MODIFIED: Added joinedload for folder to provide folder_path
    query = db.query(Transcription)\
              .options(joinedload(Transcription.folder), joinedload(Transcription.quiz), joinedload(Transcription.session_detail))\
              .filter(Transcription.status.in_(pending_statuses))\
              .order_by(Transcription.updated_at.desc())
    return [TranscriptionSchema.model_validate(t) for t in query.all()]

@router.get("/transcriptions/review-history", response_model=List[TranscriptionSchema], tags=["Transcriptions"])
def get_completed_transcription_history(db: Session = Depends(get_db)):
    completed_statuses = [TranscriptionStatusEnum.INTEGRATED]
    # MODIFIED: Added joinedload for folder to provide folder_path
    query = db.query(Transcription)\
              .options(joinedload(Transcription.folder), joinedload(Transcription.quiz), joinedload(Transcription.session_detail))\
              .filter(Transcription.status.in_(completed_statuses))\
              .order_by(Transcription.integrated_at.desc(), Transcription.updated_at.desc())
    return [TranscriptionSchema.model_validate(t) for t in query.all()]

@router.get("/folders/tree", response_model=List[FolderTreeNodeSchema], tags=["Folders"])
def get_folder_tree_data(db: Session = Depends(get_db)):
    return build_folder_tree(db, None)

@router.post("/folders", response_model=FolderSchema, status_code=201, tags=["Folders"])
def create_folder(folder_data: FolderCreateSchema, db: Session = Depends(get_db)):
    if folder_data.id and db.query(Folder).filter(Folder.id == folder_data.id).first():
        raise HTTPException(status_code=400, detail=f"Folder with ID '{folder_data.id}' already exists.")
    new_folder_id = folder_data.id or f"folder_{uuid.uuid4().hex[:12]}"
    if folder_data.parent_id and not db.query(Folder).filter(Folder.id == folder_data.parent_id).first():
        raise HTTPException(status_code=404, detail=f"Parent folder with ID '{folder_data.parent_id}' not found.")
    db_folder = Folder(id=new_folder_id, name=folder_data.name, parent_id=folder_data.parent_id, count=0)
    db.add(db_folder); db.commit(); db.refresh(db_folder)
    return FolderSchema.model_validate(db_folder)

@router.put("/folders/{folder_id}", response_model=FolderSchema, tags=["Folders"])
def rename_folder(folder_id: str, folder_update: FolderUpdateSchema, db: Session = Depends(get_db)):
    db_folder = db.query(Folder).options(selectinload(Folder.children)).filter(Folder.id == folder_id).first()
    if not db_folder: raise HTTPException(status_code=404, detail="Folder not found")
    if folder_update.name: db_folder.name = folder_update.name
    db_folder.updated_at = datetime.utcnow(); db.commit(); db.refresh(db_folder)
    return FolderSchema.model_validate(db_folder)

@router.delete("/folders/{folder_id}", status_code=204, tags=["Folders"])
def delete_folder_endpoint(folder_id: str, db: Session = Depends(get_db)):
    db_folder = db.query(Folder).options(selectinload(Folder.children)).filter(Folder.id == folder_id).first()
    if not db_folder: raise HTTPException(status_code=404, detail="Folder not found")
    if db_folder.children: raise HTTPException(status_code=400, detail="Cannot delete folder: it has subfolders.")
    if db_folder.count > 0: raise HTTPException(status_code=400, detail="Cannot delete folder: it contains transcriptions.")
    db.delete(db_folder); db.commit()
    return None

@router.post("/transcriptions/upload-process", response_model=ProcessedTranscriptionReviewDataSchema, tags=["Transcriptions"])
async def upload_and_process_transcription(metadata: TranscriptionProcessMetadataSchema = Body(...), db: Session = Depends(get_db)):
    processing_time_sec = (len(metadata.session_title or "") + len(metadata.keywords or "")) % 120 + 60
    topic_names_csv_str = ",".join(topic.strip() for topic in metadata.primary_topic_names if topic.strip()) if metadata.primary_topic_names else None
    db_transcription = Transcription(session_title=metadata.session_title or "Untitled Session", status=TranscriptionStatusEnum.PROCESSING, source_file_name="mock_file.mp4", processing_time_seconds=processing_time_sec, topic_names_csv=topic_names_csv_str, uploaded_at=datetime.utcnow())
    db_session_detail = SessionDetail(purpose=metadata.session_purpose)
    db_transcription.session_detail = db_session_detail; generated_quiz_text = None
    if metadata.generate_quiz:
        generated_quiz_text = f"### Quiz for {db_transcription.session_title}\n\n1. What was the main purpose of this session?"
        db_transcription.quiz = Quiz(quiz_content=generated_quiz_text)
    db.add(db_transcription)
    generated_content = f"### {db_transcription.session_title}\n\nSession Purpose: {metadata.session_purpose}\nTopics: {topic_names_csv_str or 'N/A'}\n\n"
    if metadata.keywords: generated_content += f"Keywords mentioned: {metadata.keywords.replace(chr(10), ', ')}\n\n"
    generated_content += "This is a mock transcription based on the provided metadata from backend."
    db_transcription.cleaned_transcript_text = generated_content; db_transcription.status = TranscriptionStatusEnum.DRAFT; db_transcription.processed_at = datetime.utcnow()
    db.commit(); db.refresh(db_transcription)
    return ProcessedTranscriptionReviewDataSchema(transcription_id=db_transcription.id, session_info={"title": db_transcription.session_title, "purpose": metadata.session_purpose, "domain": topic_names_csv_str or "N/A", "processingTime": f"{processing_time_sec // 60}m {processing_time_sec % 60}s"}, cleaned_transcription=db_transcription.cleaned_transcript_text, generated_quiz=generated_quiz_text, knowledge_base_integration={"suggestionText": f"Related to '{metadata.primary_topic_names[0] if metadata.primary_topic_names else 'General'}'.", "proposedLocation": (metadata.primary_topic_names[:1] if metadata.primary_topic_names else ["General"]) + [db_transcription.session_title]})

def _update_transcription_fields(db_transcription: Transcription, data: TranscriptionUpdateSchema, db: Session):
    if data.session_title is not None: db_transcription.session_title = data.session_title
    if data.highlights is not None: db_transcription.highlights = data.highlights
    if data.status is not None: db_transcription.status = data.status
    if data.cleaned_transcript_text is not None: db_transcription.cleaned_transcript_text = data.cleaned_transcript_text
    if data.processing_time_seconds is not None: db_transcription.processing_time_seconds = data.processing_time_seconds
    if data.topic_names is not None: db_transcription.topic_names_csv = ",".join(t.strip() for t in data.topic_names if t.strip()) if data.topic_names else None
    if data.session_purpose is not None or data.session_purpose_content is not None:
        if not db_transcription.session_detail: db_transcription.session_detail = SessionDetail(transcription_id=db_transcription.id)
        if data.session_purpose is not None: db_transcription.session_detail.purpose = data.session_purpose
        if data.session_purpose_content is not None: db_transcription.session_detail.content = data.session_purpose_content
    if data.quiz_content is not None:
        if not db_transcription.quiz: db_transcription.quiz = Quiz(transcription_id=db_transcription.id)
        db_transcription.quiz.quiz_content = data.quiz_content
    if data.integrated_at is not None: db_transcription.integrated_at = data.integrated_at
    db_transcription.updated_at = datetime.utcnow()

@router.put("/transcriptions/{transcription_id}/save-draft", response_model=TranscriptionSchema, tags=["Transcriptions"])
def save_transcription_as_draft(transcription_id: int, data: TranscriptionUpdateSchema, db: Session = Depends(get_db)):
    db_transcription = db.query(Transcription).options(joinedload(Transcription.quiz), joinedload(Transcription.session_detail)).filter(Transcription.id == transcription_id).first()
    if not db_transcription: raise HTTPException(status_code=404, detail="Transcription not found")
    _update_transcription_fields(db_transcription, data, db); db_transcription.status = TranscriptionStatusEnum.DRAFT
    if data.folder_id is not None:
        if not db.query(Folder).filter(Folder.id == data.folder_id).first(): raise HTTPException(status_code=404, detail=f"Draft folder {data.folder_id} not found.")
        db_transcription.folder_id = data.folder_id
    elif data.folder_id is None and db_transcription.folder_id is not None: db_transcription.folder_id = None
    db.commit(); db.refresh(db_transcription)
    if db_transcription.quiz: db.refresh(db_transcription.quiz)
    if db_transcription.session_detail: db.refresh(db_transcription.session_detail)
    return TranscriptionSchema.model_validate(db_transcription)

@router.put("/transcriptions/{transcription_id}/finalize-integration", response_model=Dict[str, Any], tags=["Transcriptions"])
def finalize_transcription_integration(transcription_id: int, target_folder_id: str = Body(..., embed=True), updated_data: Optional[TranscriptionUpdateSchema] = Body(None), db: Session = Depends(get_db)):
    db_transcription = db.query(Transcription).options(joinedload(Transcription.quiz), joinedload(Transcription.session_detail)).filter(Transcription.id == transcription_id).first()
    if not db_transcription: raise HTTPException(status_code=404, detail="Transcription not found")
    target_folder = db.query(Folder).filter(Folder.id == target_folder_id).first()
    if not target_folder: raise HTTPException(status_code=404, detail=f"Target folder {target_folder_id} not found.")
    if updated_data: _update_transcription_fields(db_transcription, updated_data, db)
    db_transcription.folder_id = target_folder_id; db_transcription.status = TranscriptionStatusEnum.INTEGRATED; db_transcription.integrated_at = datetime.utcnow()
    message = f"Content integrated and saved to '{target_folder.name}'."
    if uuid.uuid4().int % 10 < 3:
        conflict = Conflict(new_transcription_id=db_transcription.id, existing_transcription_id=f"KB_DOC_{uuid.uuid4().int % 1000}", new_content_snippet=(db_transcription.cleaned_transcript_text or "")[:100]+"...", existing_content_snippet="Pre-existing content...", anomaly_type=list(AnomalyTypeEnum.ALL_VALUES)[uuid.uuid4().int % len(AnomalyTypeEnum.ALL_VALUES)], status=ConflictStatusEnum.PENDING)
        db.add(conflict); message = f"Integrated to '{target_folder.name}'. Potential conflict flagged."
    db.commit()
    return {"success": True, "message": message, "transcription_id": db_transcription.id}

@router.get("/repository", response_model=RepositoryDataSchema, tags=["Repository"])
def get_repository_data(folder_id: Optional[str] = Query(None), search: Optional[str] = Query(None), sort_by: Optional[str] = Query("integrated_at"), sort_order: Optional[str] = Query("desc"), purpose_filters: Optional[str] = Query(None), db: Session = Depends(get_db)):
    # The joinedload(Transcription.folder) here ensures the folder_path is available for the validator
    trans_query = db.query(Transcription).options(joinedload(Transcription.folder), joinedload(Transcription.quiz), joinedload(Transcription.session_detail))
    trans_query = trans_query.filter(Transcription.status == TranscriptionStatusEnum.INTEGRATED)
    if folder_id and folder_id.lower() != "all": trans_query = trans_query.filter(Transcription.folder_id == folder_id)
    if search:
        search_term = f"%{search.lower()}%"
        trans_query = trans_query.filter((func.lower(Transcription.session_title).like(search_term)) | (func.lower(Transcription.cleaned_transcript_text).like(search_term)) | (func.lower(Transcription.topic_names_csv).like(search_term)) | (Transcription.session_detail.has(func.lower(SessionDetail.content).like(search_term))))
    if purpose_filters:
        purposes = [p.strip() for p in purpose_filters.split(',') if p.strip()]
        if purposes: trans_query = trans_query.join(Transcription.session_detail).filter(SessionDetail.purpose.in_(purposes))
    sort_attr_map = {"session_title": Transcription.session_title, "processed_at": Transcription.processed_at, "uploaded_at": Transcription.uploaded_at, "integrated_at": Transcription.integrated_at, "updated_at": Transcription.updated_at, "session_purpose": SessionDetail.purpose}
    sort_attr = sort_attr_map.get(sort_by, Transcription.integrated_at)
    if sort_by == "session_purpose" and (not any(isinstance(opt, joinedload) and opt.path.key == 'session_detail' for opt in trans_query._with_options) and not any(target.table == SessionDetail.__table__ for target in trans_query._setup_joins)):
        trans_query = trans_query.outerjoin(Transcription.session_detail)
    trans_query = trans_query.order_by(sort_attr.asc() if sort_order == "asc" else sort_attr.desc())
    all_transcriptions_db = trans_query.all()
    return RepositoryDataSchema(transcriptions=[TranscriptionSchema.model_validate(t) for t in all_transcriptions_db])

@router.delete("/transcriptions/{transcription_id}", status_code=204, tags=["Transcriptions"])
def delete_transcription(transcription_id: int, db: Session = Depends(get_db)):
    db_transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
    if not db_transcription: raise HTTPException(status_code=404, detail="Transcription not found")
    db.delete(db_transcription); db.commit()
    return None

@router.get("/admin/conflicts", response_model=AdminConflictsResponseSchema, tags=["Admin Conflicts"])
def get_admin_conflicts(db: Session = Depends(get_db)):
    conflicts_db = db.query(Conflict).options(joinedload(Conflict.new_transcription_obj)).order_by(Conflict.flagged_at.desc()).all()
    conflict_schemas = []
    for c_db in conflicts_db:
        c_schema = ConflictSchema.model_validate(c_db)
        if c_db.new_transcription_obj: c_schema.new_transcription_title = c_db.new_transcription_obj.session_title
        conflict_schemas.append(c_schema)
    stats = {"pending": 0, "resolved": 0, "rejected": 0}
    for item in conflicts_db:
        if item.status == ConflictStatusEnum.PENDING: stats["pending"] += 1
        elif item.status and item.status.startswith(ConflictStatusEnum.RESOLVED_MERGED.split(" ")[0]): stats["resolved"] += 1
        elif item.status and item.status.startswith(ConflictStatusEnum.REJECTED.split(" ")[0]): stats["rejected"] += 1
    stats_data = AdminDashboardStatsSchema(pending=stats["pending"], resolved=stats["resolved"], rejected=stats["rejected"], total=len(conflicts_db))
    return AdminConflictsResponseSchema(conflicts=conflict_schemas, stats=stats_data)

@router.get("/admin/conflicts/{conflict_id}/detail", response_model=ConflictDetailSchema, tags=["Admin Conflicts"])
def get_conflict_detail(conflict_id: int, db: Session = Depends(get_db)):
    conflict_db = db.query(Conflict).options(joinedload(Conflict.new_transcription_obj).joinedload(Transcription.folder)).filter(Conflict.id == conflict_id).first()
    if not conflict_db: raise HTTPException(status_code=404, detail="Conflict not found")
    
    path_right = ["Transcription", "N/A"]
    if conflict_db.new_transcription_obj:
        path_right[1] = conflict_db.new_transcription_obj.session_title
        if conflict_db.new_transcription_obj.folder:
            path_right = conflict_db.new_transcription_obj.folder.path.split(" / ") + [path_right[1]]

    # Determine left path based on ID format
    path_left = []
    if conflict_db.existing_transcription_id.startswith("KB_DOC_"):
        path_left = ["KB Doc", conflict_db.existing_transcription_id]
    elif conflict_db.existing_transcription_id.startswith("transcription_id:"):
        try:
            existing_trans_id = int(conflict_db.existing_transcription_id.split(":")[1])
            existing_trans_db = db.query(Transcription).options(joinedload(Transcription.folder)).filter(Transcription.id == existing_trans_id).first()
            if existing_trans_db and existing_trans_db.folder:
                path_left = existing_trans_db.folder.path.split(" / ") + [existing_trans_db.session_title]
            elif existing_trans_db:
                 path_left = ["Transcription", existing_trans_db.session_title]
            else:
                path_left = ["Unknown Transcription", str(existing_trans_id)]

        except (ValueError, IndexError):
            path_left = ["Unknown", conflict_db.existing_transcription_id]
    else:
        path_left = ["Unknown Source", conflict_db.existing_transcription_id]

    return ConflictDetailSchema(id=conflict_db.id, status=conflict_db.status, path_left=path_left, path_right=path_right, existing_content=conflict_db.existing_content_snippet, incoming_content=conflict_db.new_content_snippet, resolution_content=conflict_db.resolution_content)

@router.put("/admin/conflicts/{conflict_id}/resolve", response_model=ConflictSchema, tags=["Admin Conflicts"])
def resolve_conflict_endpoint(conflict_id: int, update_data: ConflictUpdateSchema, db: Session = Depends(get_db)):
    conflict_db = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict_db: raise HTTPException(status_code=404, detail="Conflict not found")
    if update_data.status: conflict_db.status = update_data.status
    elif update_data.resolution_content is not None and conflict_db.status == ConflictStatusEnum.PENDING:
        conflict_db.status = ConflictStatusEnum.RESOLVED_MERGED
    if update_data.resolution_content is not None: conflict_db.resolution_content = update_data.resolution_content
    conflict_db.resolved_at = datetime.utcnow()
    db.commit()
    reloaded_conflict = db.query(Conflict).options(joinedload(Conflict.new_transcription_obj)).filter(Conflict.id == conflict_id).first()
    if not reloaded_conflict: raise HTTPException(status_code=500, detail="Failed to reload conflict.")
    c_schema = ConflictSchema.model_validate(reloaded_conflict)
    if reloaded_conflict.new_transcription_obj: c_schema.new_transcription_title = reloaded_conflict.new_transcription_obj.session_title
    return c_schema