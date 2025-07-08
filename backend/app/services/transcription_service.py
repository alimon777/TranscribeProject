import shutil
import subprocess
import uuid
from fastapi import HTTPException
import requests
from core.config import settings
import time
import os
import tempfile
from moviepy.video.io.VideoFileClip import VideoFileClip
import concurrent
from langchain_text_splitters import RecursiveCharacterTextSplitter
from api.router import create_provision, create_quiz
from .chains import summary_chain,chain, transcriptChain

ffmpeg_path = settings.FFMPEG_PATH

def transcribe_audio_file(audio_file_url):
    global result_phrase_text
    try:
        transcription_url = settings.TRANSCRIPTION_URL
        subscription_key = settings.SUBSCRIPTION_KEY

        # Set the content URL for the audio file
        content_urls = [audio_file_url]

        # Set other parameters for transcription
        transcription_data = {
            "contentUrls": content_urls,
            "locale": "en-US",
            "displayName": "My Transcription",  # Change this to your preferred display name
            "model": None,
            "properties": {
                "wordLevelTimestampsEnabled": True,
                "languageIdentification": {
                    "candidateLocales": ["en-US", "de-DE", "es-ES"]
                },
            },
        }

        # Set headers for the API request
        headers = {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": subscription_key,
        }

        # Make a POST request to initiate transcription
        response = requests.post(
            transcription_url, json=transcription_data, headers=headers, verify=False
        )

        # Check if the request was successful (status code 201 - Created)
        if response.status_code == 201:
            transcription_result = response.json()
            transcription_id = transcription_result["self"].split("/")[-1]
            transcription_files_url = f"{settings.TRANSCRIPTION_URL}/{transcription_id}/files"

            max_attempts = 60
            attempt = 0
            wait_time = 10  # Initial wait time in seconds

            while True:
                response = requests.get(
                    transcription_files_url, headers=headers, verify=False
                )
                print(f"Response (Attempt {attempt + 1}):", response.json())
                if response.status_code == 200:
                    files_data = response.json()
                    if files_data.get("values"):
                        # Process the transcription result
                        for file_info in files_data["values"]:
                            if file_info["kind"] == "Transcription":
                                content_url = file_info["links"]["contentUrl"]
                                content_response = requests.get(
                                    content_url, headers=headers
                                )
                                content_data = content_response.json()
                                if "combinedRecognizedPhrases" in content_data:
                                    display_phrases = [
                                        phrase.get("display", "")
                                        for phrase in content_data[
                                            "combinedRecognizedPhrases"
                                        ]
                                        if phrase.get("channel", -1) == 0
                                    ]
                                    result_phrase_text = display_phrases
                                    print(f"Transcript{display_phrases}")
                                    return " ".join(display_phrases)
                                else:
                                    return {"message": "No recognized phrases found."}
                    else:
                        print(
                            f"Transcription still in progress. Waiting {wait_time} seconds before retrying..."
                        )
                        time.sleep(wait_time)
                        attempt += 1
                        wait_time = min(
                            wait_time * 2, 40
                        )  # Exponential backoff, max 40 seconds
                        if attempt >= max_attempts:
                            return {
                                "message": "Transcription did not complete within the expected time."
                            }
                else:
                    return {
                        "message": f"Failed to get transcription files. Status code: {response.status_code}"
                    }
        else:
            return {
                "message": f"Failed to initiate transcription. Status code: {response.status_code}"
            }

    except Exception as e:
        return {"message": f"Error during transcription initiation: {str(e)}"}


def createBlobUrl(filename):
    return f"https://playgroundstorageai.blob.core.windows.net/audio/{filename}{settings.BLOB_URL}"

def convert_video_to_audio(video_file):
    try:
        print("Converting video to audio...")
        # Create a temporary file to store the video
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
            temp_video.write(video_file.read())
            temp_video.flush()  # Ensure it's written
            temp_video_name = temp_video.name

        file_size = os.path.getsize(temp_video_name)
        print(f"File size of video: {file_size} bytes")

        # Load the video file from the temporary location
        video_clip = VideoFileClip(temp_video_name)

        if video_clip.audio is None:
            video_clip.close()
            os.remove(temp_video_name)
            raise ValueError("The uploaded video has no audio stream.")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            audio_temp_path = temp_audio.name
            video_clip.audio.write_audiofile(
                audio_temp_path)
            video_clip.close()  

        # with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as sped_up_audio:
        #     sped_up_audio_path = sped_up_audio.name

        # # Run FFmpeg to speed up audio by 2x
        # subprocess.run([
        #     ffmpeg_path, "-y",  # -y to overwrite without asking
        #     "-i", audio_temp_path,
        #     "-filter:a", "atempo=2.0",
        #     sped_up_audio_path
        # ], check=True)

        os.remove(temp_video_name)
        # os.remove(audio_temp_path)
        return audio_temp_path
    except ValueError as ve:
        print(f"Audio-related error: {ve}")
    except Exception as e:
        print(f"Error converting video to audio: {e}")
        return None

def process_audio_file(audio_file):
    try:
        print("Processing audio file...")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            temp_audio.write(audio_file.read())
            temp_audio.flush()
            audio_file_path = temp_audio.name
        
        # with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as sped_up:
        #     final_audio_path = sped_up.name
        
        # subprocess.run([
        #     ffmpeg_path, "-y",  # -y to overwrite without asking
        #     "-i", audio_file_path,
        #     "-filter:a", "atempo=2.0",
        #     final_audio_path
        # ], check=True)

        # os.remove(audio_file_path)
        return audio_file_path
    except Exception as e:
        print(f"Error processing audio file: {e}")
        return None

