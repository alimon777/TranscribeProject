import json
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.encoders import jsonable_encoder
from sqlalchemy import (
    JSON, asc, case, create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, desc, func, or_
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship, joinedload
from core.config import settings
from datetime import datetime
from typing import List, Optional, Dict

from pydantic import BaseModel, Field
from services.chains import conflict_chain
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import util
from typing import List, Dict, Tuple
from langchain_openai import AzureOpenAIEmbeddings

azure_embedding_model = AzureOpenAIEmbeddings(
        model=settings.AZURE_OPENAI_EMBED_MODEL,
        api_key=settings.AZURE_OPENAI_EMBED_API_KEY,
        azure_endpoint=settings.AZURE_OPENAI_EMBED_API_ENDPOINT,
        api_version=settings.AZURE_OPENAI_EMBED_VERSION,
    )

# --- Enums (Unchanged) ---
class SessionPurposeEnum:
    GENERAL_WALKTHROUGH = "General Walkthrough/Overview"; REQUIREMENTS_GATHERING = "Requirements Gathering"; TECHNICAL_DEEP_DIVE = "Technical Deep Dive"; MEETING_MINUTES = "Meeting Minutes"; TRAINING_SESSION = "Training Session"; PRODUCT_DEMO = "Product Demo"
    ALL_VALUES = [v for k, v in vars().items() if not k.startswith('_') and k != "ALL_VALUES"]
class TranscriptionStatusEnum:
    DRAFT = "Draft"; INTEGRATED = "Integrated"; PROCESSING = "Processing"; ERROR = "Error"; AWAITING = "Awaiting Approval"
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
    question = Column(Text, nullable=False)
    choices = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False) 
    transcription = relationship("Transcription", back_populates="quiz")
class SessionDetail(Base):
    __tablename__ = "session_details"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transcription_id = Column(Integer, ForeignKey("transcriptions.id", ondelete="CASCADE"), nullable=False)
    provision_content = Column(LONGTEXT, nullable=True)
    transcription = relationship("Transcription", back_populates="session_detail")
