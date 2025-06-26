from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body, Query
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, func, Table, Enum as DBEnum
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship, backref, joinedload, selectinload
from sqlalchemy.future import select
from core.config import settings
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

# Pydantic V2 imports
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

# --- Constants ---
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


# --- Database Setup ---
DATABASE_URL = settings.DATABASE_URL
Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
router = APIRouter()

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
    highlights = Column(String(255), nullable=True)
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


# --- Pydantic Schemas ---

# Folder Schemas
class FolderBaseSchema(BaseModel):
    name: str
    parent_id: Optional[str] = None

class FolderCreateSchema(FolderBaseSchema):
    id: Optional[str] = None

class FolderUpdateSchema(BaseModel):
    name: Optional[str] = None

class FolderSchema(FolderBaseSchema):
    id: str
    created_at: datetime
    updated_at: datetime
    count: int = 0
    model_config = ConfigDict(from_attributes=True)

class FolderTreeNodeSchema(FolderSchema):
    children: List['FolderTreeNodeSchema'] = []


# Quiz Schemas
class QuizBaseSchema(BaseModel):
    quiz_content: Optional[str] = None

class QuizCreateSchema(QuizBaseSchema):
    pass

class QuizSchema(QuizBaseSchema):
    id: int
    transcription_id: int
    model_config = ConfigDict(from_attributes=True)

# SessionDetail Schemas
class SessionDetailBaseSchema(BaseModel):
    purpose: Optional[str] = None
    content: Optional[str] = None

class SessionDetailCreateSchema(SessionDetailBaseSchema):
    pass

class SessionDetailSchema(SessionDetailBaseSchema):
    id: int
    transcription_id: int
    model_config = ConfigDict(from_attributes=True)

# Transcription Schemas
class TranscriptionBaseSchema(BaseModel):
    session_title: str
    folder_id: Optional[str] = None
    folder_path: Optional[str] = None
    source_file_name: Optional[str] = None
    highlights: Optional[str] = None
    status: Optional[str] = Field(default=TranscriptionStatusEnum.PROCESSING)
    cleaned_transcript_text: Optional[str] = None
    processing_time_seconds: Optional[int] = None
    topic_names: Optional[List[str]] = Field(default_factory=list)
    session_purpose: Optional[str] = Field(default=SessionPurposeEnum.GENERAL_WALKTHROUGH)
    session_purpose_content: Optional[str] = None
    quiz_content: Optional[str] = None


class TranscriptionProcessMetadataSchema(BaseModel):
    session_title: Optional[str] = Field(default="Untitled Session")
    session_purpose: Optional[str] = Field(default=SessionPurposeEnum.GENERAL_WALKTHROUGH)
    primary_topic_names: Optional[List[str]] = Field(default_factory=list)
    keywords: Optional[str] = None
    generate_quiz: Optional[bool] = False


class ProcessedTranscriptionReviewDataSchema(BaseModel):
    transcription_id: int
    session_info: Dict[str, Any]
    cleaned_transcription: Optional[str]
    generated_quiz: Optional[str]
    knowledge_base_integration: Dict[str, Any]

class TranscriptionUpdateSchema(BaseModel):
    session_title: Optional[str] = None
    folder_id: Optional[str] = None
    highlights: Optional[str] = None
    status: Optional[str] = None
    cleaned_transcript_text: Optional[str] = None
    processing_time_seconds: Optional[int] = None
    topic_names: Optional[List[str]] = None
    session_purpose: Optional[str] = None
    session_purpose_content: Optional[str] = None
    quiz_content: Optional[str] = None
    integrated_at: Optional[datetime] = None


