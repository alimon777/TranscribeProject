import asyncio
import os
import re
import shutil
import tempfile
from fastapi import APIRouter, BackgroundTasks, File, UploadFile, HTTPException, File, Form
from fastapi.responses import JSONResponse
from api.router import create_transcription, update_transcription, get_transcription
from services.transcription_service import convert_video_to_audio, generate_quiz_logic, process_audio_file, split_and_transcribe, generate_cleantranscription


transcribe_router = APIRouter()

def run_pipeline_wrapper(*args, **kwargs):
    asyncio.run(full_transcription_pipeline(*args, **kwargs))

@transcribe_router.post("/upload/transcribe")
async def upload_metadata(
    background_tasks: BackgroundTasks,
    media: UploadFile = File(...),
    sessionTitle: str = Form(...),
    sessionPurpose: str = Form(...),
    primaryTopic: str = Form(...),
    source: str = Form(...),
    keywords: str = Form(...),
    generateQuiz: str = Form(False)):
    try:
        if not media:
            raise HTTPException(status_code=400, detail="No media file provided")

        transcription_message = create_transcription(sessionTitle, sessionPurpose, primaryTopic, source)
        transcription_id = transcription_message["id"]

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(media.filename)[-1]) as temp_file:
            shutil.copyfileobj(media.file, temp_file)
            temp_path = temp_file.name

        # Schedule everything in the background, including format detection
        background_tasks.add_task(
            run_pipeline_wrapper,
            temp_path,
            media.content_type,
            sessionPurpose,
            transcription_id,
            keywords,
            generateQuiz
        )

        return JSONResponse(
            status_code=202,
            content={
                "transcription_id": transcription_id,
                "message": "Transcription pipeline started in background.",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
async def full_transcription_pipeline(
    temp_path: str,
    content_type: str,
    sessionPurpose: str,
    transcription_id: str,
    keywords: str,
    generate_quiz: bool,
):
    try:
        valid_video_formats = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"]
        valid_audio_formats = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"]

        if content_type.startswith("video/") or content_type in valid_video_formats:
            with open(temp_path, "rb") as file_obj:
                processed_file_path = convert_video_to_audio(file_obj)
        elif content_type.startswith("audio/") or content_type in valid_audio_formats:
            with open(temp_path, "rb") as file_obj:
                processed_file_path = process_audio_file(file_obj)
        else:
            raise Exception(f"Unsupported media format: {content_type}")

        if not processed_file_path:
            raise Exception("Failed to process media file")
        
        result = split_and_transcribe(processed_file_path)
        print(update_transcription(transcription_id,result,None, None, None))
        os.remove(processed_file_path)

        cleaned_response = await generate_cleantranscription(result)
        cleaned_transcription = cleaned_response.get("cleaned_transcription")

        pattern = r'\b([A-Za-z0-9]+)\(([^)]+)\)'
        matches = re.findall(pattern, keywords)
        shortform_map = {short.strip(): full.strip() for short, full in matches}
        def replace_match(match):
            word = match.group(0)
            return shortform_map.get(word, word)

        regex = r'\b(' + '|'.join(re.escape(k) for k in shortform_map.keys()) + r')\b'
        transcription = re.sub(regex, replace_match, cleaned_transcription)
        update_transcription(
            transcription_id,
            transcription,
            cleaned_response.get("final_highlights"),
            None,None
        )

        if generate_quiz or sessionPurpose.strip():
            await generate_quiz_logic(transcription_id, transcription, sessionPurpose, generate_quiz)

        update_transcription(
            transcription_id,
            None,
            None,
            None,None
        )
        print(f"Transcription {transcription_id} pipeline complete.")

    except Exception as e:
        print(f"[ERROR] Transcription pipeline failed: {e}")