class Transcription(Base):
    __tablename__ = "transcriptions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    source_file_name = Column(String(500), nullable=True)
    highlights = Column(LONGTEXT, nullable=True)
    status = Column(String(50), nullable=False, default=TranscriptionStatusEnum.PROCESSING)
    transcript= Column(LONGTEXT, nullable=True)
    key_topics = Column(JSON, nullable=True)
    uploaded_date = Column(DateTime, default=func.now())
    updated_date = Column(DateTime, default=func.now(), onupdate=func.now())
    purpose = Column(String(255), nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    folder = relationship("Folder", back_populates="transcriptions")
    quiz = relationship("Quiz", back_populates="transcription", cascade="all, delete-orphan")
    session_detail = relationship("SessionDetail", back_populates="transcription", uselist=False, cascade="all, delete-orphan")
    conflicts = relationship("Conflict", back_populates="transcription", cascade="all, delete-orphan")
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
    transcription = relationship(
        "Transcription",
        back_populates="conflicts",
        foreign_keys=[new_transcription_id]
    )

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

class QuizItem(BaseModel):
    question: str
    choices: List[str]
    correct_answer: str

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

    folder_path: Optional[str]
    quiz_content: List[QuizItem]
    provision_content: Optional[Dict[str, Optional[str]]]

    class Config:
        orm_mode = True

class FinalizeIntegrationRequest(BaseModel):
    transcript: Optional[str] = None
    quiz_content: Optional[List[QuizItem]] = None
    provision_content: Optional[Dict[str, str]] = None
    highlights: Optional[str] = None
    folder_id: Optional[int] = None
    status: Optional[str] = None

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
    path_left: Optional[str] = None
    path_right: Optional[str] = None

    class Config:
        from_attributes = True 

class ConflictStats(BaseModel):
    pending: int
    resolved: int
    rejected: int
    total: int
class ConflictListWithStatsResponse(BaseModel):
    conflicts: List[ConflictResponse]
    stats: ConflictStats

class ConflictUpdate(BaseModel):
    status: str
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

def calculate_conflict_stats(conflicts: list[Conflict]):
    status_counts = {"pending": 0, "resolved": 0, "rejected": 0}
    for conflict in conflicts:
        key = conflict.status.lower()
        if key in status_counts:
            status_counts[key] += 1
    status_counts["total"] = len(conflicts)
    return status_counts

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
    pendings = (
        db.query(Transcription)
        .filter(
            Transcription.status.in_([TranscriptionStatusEnum.PROCESSING, TranscriptionStatusEnum.AWAITING])
        )
        .order_by(
            case(
                (Transcription.status == TranscriptionStatusEnum.AWAITING, 0),
                (Transcription.status == TranscriptionStatusEnum.PROCESSING, 1),
            )
        )
        .all()
    )
    return pendings

@router.get("/transcriptions/review-history", response_model=List[TranscriptionResponse])
def get_review_history(db: Session = Depends(get_db)):
    latest_three = (
    db.query(Transcription)
    .filter(Transcription.status.in_([TranscriptionStatusEnum.INTEGRATED, TranscriptionStatusEnum.DRAFT]))
    .order_by(desc(Transcription.updated_date))
    .limit(3)
    .all()
    )
    return latest_three

@router.put("/transcriptions/{transcription_id}/finalize-integration")
async def finalize_transcription_integration(
    transcription_id: int,
    data: FinalizeIntegrationRequest,
    db: Session = Depends(get_db),
):
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    hasConflicts = False
    if data:
        transcription.transcript = data.transcript
        transcription.highlights = data.highlights
        if data.folder_id:
            other_transcripts = db.query(Transcription).filter(
                Transcription.folder_id == data.folder_id,
                Transcription.id != transcription_id
            ).all()

            for other in other_transcripts:
                if other.transcript and other.transcript.strip() != data.transcript.strip():
                    print("there are other files")
                    conflicting_points = await detect_conflicts(data.transcript, other.transcript) 

                    for point in conflicting_points:
                        conflict = Conflict(
                            new_transcription_id=transcription_id,
                            existing_transcription_id=other.id,
                            new_content_snippet=point.get("new_code"),
                            existing_content_snippet=point.get("existing_code"),
                            anomaly_type=point.get("anomaly"),
                        )
                        db.add(conflict)
                        hasConflicts = True
        if data.quiz_content is not None:
            db.query(Quiz).filter(Quiz.transcription_id == transcription_id).delete()
            for item in data.quiz_content:
                quiz = Quiz(
                    transcription_id=transcription_id,
                    question=item.question,
                    choices=json.dumps(item.choices),
                    correct_answer=item.correct_answer
                )
                db.add(quiz)
        sessiondetail = db.query(SessionDetail).filter(SessionDetail.transcription_id == transcription_id).first()
        if sessiondetail:
            provision_value = next(iter(data.provision_content.values()), "")
            sessiondetail.provision_content = provision_value
        if(data.status == TranscriptionStatusEnum.INTEGRATED):
            folder = db.query(Folder).get(data.folder_id)
            if not folder:
                raise HTTPException(status_code=404, detail="Target folder not found")
            transcription.folder_id = folder.id
        if hasConflicts:
            transcription.status = TranscriptionStatusEnum.ERROR
        else:
            transcription.status = TranscriptionStatusEnum.INTEGRATED

    db.commit()
    db.refresh(transcription)
    return {
        "message": "Transcription updated successfully and status changed",
        "transcription_id": transcription.id,
        "folder_id": transcription.folder_id,
    }
    

@router.delete("/transcriptions/{transcription_id}")
def delete_transcription(transcription_id: int, db: Session = Depends(get_db)):
    print("deletd id for trans", transcription_id)
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    db.delete(transcription)
    db.commit()

    return {"message": f"Transcription {transcription_id} deleted successfully"}

@router.get("/admin/conflicts", response_model=ConflictListWithStatsResponse)
def get_conflicts(db: Session = Depends(get_db)):
    conflicts = db.query(Conflict).all()
    stats = calculate_conflict_stats(conflicts)
    return {"conflicts": [ConflictResponse.model_validate(c) for c in conflicts], "stats": stats}

@router.get("/admin/conflicts/{conflict_id}/detail", response_model=ConflictResponse)
def get_conflict_detail(conflict_id: int, db: Session = Depends(get_db)):
    conflict = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    new_trans = db.query(Transcription).filter(Transcription.id == conflict.new_transcription_id).first()
    existing_trans = db.query(Transcription).filter(Transcription.id == int(conflict.existing_transcription_id)).first()

    def get_path(t: Optional[Transcription]):
        if t and t.folder_id:
            folder = db.query(Folder).get(t.folder_id)
            return build_folder_path(folder, db)
        return ""
    
    resp_dict = conflict.__dict__.copy()
    resp_dict["path_left"] = get_path(existing_trans)
    resp_dict["path_right"] = get_path(new_trans)

    return ConflictResponse.model_validate(resp_dict)

@router.put("/admin/conflicts/{conflict_id}/resolve")
def resolve_conflict(conflict_id: int, update_data: ConflictUpdate, db: Session = Depends(get_db)):
    conflict = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    conflict.status = update_data.status
    conflict.resolution_content = update_data.resolution_content
    conflict.updated_date = func.now()

    db.commit()
    db.refresh(conflict)

    remaining_conflicts = (
        db.query(Conflict)
        .filter(
            Conflict.new_transcription_id == update_data.new_transcription_id,
            Conflict.status != ConflictStatusEnum.RESOLVED_MERGED
        )
        .count()
    )
    if remaining_conflicts == 0:
        transcription = db.query(Transcription).get(update_data.new_transcription_id)
        if transcription:
            transcription.status = TranscriptionStatusEnum.INTEGRATED
            db.commit()
            db.refresh(transcription)

    all_conflicts = db.query(Conflict).all()
    new_stats = calculate_conflict_stats(all_conflicts)

    return {"resolved_conflict": conflict, "newStats": new_stats}

@router.get("/repository", response_model=List[FullTranscriptionResponse])
def get_transcriptions(
    folder_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("updated_at"),
    sort_order: str = Query("desc"),
    purpose_filters: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Transcription).options(
        joinedload(Transcription.folder),
        joinedload(Transcription.quiz),
        joinedload(Transcription.session_detail)
    )
    query = query.filter(Transcription.status == TranscriptionStatusEnum.INTEGRATED)

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
                    func.lower(SessionDetail.provision_content).like(lowered)
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
        transcription_data = jsonable_encoder(t)
        transcription_data["folder_path"] = folder_path
        transcription_data["quiz_content"] = [
            {
                "question": quiz.question,
                "choices": json.loads(quiz.choices),
                "correct_answer": quiz.correct_answer
            }
            for quiz in t.quiz
        ] if t.quiz else []
        transcription_data["provision_content"] = {}
        transcription_data["provision_content"][t.purpose] = t.session_detail.provision_content if t.session_detail else None
        response.append(transcription_data)

    return response

@router.post("/create/transcribe")
def create_transcription(title: str, purpose: str, key_topics: str, source: str):
    db: Session = SessionLocal()
    try:
        key_topics_list = [topic.strip() for topic in key_topics.split(',') if topic.strip()]
        transcription = Transcription(
            title=title or source,
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
        db.refresh(transcription)
        return {"message": "Transcription created", "id": transcription.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.post("/update/transcription")
def update_transcription(transcription_id: int, transcription_text: str, highlights: str, quiz: str, provision: str):
    db: Session = SessionLocal()
    try:
        transcription = db.query(Transcription).get(transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        if transcription_text:
            transcription.transcript = transcription_text
        else:
            transcription.status = TranscriptionStatusEnum.AWAITING
        if highlights:
            transcription.highlights = highlights
        if quiz:
            quiz = db.query(Quiz).filter(Quiz.transcription_id == transcription_id).first()
            if not quiz:
                create_quiz(transcription_id, quiz)
            else:    
                quiz.quiz_content = quiz
        if provision:
            sessiondetail = db.query(SessionDetail).filter(SessionDetail.transcription_id == transcription_id).first()
            if not sessiondetail:
                create_provision(transcription_id, provision)
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
        transcription = db.query(Transcription).options(
            joinedload(Transcription.folder),
            joinedload(Transcription.quiz),
            joinedload(Transcription.session_detail),
        ).get(transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        # Convert transcription to dict and add extra fields
        transcription_data = jsonable_encoder(transcription)
        transcription_data["folder_path"] = build_folder_path(transcription.folder, db) if transcription.folder else None
        transcription_data["quiz_content"] = [
            {
                "question": q.question,
                "choices": json.loads(q.choices),
                "correct_answer": q.correct_answer
            }
            for q in transcription.quiz
        ] if transcription.quiz else []
        transcription_data["provision_content"] = {
            transcription.purpose: transcription.session_detail.provision_content if transcription.session_detail else ""
        }

        return transcription_data

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/reloacte/transcription")
def relocate_transcription(transcription_id: str, folder_id: str,db: Session = Depends(get_db)):
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    transcription.folder_id = folder_id
    db.commit()
    db.refresh(transcription)
    return {"message": f"File: {transcription.title} moved successfully"}

@router.post("/create/quiz")
def create_quiz(transcription_id: str, quiz_content: List[dict]):
    db: Session = SessionLocal()
    try:
        for i in quiz_content:
            quiz = Quiz(
                transcription_id = transcription_id,
                question = i.get("question"),
                choices=json.dumps(i.get("choices")),
                correct_answer = i.get("correct_answer")
            )
            db.add(quiz)
        db.commit()
        db.refresh(quiz)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.post("/create/provision")
def create_provision(transcription_id: str, content: str):
    db: Session = SessionLocal()
    try:
        provision = SessionDetail(
            transcription_id = transcription_id,
            provision_content = content
        )
        db.add(provision)
        db.flush()
        db.commit()
        db.refresh(provision)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

SIMILARITY_THRESHOLD = 0.75

def get_similar_pairs(embeddings_a, embeddings_b, threshold: float) -> List[Tuple[int, int]]:
    cosine_scores = util.cos_sim(embeddings_a, embeddings_b)
    similar_pairs = []
    for i in range(len(embeddings_a)):
        for j in range(len(embeddings_b)):
            if cosine_scores[i][j] >= threshold:
                similar_pairs.append((i, j))
    return similar_pairs

async def detect_conflicts(new, exisiting):
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=200)
        chunks_a = splitter.split_text(new)
        chunks_b = splitter.split_text(exisiting)
        embeddings_a = azure_embedding_model.embed_documents(chunks_a)
        embeddings_b = azure_embedding_model.embed_documents(chunks_b)
        similar_pairs = get_similar_pairs(embeddings_a, embeddings_b, SIMILARITY_THRESHOLD)
        print("the similar pairs we got", similar_pairs)
        all_conflicts = []
        for i, j in similar_pairs:
            try:
                result = await conflict_chain.ainvoke({
                    "facts_a": chunks_a[i],
                    "facts_b": chunks_b[j]
                })
                print(result.get("conflicts"))
                conflicts = result.get("conflicts", [])
                all_conflicts.extend(conflicts)
            except Exception as e:
                print(f"Conflict detection failed for chunk {i}-{j}: {e}")
                continue

        return all_conflicts
    except Exception as e:
        print(f"Conflict detection failed: {e}")
        return []