class TranscriptionSchema(TranscriptionBaseSchema):
    id: int
    uploaded_at: datetime
    processed_at: Optional[datetime]
    integrated_at: Optional[datetime]
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def populate_from_orm_object(cls, data: Any) -> Any:
        if hasattr(data, '_sa_instance_state'): 
            orm_obj = data
            result_dict = {}
            for field_name in cls.model_fields:
                if hasattr(orm_obj, field_name):
                    result_dict[field_name] = getattr(orm_obj, field_name)
            
            if hasattr(orm_obj, 'topic_names_csv') and orm_obj.topic_names_csv:
                result_dict['topic_names'] = [name.strip() for name in orm_obj.topic_names_csv.split(',') if name.strip()]
            elif 'topic_names' not in result_dict:
                result_dict['topic_names'] = []

            if hasattr(orm_obj, 'session_detail') and orm_obj.session_detail:
                result_dict['session_purpose'] = orm_obj.session_detail.purpose
                result_dict['session_purpose_content'] = orm_obj.session_detail.content
            elif 'session_purpose' not in result_dict:
                 result_dict['session_purpose'] = cls.model_fields['session_purpose'].default
                 result_dict['session_purpose_content'] = None

            if hasattr(orm_obj, 'quiz') and orm_obj.quiz:
                result_dict['quiz_content'] = orm_obj.quiz.quiz_content
            elif 'quiz_content' not in result_dict:
                result_dict['quiz_content'] = None
            
            if 'id' not in result_dict and hasattr(orm_obj, 'id'):
                result_dict['id'] = orm_obj.id
            if 'uploaded_at' not in result_dict and hasattr(orm_obj, 'uploaded_at'):
                result_dict['uploaded_at'] = orm_obj.uploaded_at
            return result_dict
        return data


# Conflict Schemas
class ConflictBaseSchema(BaseModel):
    new_transcription_id: int
    existing_transcription_id: str
    new_content_snippet: Optional[str] = None
    existing_content_snippet: Optional[str] = None
    anomaly_type: str
    status: Optional[str] = Field(default=ConflictStatusEnum.PENDING)
    resolution_content: Optional[str] = None

class ConflictCreateSchema(ConflictBaseSchema):
    pass

class ConflictUpdateSchema(BaseModel):
    status: Optional[str] = None
    resolution_content: Optional[str] = None

class ConflictSchema(ConflictBaseSchema):
    id: int
    flagged_at: datetime
    resolved_at: Optional[datetime]
    new_transcription_title: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Repository and ConflictDetail Schemas
class RepositoryDataSchema(BaseModel):
    folders: List[FolderTreeNodeSchema]
    transcriptions: List[TranscriptionSchema]

class ConflictDetailSchema(BaseModel):
    id: int
    status: str
    path_left: List[str]
    path_right: List[str]
    existing_content: Optional[str]
    incoming_content: Optional[str]
    resolution_content: Optional[str]

# Schema for Admin Dashboard Stats
class AdminDashboardStatsSchema(BaseModel):
    pending: int
    resolved: int
    rejected: int
    total: int

# Schema for the response of /admin/conflicts endpoint
class AdminConflictsResponseSchema(BaseModel):
    conflicts: List[ConflictSchema]
    stats: AdminDashboardStatsSchema


# --- Dependency for DB Session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helper Functions ---
def build_folder_tree(db: Session, parent_id: Optional[str] = None) -> List[FolderTreeNodeSchema]:
    folders_query = db.query(Folder).filter(Folder.parent_id == parent_id).options(selectinload(Folder.transcriptions))
    if parent_id is None and not db.query(Folder).filter(Folder.id == "all").count():
         folders_query = db.query(Folder).filter(Folder.parent_id.is_(None)).options(selectinload(Folder.transcriptions))
    folder_nodes = []
    for folder_db in folders_query.all():
        transcription_count = len(folder_db.transcriptions)
        node = FolderTreeNodeSchema.model_validate(folder_db)
        node.count = transcription_count
        node.children = build_folder_tree(db, folder_db.id)
        folder_nodes.append(node)
    return folder_nodes

# --- FastAPI Router Events & Endpoints ---

@router.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        all_folder_id = "all"
        all_folder = db.query(Folder).filter(Folder.id == all_folder_id).first()
        if not all_folder:
            db.add(Folder(id=all_folder_id, name="All Transcriptions", parent_id=None))
            db.commit()
    finally:
        db.close()

@router.get("/transcriptions/pending-reviews", response_model=List[TranscriptionSchema], tags=["Transcriptions"])
def get_pending_transcriptions_for_review(
    db: Session = Depends(get_db)
):
    """
    Get all transcriptions that are pending review or in processing states.
    Sorted by last update time, newest first.
    Folder name is NOT explicitly loaded for this endpoint.
    """
    pending_statuses = [
        TranscriptionStatusEnum.DRAFT,
        TranscriptionStatusEnum.PROCESSING,
        TranscriptionStatusEnum.ERROR
    ]

    query = db.query(Transcription).filter(Transcription.status.in_(pending_statuses))
    query = query.order_by(Transcription.updated_at.desc())

    transcriptions_db = query.all()

    return [TranscriptionSchema.model_validate(t) for t in transcriptions_db]


