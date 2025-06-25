import asyncio
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import threading
from services.transcription_service import convert_video_to_audio, process_audio_file, transcribe_audio_async


transcribe_router = APIRouter()

transcriptions_lock = threading.Lock()
transcriptions = {}

@transcribe_router.post("/upload/transcribe")
async def upload_metadata(media: UploadFile = File(...)):
    try:
        # Check if media file is provided
        if not media:
            raise HTTPException(
                status_code=400, detail="No media file provided")

        # Determine the file type and process accordingly
        content_type = media.content_type or ""

        # List of valid media types
        valid_video_formats = [
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "video/x-msvideo",
        ]
        valid_audio_formats = ["audio/wav",
                               "audio/mp3", "audio/mpeg", "audio/ogg"]

        if content_type.startswith("video/") or content_type in valid_video_formats:
            # Handle video file - convert to audio first
            processed_file_path = convert_video_to_audio(media.file)
            media_type = "video"
        elif content_type.startswith("audio/") or content_type in valid_audio_formats:
            # Handle audio file - no conversion needed
            processed_file_path = process_audio_file(media.file)
            media_type = "audio"
        else:
            # Unsupported file type
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported media format: {content_type}. Supported formats: videos ({', '.join(valid_video_formats)}) and audio ({', '.join(valid_audio_formats)})",
            )

        # Check if processing was successful
        if processed_file_path is None:
            raise HTTPException(
                status_code=500, detail=f"Failed to process {media_type} file"
            )

        # Start transcription in a background asyncio task
        transcription_id = str(uuid.uuid4())
        with transcriptions_lock:
            transcriptions[transcription_id] = {
                "status": "in_progress",
                "result": None,
                "media_type": media_type,
            }

        # Create a background task for transcription
        asyncio.create_task(transcribe_audio_async(processed_file_path, transcription_id, transcriptions, transcriptions_lock))

        return JSONResponse(
            status_code=202,
            content={
                "transcription_id": transcription_id,
                "media_type": media_type,
                "message": f"Transcription started for {media_type} file",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@transcribe_router.get("/transcribe/{transcription_id}")
async def get_transcription_status(transcription_id: str):
    with transcriptions_lock:
        transcription = transcriptions.get(transcription_id)

    if not transcription:
        raise HTTPException(
            status_code=404, detail="Transcription ID not found")

    return JSONResponse(content=transcription)