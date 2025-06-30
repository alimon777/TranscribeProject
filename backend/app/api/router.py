from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.encoders import jsonable_encoder
from sqlalchemy import (
    JSON, asc, create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, desc, func, event, or_
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
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    children = relationship("Folder", backref="parent", cascade="all, delete-orphan", remote_side=[id], single_parent=True)
    transcriptions = relationship("Transcription", back_populates="folder")
class Quiz(Base):
    __tablename__ = "quiz"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False)
    quiz_content = Column(Text, nullable=True)
    transcription = relationship("Transcription", back_populates="quiz")
class SessionDetail(Base):
    __tablename__ = "session_details"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False)
    provison_content = Column(String(255), nullable=True)
    transcription = relationship("Transcription", back_populates="session_detail")
class Transcription(Base):
    __tablename__ = "transcriptions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    source_file_name = Column(String(500), nullable=True)
    highlights = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default=TranscriptionStatusEnum.PROCESSING)
    transcript= Column(Text, nullable=True)
    key_topics = Column(JSON, nullable=True)
    uploaded_date = Column(DateTime, default=func.now())
    updated_date = Column(DateTime, default=func.now(), onupdate=func.now())
    purpose = Column(String(255), nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    folder = relationship("Folder", back_populates="transcriptions")
    quiz = relationship("Quiz", back_populates="transcription", uselist=False)
    session_detail = relationship("SessionDetail", back_populates="transcription", uselist=False)
class Conflict(Base):
    __tablename__ = "conflicts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    new_transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False)
    existing_transcription_id = Column(String(255), nullable=False)
    new_content_snippet = Column(Text, nullable=True)
    existing_content_snippet = Column(Text, nullable=True)
    anomaly_type = Column(String(100), nullable=False)
    status = Column(String(100), nullable=False, default=ConflictStatusEnum.PENDING)
    updated_date = Column(DateTime, default=func.now())
    resolution_content = Column(Text, nullable=True)

# --- DB Dependency and Event Listeners (Unchanged) ---
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: str

class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    children: List["FolderResponse"] = Field(default_factory=list)

    class Config:
        orm_mode = True
FolderResponse.model_rebuild()

class TranscriptionResponse(BaseModel):
    id: int
    title: str
    source_file_name: Optional[str]
    highlights: Optional[str]
    status: str
    transcript: Optional[str]
    key_topics: Optional[List[str]]
    uploaded_date: datetime
    updated_date: datetime
    purpose: Optional[str]
    folder_id: Optional[int]

    class Config:
        orm_mode = True

class FullTranscriptionResponse(BaseModel):
    id: int
    title: str
    source_file_name: Optional[str]
    highlights: Optional[str]
    status: str
    transcript: Optional[str]
    key_topics: Optional[List[str]]
    uploaded_date: datetime
    updated_date: datetime
    purpose: Optional[str]
    folder_id: Optional[int]

    # Extra fields added in the route
    folder_path: Optional[str]
    quiz_content: Optional[str]
    provision_content: Optional[str]

    class Config:
        orm_mode = True

class FinalizeIntegrationRequest(BaseModel):
    transcript: Optional[str] = None
    quiz_content: Optional[str] = None
    provison_content: Optional[str] = None
    highlights: Optional[str] = None
    folder_id: Optional[int] = None
    status: Optional[str] = None

class QuizResponse(BaseModel):
    id: int
    transcription_id: int
    quiz_content: Optional[str]

    class Config:
        orm_mode = True

class SessionDetailResponse(BaseModel):
    id: int
    transcription_id: int
    provison_content: Optional[str]

    class Config:
        orm_mode = True

class ConflictResponse(BaseModel):
    id: int
    new_transcription_id: int
    existing_transcription_id: str
    new_content_snippet: Optional[str]
    existing_content_snippet: Optional[str]
    anomaly_type: str
    status: str
    updated_date: datetime
    resolution_content: Optional[str]

    class Config:
        orm_mode = True

class ConflictUpdate(BaseModel):
    resolution_content: str

def build_tree(folders: List[Folder], parent_id=None) -> List[FolderResponse]:
    tree = []
    for folder in folders:
        if folder.parent_id == parent_id:
            children = build_tree(folders, folder.id)
            folder_response = FolderResponse(
                id=folder.id,
                name=folder.name,
                parent_id=folder.parent_id,
                updated_at=folder.updated_at,
                children=children
            )
            tree.append(folder_response)
    return tree

def build_folder_path(folder: Folder, db: Session) -> str:
    parts = []
    current = folder
    while current:
        parts.insert(0, current.name)
        current = db.query(Folder).get(current.parent_id) if current.parent_id else None
    return "/".join(parts)

@router.get("/folders/tree", response_model=List[FolderResponse])
def get_folder_tree(db: Session = Depends(get_db)):
    all_folders = db.query(Folder).all()
    return build_tree(all_folders)

@router.post("/folders", response_model=FolderResponse)
def create_folder(folder_data: FolderCreate, db: Session = Depends(get_db)):
    new_folder = Folder(name=folder_data.name, parent_id=folder_data.parent_id)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    return FolderResponse(
        id=new_folder.id,
        name=new_folder.name,
        parent_id=new_folder.parent_id,
        children=[] 
    )

@router.put("/folders/{folder_id}", response_model=FolderResponse)
def rename_folder(folder_id: int, folder_data: FolderUpdate, db: Session = Depends(get_db)):
    folder = db.query(Folder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.name = folder_data.name
    db.commit()
    db.refresh(folder)
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        updated_at=folder.updated_at,
        children=[]
    )

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(Folder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db.delete(folder)
    db.commit()
    return {"detail": "Folder deleted"}


@router.get("/transcriptions/pending-reviews", response_model=List[TranscriptionResponse])
def get_pending_reviews(db: Session = Depends(get_db)):
    pendings = db.query(Transcription).filter(Transcription.status == TranscriptionStatusEnum.PROCESSING)
    return pendings

@router.get("/transcriptions/review-history", response_model=List[TranscriptionResponse])
def get_review_history(db: Session = Depends(get_db)):
    latest_three = (
    db.query(Transcription)
    .filter(Transcription.status == TranscriptionStatusEnum.INTEGRATED)
    .order_by(desc(Transcription.updated_date))
    .limit(3)
    .all()
    )
    return latest_three

# @router.get("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
# def get_transcription_details(transcription_id: int, db: Session = Depends(get_db)):
#     return db.query(Transcription).filter(Transcription.id == transcription_id).first()

# @router.put("/transcriptions/{transcription_id}/save-draft")
# def save_transcription_draft(transcription_id: int, update_data: FinalizeIntegrationRequest, db: Session = Depends(get_db)):

@router.put("/transcriptions/{transcription_id}/finalize-integration")
def finalize_transcription_integration(
    transcription_id: int,
    data: FinalizeIntegrationRequest,
    db: Session = Depends(get_db),
):
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    if data:
        transcription.transcript = data.transcript
        transcription.highlights = data.highlights
        quiz = db.query(Quiz).filter(Quiz.transcription_id == transcription_id).first()
        if quiz:
            quiz.quiz_content = data.quiz_content
        sessiondetail = db.query(SessionDetail).filter(SessionDetail.transcription_id == transcription_id).first()
        if sessiondetail:
            sessiondetail.provison_content = data.provison_content
        if(data.status == TranscriptionStatusEnum.INTEGRATED):
            folder = db.query(Folder).get(data.folder_id)
            if not folder:
                raise HTTPException(status_code=404, detail="Target folder not found")
            transcription.folder_id = folder.id
        transcription.status = data.status

    db.commit()
    db.refresh(transcription)
    if quiz:
        db.refresh(quiz)
    if sessiondetail:
        db.refresh(sessiondetail)
    return {
        "message": "Transcription updated successfully and status changed",
        "transcription_id": transcription.id,
        "folder_id": transcription.folder_id,
    }
    

@router.delete("/transcriptions/{transcription_id}")
def delete_transcription(transcription_id: int, db: Session = Depends(get_db)):
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    db.delete(transcription)
    db.commit()

    return {"message": f"Transcription {transcription_id} deleted successfully"}

# @router.get("/admin/conflicts", response_model=List[ConflictResponse])
# def get_conflicts(db: Session = Depends(get_db)):
#     return db.query(Conflict).all()

# @router.get("/admin/conflicts/{conflict_id}/detail", response_model=ConflictDetailResponse)
# def get_conflict_detail(conflict_id: int, db: Session = Depends(get_db)):
#     ...

# @router.put("/admin/conflicts/{conflict_id}/resolve")
# def resolve_conflict(conflict_id: int, update_data: ConflictUpdate, db: Session = Depends(get_db)):
#     ...

@router.get("/repository", response_model=List[FullTranscriptionResponse])
def get_transcriptions(
    folder_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("updated_at"),
    sort_order: str = Query("desc"),
    purpose_filters: Optional[str] = Query(None),  # comma-separated
    db: Session = Depends(get_db),
):
    query = db.query(Transcription).options(
        joinedload(Transcription.folder),
        joinedload(Transcription.quiz),
        joinedload(Transcription.session_detail)
    )

    if folder_id is not None:
        query = query.filter(Transcription.folder_id == folder_id)

    if search:
        lowered = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Transcription.title).like(lowered),
                func.lower(Transcription.transcript).like(lowered),
                func.lower(Transcription.key_topics).like(lowered),
                Transcription.session_detail.has(
                    func.lower(SessionDetail.provison_content).like(lowered)
                )
            )
        )

    if purpose_filters:
        purposes = [p.strip() for p in purpose_filters.split(",") if p.strip()]
        if purposes:
            query = query.filter(
                Transcription.purpose.in_(purposes)
            )

    # Sorting map
    sort_map = {
        "title": Transcription.title,
        "uploaded_date": Transcription.uploaded_date,
        "updated_date": Transcription.updated_date,
        "session_purpose": Transcription.purpose,
    }
    sort_column = sort_map.get(sort_by, Transcription.updated_date)

    # Join session_detail for sorting if needed
    if sort_by == "session_purpose":
        query = query.outerjoin(Transcription.session_detail)

    query = query.order_by(
        asc(sort_column) if sort_order == "asc" else desc(sort_column)
    )

    transcriptions = query.all()
    response = []

    for t in transcriptions:
        folder_path = build_folder_path(t.folder, db) if t.folder else ""
        response.append({
            "id": t.id,
            "title": t.title,
            "transcript": t.transcript,
            "status": t.status,
            "uploaded_date": t.uploaded_date,
            "updated_date": t.updated_date,
            "purpose": t.purpose,
            "highlights": t.highlights,
            "key_topics": t.key_topics,
            "folder_id": t.folder_id,
            "folder_path": folder_path,
            "quiz_content": t.quiz.quiz_content if t.quiz else None,
            "source_file_name": t.source_file_name,
            "provision_content": t.session_detail.provison_content if t.session_detail else None,
        })

    return response