@router.get("/transcriptions/review-history", response_model=List[TranscriptionSchema], tags=["Transcriptions"])
def get_completed_transcription_history(
    db: Session = Depends(get_db)
):
    """
    Get all transcriptions that have been completed (Integrated or Archived).
    Sorted by integration date (or updated_at as fallback), newest first.
    Includes folder name.
    """
    completed_statuses = [
        TranscriptionStatusEnum.INTEGRATED
    ]

    query = db.query(Transcription).filter(Transcription.status.in_(completed_statuses))
    
    # Sort by integrated_at (desc, newest first), with updated_at as a secondary sort or fallback
    query = query.order_by(Transcription.integrated_at.desc(), Transcription.updated_at.desc())

    transcriptions_db = query.all()
    
    return [TranscriptionSchema.model_validate(t) for t in transcriptions_db]

# Folder Endpoints
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
    db_folder = Folder(id=new_folder_id, name=folder_data.name, parent_id=folder_data.parent_id)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    folder_schema_response = FolderSchema.model_validate(db_folder)
    folder_schema_response.count = 0
    return folder_schema_response

@router.put("/folders/{folder_id}", response_model=FolderSchema, tags=["Folders"])
def rename_folder(folder_id: str, folder_update: FolderUpdateSchema, db: Session = Depends(get_db)):
    db_folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder_id == "all":
         raise HTTPException(status_code=400, detail="Cannot rename the root 'All Transcriptions' view.")
    if folder_update.name:
        db_folder.name = folder_update.name
    db_folder.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_folder)
    updated_folder_node = FolderSchema.model_validate(db_folder)
    updated_folder_node.count = db.query(func.count(Transcription.id)).filter(Transcription.folder_id == folder_id).scalar()
    return updated_folder_node

@router.delete("/folders/{folder_id}", status_code=204, tags=["Folders"])
def delete_folder_endpoint(folder_id: str, db: Session = Depends(get_db)):
    db_folder = db.query(Folder).options(selectinload(Folder.children), selectinload(Folder.transcriptions)).filter(Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder_id == "all":
         raise HTTPException(status_code=400, detail="Cannot delete the root 'All Transcriptions' view.")
    if db_folder.children:
        raise HTTPException(status_code=400, detail="Cannot delete folder: it has subfolders.")
    if db_folder.transcriptions:
        raise HTTPException(status_code=400, detail="Cannot delete folder: it contains transcriptions.")
    db.delete(db_folder)
    db.commit()
    return None

# Transcription Endpoints
@router.post("/transcriptions/upload-process", response_model=ProcessedTranscriptionReviewDataSchema, tags=["Transcriptions"])
async def upload_and_process_transcription(
    metadata: TranscriptionProcessMetadataSchema = Body(...),
    db: Session = Depends(get_db)
):
    processing_time_sec = (len(metadata.session_title or "") + len(metadata.keywords or "")) % 120 + 60
    topic_names_csv_str = ",".join(topic.strip() for topic in metadata.primary_topic_names if topic.strip()) if metadata.primary_topic_names else None

    db_transcription = Transcription(
        session_title=metadata.session_title or "Untitled Session",
        status=TranscriptionStatusEnum.PROCESSING,
        source_file_name="mock_file.mp4",
        processing_time_seconds=processing_time_sec,
        topic_names_csv=topic_names_csv_str,
        uploaded_at=datetime.utcnow()
    )
    db_session_detail = SessionDetail(purpose=metadata.session_purpose)
    db_transcription.session_detail = db_session_detail

    generated_quiz_text = None
    if metadata.generate_quiz:
        generated_quiz_text = f"### Quiz for {db_transcription.session_title}\n\n1. What was the main purpose of this session?"
        db_quiz = Quiz(quiz_content=generated_quiz_text)
        db_transcription.quiz = db_quiz

    db.add(db_transcription)
    
    generated_content = f"### {db_transcription.session_title}\n\nSession Purpose: {metadata.session_purpose}\nTopics: {topic_names_csv_str or 'N/A'}\n\n"
    if metadata.keywords:
        generated_content += f"Keywords mentioned: {metadata.keywords.replace(chr(10), ', ')}\n\n"
    generated_content += "This is a mock transcription based on the provided metadata from backend."
    
    db_transcription.cleaned_transcript_text = generated_content
    db_transcription.status = TranscriptionStatusEnum.DRAFT
    db_transcription.processed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_transcription)

    response_data = ProcessedTranscriptionReviewDataSchema(
        transcription_id=db_transcription.id,
        session_info={
            "title": db_transcription.session_title,
            "purpose": metadata.session_purpose,
            "domain": topic_names_csv_str or "N/A",
            "processingTime": f"{processing_time_sec // 60} minutes {processing_time_sec % 60} seconds"
        },
        cleaned_transcription=db_transcription.cleaned_transcript_text,
        generated_quiz=generated_quiz_text,
        knowledge_base_integration={
            "suggestionText": f"This content seems related to '{metadata.primary_topic_names[0] if metadata.primary_topic_names else 'General Topics'}'. Consider placing it there.",
            "proposedLocation": (metadata.primary_topic_names[:1] if metadata.primary_topic_names else ["General"]) + [db_transcription.session_title]
        }
    )
    return response_data