def split_and_transcribe(audio_file_url):
    try:
        chunk_duration = 300  # 5 minutes
        output_dir = tempfile.mkdtemp(prefix="audio_chunks_")
        print("output_dir", output_dir)
        os.makedirs(output_dir, exist_ok=True)
        # Step 1: Split audio into chunks using ffmpeg
        output_pattern = os.path.join(output_dir, "chunk%03d.wav")
        ffmpeg_command = [
            ffmpeg_path, "-i", audio_file_url,
            "-f", "segment", "-segment_time", str(chunk_duration),
            "-c", "copy", output_pattern
        ]
        subprocess.run(ffmpeg_command, check=True)
        chunk_paths = sorted([
            os.path.join(output_dir, f) for f in os.listdir(output_dir) 
            if f.startswith("chunk") and f.endswith(".wav")
        ])
        unique_id = uuid.uuid4()
        transcription = []  
        futures = {}
        with concurrent.futures.ThreadPoolExecutor() as executor:
            for index, chunk in enumerate(chunk_paths):
                uniqueFileName = f"{unique_id}_{index:03d}.wav"
                upload_url = createBlobUrl(uniqueFileName)

                with open(chunk, "rb") as processed_data:
                    upload_response = requests.put(
                        upload_url,
                        data=processed_data,
                        headers={"x-ms-blob-type": "BlockBlob",
                                "Content-Type": "audio/wav"},
                        verify=False,
                    )
                futures[executor.submit(transcribe_audio_file, upload_url)] = (upload_url, index)

            for future in concurrent.futures.as_completed(futures):
                url, index = futures[future]
                try:
                    result = future.result()
                    transcription.append((index, result))
                except Exception as e:
                    print(f"Error in transcription for chunk {index}: {e}")
                    transcription.append((index, {"message": ""}))

                try:
                    delete_response = requests.delete(url)
                    if delete_response.status_code not in [200, 202, 204]:
                        print(f"Failed to delete blob: Status code {delete_response.status_code}")
                    else:
                        print(f"Blob deleted successfully: {url}")
                except Exception as e:
                    print(f"Error deleting blob {url}: {e}")

        transcription.sort(key=lambda x: x[0])
        sorted_transcriptions = ' '.join([
            i[1]["message"] if isinstance(i[1], dict) and "message" in i[1] else str(i[1])
            for i in transcription
        ])

        print("\nDeleting chunk folder...")
        try:
            shutil.rmtree(output_dir)
            print(f"Deleted folder: {output_dir}")
        except Exception as e:
            print(f"Error deleting folder {output_dir}: {e}")
        return sorted_transcriptions
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

async def generate_cleantranscription(transcription):
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=200)
        chunks = splitter.split_text(transcription)

        final_cleaned_transcript = ""
        all_highlights = []
        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i + 1}/{len(chunks)}... for Clean transcription")
            result = await transcriptChain.ainvoke({
                "chunk": chunk,
                "previous_highlights": "\n".join(all_highlights) if all_highlights else "None"
            })
            final_cleaned_transcript += (result.get("transcript") or "").strip() + "\n\n"
            all_highlights.extend(result.get("highlights"))

        final_highlight_response = await summary_chain.ainvoke({
            "chunk_highlights": "\n".join(all_highlights)
        })
    except Exception as e:
        print("error", e)
    return {
        "cleaned_transcription": final_cleaned_transcript,
        "final_highlights": final_highlight_response.content if final_highlight_response else "",
    }

async def generate_quiz_logic(transcription_id, transcription, sessionPurpose, generate_quiz):
    try:
        if not transcription or not transcription.strip():
            print("Warning: Empty transcription provided")
            return "No content available for processing"
 
        chunks = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=200).split_text(transcription)
        if not chunks:
            print("Warning: No chunks generated from transcription")
            return "Transcription too short to process"
 
        provision_content = ""
        all_quizzes = []
        for i, chunk in enumerate(chunks):
            try:
                result = await chain.ainvoke({
                    "session_purpose": sessionPurpose,
                    "prior_provisions": provision_content,
                    "chunk": chunk
                })
 
                print(f"Processing chunk {i + 1}/{len(chunks)}... for provision content")
 
                result_provision = result.get("provision_content")
                if isinstance(result_provision, dict):
                    result_provision = '\n\n'.join(f"{k.upper()}\n{v}" for k, v in result_provision.items())
                elif not isinstance(result_provision, str):
                    print(f"Warning: Invalid provision_content format in chunk {i}. Skipping.")
                    continue
 
                provision_content = result_provision
 
                quiz_list = result.get("quiz", [])
                if isinstance(quiz_list, list):
                    all_quizzes.extend(quiz_list)
                else:
                    print(f"Warning: Invalid quiz format in chunk {i}. Expected list.")
 
            except Exception as e:
                print(f"Error processing chunk {i}: {str(e)}")
                continue
 
        if sessionPurpose.strip() and provision_content:
            create_provision(transcription_id, provision_content)
 
        if generate_quiz and all_quizzes:
            valid_quizzes = [q for q in all_quizzes if is_valid_quiz(q)]
            if valid_quizzes:
                create_quiz(transcription_id, valid_quizzes)

        return provision_content
    except Exception as e:
        print(f"Error in generate_quiz_logic: {str(e)}")
        return "Error in generate_quiz_logic"
 
 
def is_valid_quiz(q):
    return (
        isinstance(q, dict) and
        all(k in q for k in ["question", "choices", "correct_answer"]) and
        isinstance(q["choices"], list) and
        len(q["choices"]) >= 2 and
        q["correct_answer"] in q["choices"]
    )