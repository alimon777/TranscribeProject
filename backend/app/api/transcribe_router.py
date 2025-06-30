import asyncio
import uuid
from fastapi import APIRouter, BackgroundTasks, File, UploadFile, HTTPException, File, Form
from fastapi.responses import JSONResponse
import threading
from api.router import create_transcription, update_transcription, get_transcription
from services.transcription_service import convert_video_to_audio, process_audio_file, transcribe_audio_async, generate_cleantranscription


transcribe_router = APIRouter()

transcriptions_lock = threading.Lock()
transcriptions = {}

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
        content_type = media.content_type or ""

        valid_video_formats = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"]
        valid_audio_formats = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"]

        if content_type.startswith("video/") or content_type in valid_video_formats:
            processed_file_path = convert_video_to_audio(media.file)
            media_type = "video"
        elif content_type.startswith("audio/") or content_type in valid_audio_formats:
            processed_file_path = process_audio_file(media.file)
            media_type = "audio"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported media format: {content_type}. Supported: {valid_video_formats + valid_audio_formats}",
            )

        if processed_file_path is None:
            raise HTTPException(status_code=500, detail="Failed to process media file")

        transcription_id = transcription_message["id"]

        # Schedule the entire transcription-cleanup-quiz pipeline
        background_tasks.add_task(
            full_transcription_pipeline,
            processed_file_path,
            sessionPurpose,
            transcription_id,
            "keywords",
            False,
        )

        return JSONResponse(
            status_code=202,
            content={
                "transcription_id": transcription_id,
                "media_type": media_type,
                "message": "Transcription pipeline started in background.",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
async def full_transcription_pipeline(
    processed_file_path: str,
    sessionPurpose: str,
    transcription_id: str,
    keywords: str,
    generate_quiz: bool,
):
    try:
        await transcribe_audio_async(processed_file_path, transcription_id)

        complete_transcription = await get_transcription(transcription_id)
        if not complete_transcription:
            print(f"Transcription not found: {transcription_id}")
            return

        cleaned_response = await generate_cleantranscription(complete_transcription["transcript"])

        update_transcription(
            transcription_id,
            cleaned_response.get("cleaned_transcription"),
            cleaned_response.get("final_highlights"),
        )

        # if generate_quiz:
        #     await generate_quiz_logic(transcription_id, keywords, cleaned_response)

        print(f"Transcription {transcription_id} pipeline complete.")

    except Exception as e:
        print(f"[ERROR] Transcription pipeline failed: {e}")
    
# @transcribe_router.post("/transcribe/cleanup")
# async def get_transcription_status(
#     transcription_id: str = Form(...), 
#     keywords: str = Form(...),
#     generateQuiz: bool = Form(...),
#     sessionPurpose: str = Form(...),):

#     async def cleanup_and_update():
#         try:
#             complete_transcription = await get_transcription(transcription_id)
#             if not complete_transcription:
#                 print(f"Transcription not found for ID: {transcription_id}")
#                 return

#             cleaned_response = await generate_cleantranscription(complete_transcription.get("transcript"))
#             print(update_transcription(
#                 transcription_id,
#                 cleaned_response.get("cleaned_transcription"),
#                 cleaned_response.get("final_highlights")
#             ))

#             # if generateQuiz:
#             #     await generate_quiz_logic(transcription_id, keywords, cleaned_response)

#         except Exception as e:
#             print(f"Cleanup error for transcription {transcription_id}: {e}")

#     # Schedule cleanup as a background task
#     asyncio.create_task(cleanup_and_update())

#     return JSONResponse(
#         status_code=202,
#         content={"status": "processing", "message": "Cleanup has started in background."}
#     )