def _update_transcription_fields(db_transcription: Transcription, data: TranscriptionUpdateSchema, db: Session):
    if data.session_title is not None: db_transcription.session_title = data.session_title
    if data.highlights is not None: db_transcription.highlights = data.highlights
    if data.status is not None: db_transcription.status = data.status
    if data.cleaned_transcript_text is not None:
        db_transcription.cleaned_transcript_text = data.cleaned_transcript_text
    if data.processing_time_seconds is not None:
        db_transcription.processing_time_seconds = data.processing_time_seconds
    if data.topic_names is not None:
        db_transcription.topic_names_csv = ",".join(
            topic.strip() for topic in data.topic_names if topic.strip()
        ) if data.topic_names else None
    
    if data.session_purpose is not None or data.session_purpose_content is not None:
        if not db_transcription.session_detail:
            db_transcription.session_detail = SessionDetail(transcription_id=db_transcription.id)
        if data.session_purpose is not None:
            db_transcription.session_detail.purpose = data.session_purpose
        if data.session_purpose_content is not None:
            db_transcription.session_detail.content = data.session_purpose_content
            
    if data.quiz_content is not None:
        if not db_transcription.quiz:
            db_transcription.quiz = Quiz(transcription_id=db_transcription.id)
        db_transcription.quiz.quiz_content = data.quiz_content
    
    if data.integrated_at is not None: db_transcription.integrated_at = data.integrated_at
    db_transcription.updated_at = datetime.utcnow()


@router.put("/transcriptions/{transcription_id}/save-draft", response_model=TranscriptionSchema, tags=["Transcriptions"])
def save_transcription_as_draft(
    transcription_id: int,
    data: TranscriptionUpdateSchema,
    db: Session = Depends(get_db)
):
    db_transcription = db.query(Transcription).options(
        joinedload(Transcription.quiz), 
        joinedload(Transcription.session_detail)
    ).filter(Transcription.id == transcription_id).first()
    if not db_transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    _update_transcription_fields(db_transcription, data, db)
    db_transcription.status = TranscriptionStatusEnum.DRAFT

    if data.folder_id is not None:
        target_folder = db.query(Folder).filter(Folder.id == data.folder_id).first()
        if not target_folder:
            raise HTTPException(status_code=404, detail=f"Draft folder with ID {data.folder_id} not found.")
        db_transcription.folder_id = data.folder_id
    
    db.commit()
    db.refresh(db_transcription)
    if db_transcription.quiz: db.refresh(db_transcription.quiz)
    if db_transcription.session_detail: db.refresh(db_transcription.session_detail)
    
    return TranscriptionSchema.model_validate(db_transcription)