@router.post("/create/transcribe")
def create_transcription(title: str, purpose: str, key_topics: str, source: str):
    db: Session = SessionLocal()
    try:
        key_topics_list = [topic.strip() for topic in key_topics.split(',') if topic.strip()]
        transcription = Transcription(
            title=title,
            purpose=purpose,
            key_topics=key_topics_list,
            transcript=None,
            highlights=None,
            status=TranscriptionStatusEnum.PROCESSING,
            source_file_name=source,
        )
        db.add(transcription)
        db.flush()
        db.commit()
        return {"message": "Transcription created", "id": transcription.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.post("/update/transcription")
def update_transcription(transcription_id: int, transcription_text: str, highlights: str):
    db: Session = SessionLocal()
    try:
        transcription = db.query(Transcription).get(transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
    
        transcription.transcript = transcription_text
        transcription.highlights = highlights
        db.commit()
        db.refresh(transcription)
        return {"message": "Transcription updated", "id": transcription_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/transcriptions/{transcription_id}", response_model=FullTranscriptionResponse)
async def get_transcription(transcription_id: int):
    db: Session = SessionLocal()
    try:
        transcription = db.query(Transcription).get(transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")

        # Safely fetch related data
        folder = db.query(Folder).get(transcription.folder_id) if transcription.folder_id else None
        quiz = db.query(Quiz).filter(Quiz.transcription_id == transcription.id).first()
        session_detail = db.query(SessionDetail).filter(SessionDetail.transcription_id == transcription.id).first()

        # Convert transcription to dict and add extra fields
        transcription_data = jsonable_encoder(transcription)
        transcription_data["folder_path"] = build_folder_path(folder, db) if folder else None
        transcription_data["quiz_content"] = quiz.quiz_content if quiz else None
        transcription_data["provision_content"] = session_detail.provison_content if session_detail else None

        return transcription_data

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# @router.put("/reloacte/transcription")
# def relocate_transcription(data: dict = Body(...)):
#     ...