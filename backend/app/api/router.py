from fastapi import APIRouter, HTTPException
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, func
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime
from core.config import settings

DATABASE_URL =  settings.DATABASE_URL 

Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

router = APIRouter()

# Models

class Quiz(Base):
    __tablename__ = "quiz"
    id = Column(Integer, primary_key=True, index=True)
    quiz_content = Column(Text)
    answers = Column(Text)
    transcription_id = Column(Integer)


class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String(500))
    transcription_id = Column(Integer)


class Transcription(Base):
    __tablename__ = "transcriptions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    purpose = Column(String(255))
    key_topics = Column(Text)
    date_created = Column(DateTime, default=func.now())
    date_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    transcription = Column(Text)
    history = Column(Text)
    quiz_id = Column(Integer, ForeignKey("quiz.id"))
    provision_content = Column(Text)
    path_id = Column(Integer, ForeignKey("folders.id"))
    status = Column(String(50))


class Conflict(Base):
    __tablename__ = "conflicts"
    id = Column(Integer, primary_key=True, index=True)
    newly_generated_content = Column(Integer, ForeignKey("transcriptions.id"))  # transcription id1
    existing_content = Column(Integer, ForeignKey("transcriptions.id"))       # transcription id2
    content_1 = Column(Text)
    content_2 = Column(Text)
    date_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    status = Column(String(50), default="Pending Review")
    anomaly = Column(String(255))


@router.on_event("startup")
async def startup():
    # 1. Create tables if not exist
    Base.metadata.create_all(bind=engine)



# Create Transcription with new Quiz and Folder
@router.post("/transcription", tags=["Transcription"])
def create_transcription(title: str, purpose: str, key_topics: str):
    db: Session = SessionLocal()
    try:
        # Step 1: Create quiz
        quiz = Quiz(quiz_content="", answers="", transcription_id=None)
        db.add(quiz)
        db.flush()  # Get quiz.id

        # Step 2: Create folder
        folder = Folder(path="", transcription_id=None)
        db.add(folder)
        db.flush()  # Get folder.id

        # Step 3: Create transcription
        transcription = Transcription(
            title=title,
            purpose=purpose,
            key_topics=key_topics,
            transcription=None,
            history=None,
            provision_content=None,
            quiz_id=quiz.id,
            path_id=folder.id,
            status="Processing"
        )
        db.add(transcription)
        db.flush()

        quiz.transcription_id = transcription.id
        folder.transcription_id = transcription.id

        db.commit()
        return {"message": "Transcription created", "id": transcription.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# Update Transcription: transcription and history only
@router.put("/transcription/{transcription_id}", tags=["Transcription"])
def update_transcription(transcription_id: int, transcription_text: str, history: str):
    db: Session = SessionLocal()
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        db.close()
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    transcription.transcription = transcription_text
    transcription.history = history
    db.commit()
    db.refresh(transcription)
    db.close()
    return {"message": "Transcription updated", "id": transcription_id}


# Update Quiz
@router.put("/quiz/{quiz_id}", tags=["Quiz"])
def update_quiz(quiz_id: int, quiz_content: str, answers: str, transcription_id: int):
    db: Session = SessionLocal()
    quiz = db.query(Quiz).get(quiz_id)
    if not quiz:
        db.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz.quiz_content = quiz_content
    quiz.answers = answers
    quiz.transcription_id = transcription_id
    db.commit()
    db.refresh(quiz)
    db.close()
    return {"message": "Quiz updated", "id": quiz_id}


# Update Folder (Path)
@router.put("/folder/{folder_id}", tags=["Folder"])
def update_path(folder_id: int, path: str, transcription_id: int):
    db: Session = SessionLocal()
    folder = db.query(Folder).get(folder_id)
    if not folder:
        db.close()
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.path = path
    folder.transcription_id = transcription_id
    db.commit()
    db.refresh(folder)
    db.close()
    return {"message": "Path updated", "id": folder_id}


# Create Conflict
@router.post("/conflict", tags=["Conflict"])
def create_conflict(id1: int, id2: int, content_1: str, content_2: str, anomaly: str = ""):
    db: Session = SessionLocal()
    conflict = Conflict(
        newly_generated_content=id1,
        existing_content=id2,
        content_1=content_1,
        content_2=content_2,
        status="Pending Review",
        anomaly=anomaly
    )
    db.add(conflict)
    db.commit()
    db.refresh(conflict)
    db.close()
    return {"message": "Conflict logged", "conflict_id": conflict.id}


# Fetch Quiz
@router.get("/quiz/{quiz_id}", tags=["Quiz"])
def get_quiz(quiz_id: int):
    db: Session = SessionLocal()
    quiz = db.query(Quiz).get(quiz_id)
    if not quiz:
        db.close()
        raise HTTPException(status_code=404, detail="Quiz not found")
    result = {
        "id": quiz.id,
        "quiz_content": quiz.quiz_content,
        "answers": quiz.answers,
        "transcription_id": quiz.transcription_id
    }
    db.close()
    return result


# Fetch Folder Path
@router.get("/folder/{folder_id}", tags=["Folder"])
def get_folder(folder_id: int):
    db: Session = SessionLocal()
    folder = db.query(Folder).get(folder_id)
    if not folder:
        db.close()
        raise HTTPException(status_code=404, detail="Folder not found")
    result = {
        "id": folder.id,
        "path": folder.path,
        "transcription_id": folder.transcription_id
    }
    db.close()
    return result

@router.put("/transcription/{transcription_id}/provision", tags=["Transcription"])
def update_provision_content(transcription_id: int, provision_content: str):
    db: Session = SessionLocal()
    transcription = db.query(Transcription).get(transcription_id)
    if not transcription:
        db.close()
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    transcription.provision_content = provision_content
    db.commit()
    db.refresh(transcription)
    db.close()
    return {"message": "Provision content updated", "id": transcription_id}

@router.put("/conflict/{conflict_id}", tags=["Conflict"])
def update_conflict(conflict_id: int, status: str):
    db: Session = SessionLocal()
    conflict = db.query(Conflict).get(conflict_id)
    if not conflict:
        db.close()
        raise HTTPException(status_code=404, detail="Conflict not found")
    
    conflict.status = status
    db.commit()
    db.refresh(conflict)
    db.close()
    return {"message": "Conflict updated", "id": conflict_id}