@router.put("/transcriptions/{transcription_id}/finalize-integration", response_model=Dict[str, Any], tags=["Transcriptions"])
def finalize_transcription_integration(
    transcription_id: int,
    target_folder_id: str = Body(..., embed=True),
    updated_data: Optional[TranscriptionUpdateSchema] = Body(None),
    db: Session = Depends(get_db)
):
    db_transcription = db.query(Transcription).options(
        joinedload(Transcription.quiz), 
        joinedload(Transcription.session_detail)
    ).filter(Transcription.id == transcription_id).first()
    if not db_transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    target_folder = db.query(Folder).filter(Folder.id == target_folder_id).first()
    if not target_folder:
        raise HTTPException(status_code=404, detail=f"Target folder {target_folder_id} not found.")

    if updated_data:
        _update_transcription_fields(db_transcription, updated_data, db)

    db_transcription.folder_id = target_folder_id
    db_transcription.status = TranscriptionStatusEnum.INTEGRATED
    db_transcription.integrated_at = datetime.utcnow()

    message = f"Content integrated and saved to '{target_folder.name}'."
    
    if uuid.uuid4().int % 10 < 3:
        mock_anomaly_type = list(AnomalyTypeEnum.ALL_VALUES)[uuid.uuid4().int % len(AnomalyTypeEnum.ALL_VALUES)]
        conflict = Conflict(
            new_transcription_id=db_transcription.id,
            existing_transcription_id=f"KB_DOC_RANDOM_{uuid.uuid4().int % 1000}",
            new_content_snippet=(db_transcription.cleaned_transcript_text or "")[:100] + "...",
            existing_content_snippet="Some pre-existing content in the knowledge base that might conflict...",
            anomaly_type=mock_anomaly_type,
            status=ConflictStatusEnum.PENDING,
        )
        db.add(conflict)
        message = f"Content integrated into '{target_folder.name}'. A potential conflict was flagged for admin review."
    
    db.commit()
    return {"success": True, "message": message, "transcription_id": db_transcription.id}


@router.get("/repository", response_model=RepositoryDataSchema, tags=["Repository"])
def get_repository_data(
    folder_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("integrated_at"), # Defaulting to integrated_at as per new req.
    sort_order: Optional[str] = Query("desc"),
    purpose_filters: Optional[str] = Query(None), # New purpose filter
    db: Session = Depends(get_db)
):
    folders_tree = build_folder_tree(db, None)
    
    trans_query = db.query(Transcription).options(
        joinedload(Transcription.folder),
        joinedload(Transcription.quiz),
        joinedload(Transcription.session_detail) # Ensure session_detail is loaded for purpose filtering
    )

    # --- Always filter for INTEGRATED status for this repository view ---
    trans_query = trans_query.filter(Transcription.status == TranscriptionStatusEnum.INTEGRATED)
    
    if folder_id and folder_id != "all":
        trans_query = trans_query.filter(Transcription.folder_id == folder_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        # Ensure SessionDetail.content is also searchable if relevant for purpose
        trans_query = trans_query.filter(
            (func.lower(Transcription.session_title).like(search_term)) |
            (func.lower(Transcription.cleaned_transcript_text).like(search_term)) |
            (func.lower(Transcription.topic_names_csv).like(search_term)) |
            ( # Search within session purpose content as well
                Transcription.session_detail.has(func.lower(SessionDetail.content).like(search_term))
            )
        )

    if purpose_filters:
        purposes = [p.strip() for p in purpose_filters.split(',') if p.strip()]
        if purposes:
            trans_query = trans_query.join(Transcription.session_detail).filter(SessionDetail.purpose.in_(purposes))

    # Validate sort_by attribute to prevent errors, default to integrated_at
    valid_sort_attributes = [
        "session_title", "processed_at", "uploaded_at", 
        "integrated_at", "updated_at"
    ]
    if sort_by == "session_purpose":
        if not any(isinstance(opt, joinedload) and opt.path.key == 'session_detail' for opt in trans_query._with_options):
            if not any(target.table == SessionDetail.__table__ for target in trans_query._setup_joins):
                 trans_query = trans_query.outerjoin(Transcription.session_detail) # Use outerjoin if purpose can be null

        sort_attr = SessionDetail.purpose
    elif sort_by in valid_sort_attributes and hasattr(Transcription, sort_by):
        sort_attr = getattr(Transcription, sort_by)
    else: # Default if invalid attribute is passed
        sort_attr = Transcription.integrated_at
    
    if sort_order == "asc":
        trans_query = trans_query.order_by(sort_attr.asc())
    else:
        trans_query = trans_query.order_by(sort_attr.desc())
    
    all_transcriptions_db = trans_query.all()
    transcriptions_schema_list = [TranscriptionSchema.model_validate(t) for t in all_transcriptions_db]
    
    return RepositoryDataSchema(folders=folders_tree, transcriptions=transcriptions_schema_list)

@router.delete("/transcriptions/{transcription_id}", status_code=204, tags=["Transcriptions"])
def delete_transcription(transcription_id: int, db: Session = Depends(get_db)):
    db_transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
    if not db_transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    db.delete(db_transcription)
    db.commit()
    return None

# Admin/Conflict Endpoints
@router.get("/admin/conflicts", response_model=AdminConflictsResponseSchema, tags=["Admin Conflicts"])
def get_admin_conflicts(db: Session = Depends(get_db)):
    conflicts_db = db.query(Conflict).options(joinedload(Conflict.new_transcription_obj)).order_by(Conflict.flagged_at.desc()).all()
    
    conflict_schemas = []
    for c_db in conflicts_db:
        c_schema = ConflictSchema.model_validate(c_db)
        if c_db.new_transcription_obj:
            c_schema.new_transcription_title = c_db.new_transcription_obj.session_title
        conflict_schemas.append(c_schema)

    # Calculate stats
    pending_count = 0
    resolved_count = 0
    rejected_count = 0

    for conflict_item in conflicts_db: # Iterate over the raw DB objects for accurate status check
        if conflict_item.status == ConflictStatusEnum.PENDING:
            pending_count += 1
        # Check for strings starting with "Resolved" or "Rejected"
        elif conflict_item.status and conflict_item.status.startswith(ConflictStatusEnum.RESOLVED_MERGED.split(" ")[0]): # "Resolved"
            resolved_count += 1
        elif conflict_item.status and conflict_item.status.startswith(ConflictStatusEnum.REJECTED.split(" ")[0]): # "Rejected"
            rejected_count += 1
    
    total_count = len(conflicts_db)

    stats_data = AdminDashboardStatsSchema(
        pending=pending_count,
        resolved=resolved_count,
        rejected=rejected_count,
        total=total_count
    )
    
    return AdminConflictsResponseSchema(conflicts=conflict_schemas, stats=stats_data)

@router.get("/admin/conflicts/{conflict_id}/detail", response_model=ConflictDetailSchema, tags=["Admin Conflicts"])
def get_conflict_detail(conflict_id: int, db: Session = Depends(get_db)):
    conflict_db = db.query(Conflict).options(
        joinedload(Conflict.new_transcription_obj)
    ).filter(Conflict.id == conflict_id).first()
    if not conflict_db:
        raise HTTPException(status_code=404, detail="Conflict not found")

    return ConflictDetailSchema(
        id=conflict_db.id,
        status=conflict_db.status,
        path_left=["KB Document", conflict_db.existing_transcription_id],
        path_right=["Transcription", conflict_db.new_transcription_obj.session_title if conflict_db.new_transcription_obj else "Unknown Transcription"],
        existing_content=conflict_db.existing_content_snippet,
        incoming_content=conflict_db.new_content_snippet,
        resolution_content=conflict_db.resolution_content
    )

@router.put("/admin/conflicts/{conflict_id}/resolve", response_model=ConflictSchema, tags=["Admin Conflicts"])
def resolve_conflict_endpoint(
    conflict_id: int, 
    update_data: ConflictUpdateSchema,
    db: Session = Depends(get_db)
):
    conflict_db = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict_db:
        raise HTTPException(status_code=404, detail="Conflict not found")

    if update_data.status:
        conflict_db.status = update_data.status
    # If only notes are provided, and status isn't explicitly set to something else,
    # assume it's being resolved.
    elif update_data.resolution_content is not None and conflict_db.status == ConflictStatusEnum.PENDING:
        conflict_db.status = ConflictStatusEnum.RESOLVED_MERGED
      
    if update_data.resolution_content is not None:
        conflict_db.resolution_content = update_data.resolution_content
        
    conflict_db.resolved_at = datetime.utcnow()
    
    db.commit()
    # db.refresh(conflict_db) # Refresh before accessing related for response
    
    # Reload with joinedload to ensure new_transcription_obj is available for the response
    reloaded_conflict = db.query(Conflict).options(joinedload(Conflict.new_transcription_obj)).filter(Conflict.id == conflict_id).first()
    if not reloaded_conflict: # Should not happen if previous steps were successful
        raise HTTPException(status_code=500, detail="Failed to reload conflict after update.")

    c_schema = ConflictSchema.model_validate(reloaded_conflict)
    if reloaded_conflict.new_transcription_obj: # new_transcription_obj should be loaded
            c_schema.new_transcription_title = reloaded_conflict.new_transcription_obj.session_title
    return c_schema