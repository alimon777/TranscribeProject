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
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.output_parsers import JsonOutputParser
from typing import List
from api.router import update_transcription

ffmpeg_path = settings.FFMPEG_PATH

model = AzureChatOpenAI(
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_key=settings.AZURE_OPENAI_API_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        temperature=0
    )

class transcriptParser(BaseModel):
    transcript: str = Field(description="The cleaned, well-formatted version of the chunked transcript.")
    highlights: List[str] = Field(description="short bullet-point highlights extracted from the transcript chunk.")
parser = JsonOutputParser(pydantic_object=transcriptParser)

# class highlightParser(BaseModel):
#     highlights: List[str] = Field(description="Final list of summarized highlights")
# list_parser = JsonOutputParser(pydantic_object=highlightParser)

transcriptPrompt = PromptTemplate(
    template="""
        You are an AI that cleans and summarizes transcript chunks. Your tasks are:

        1. Fix grammar and formatting of the transcript chunk.
        2. Add proper beginning and ending if missing.
        3. Structure it into well-separated paragraphs.
        4. Extract key bullet-point highlights from the chunk.

        Use the previous highlights to ensure smooth narrative flow.

        {format_instructions}

        Previous highlights:
        {previous_highlights}

        Transcript chunk:
        {chunk}
        """,
            input_variables=["previous_highlights", "chunk"],
            partial_variables={"format_instructions": parser.get_format_instructions()}
        )

transcriptChain = transcriptPrompt | model | parser

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


# Function to convert video to audio
def convert_video_to_audio(video_file):
    try:
        print("Converting video to audio...")
        # Create a temporary file to store the video
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
            # Save the video file to the temp file
            temp_video.write(video_file.read())
            temp_video.flush()  # Ensure it's written
            temp_video_name = temp_video.name

        file_size = os.path.getsize(temp_video_name)  # Get file size in bytes
        print(f"File size of video: {file_size} bytes")

        # Load the video file from the temporary location
        video_clip = VideoFileClip(temp_video_name)

        if video_clip.audio is None:
            video_clip.close()
            os.remove(temp_video_name)
            raise ValueError("The uploaded video has no audio stream.")

        # Create another temp file for audio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            audio_temp_path = temp_audio.name
            video_clip.audio.write_audiofile(
                audio_temp_path)  # Convert video to audio
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

        # Clean up the temporary video file
        os.remove(temp_video_name)
        # os.remove(audio_temp_path)
        return audio_temp_path  # Return the audio file path for streaming upload
    except ValueError as ve:
        print(f"Audio-related error: {ve}")
    except Exception as e:
        print(f"Error converting video to audio: {e}")
        return None


# Process audio file (no conversion needed)
def process_audio_file(audio_file):
    try:
        print("Processing audio file...")
        # Create a temporary file to store the audio
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
        output_dir = tempfile.gettempdir()
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
            # Submit transcription tasks for each chunk with an index to track order
            for index, chunk in enumerate(chunk_paths):
                uniqueFileName = f"{unique_id}_{index:03d}.wav"
                upload_url = createBlobUrl(uniqueFileName)

                # Open the processed file and upload it as a stream directly to Azure Blob
                with open(chunk, "rb") as processed_data:
                    upload_response = requests.put(
                        upload_url,
                        data=processed_data,
                        headers={"x-ms-blob-type": "BlockBlob",
                                "Content-Type": "audio/wav"},
                        verify=False,
                    )
                futures[executor.submit(transcribe_audio_file, upload_url)] = (upload_url, index)

            # Collect the transcription results and sort by the original index
            for future in concurrent.futures.as_completed(futures):
                url, index = futures[future]
                try:
                    result = future.result()
                    transcription.append((index, result))
                except Exception as e:
                    print(f"Error in transcription for chunk {index}: {e}")
                    transcription.append((index, {"message": ""}))  # or skip this index

                # Always attempt deletion
                try:
                    delete_response = requests.delete(url)
                    if delete_response.status_code not in [200, 202, 204]:
                        print(f"Failed to delete blob: Status code {delete_response.status_code}")
                    else:
                        print(f"Blob deleted successfully: {url}")
                except Exception as e:
                    print(f"Error deleting blob {url}: {e}")

        # Sort transcriptions by index to restore the correct order
        transcription.sort(key=lambda x: x[0])

        # Extract the actual transcription results in order
        sorted_transcriptions = ' '.join([
            i[1]["message"] if isinstance(i[1], dict) and "message" in i[1] else str(i[1])
            for i in transcription
        ])
        print("sorted_trans", sorted_transcriptions)

        print("\nDeleting chunk files...")
        for chunk_file in chunk_paths:
            try:
                os.remove(chunk_file)
                print(f"Deleted: {chunk_file}")
            except Exception as e:
                print(f"Error deleting {chunk_file}: {e}")
        return sorted_transcriptions
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

async def generate_cleantranscription(transcription):

    splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=200)
    chunks = splitter.split_text(transcription)

    # Step 5.2: Initialize accumulators
    final_cleaned_transcript = ""
    all_highlights = []
    # Step 5.3: Process each chunk
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i + 1}/{len(chunks)}...")

        result = await transcriptChain.ainvoke({
            "chunk": chunk,
            "previous_highlights": "\n".join(all_highlights) if all_highlights else "None"
        })

        print(result.get("transcript"))
        final_cleaned_transcript += (result.get("transcript") or "").strip() + "\n\n"
        all_highlights.extend(result.get("highlights"))
    allhighlights = "\n".join(all_highlights)
    print("all hights", allhighlights)

    try:
        # Step 5.4: Generate Final Highlights from All Highlights
        summary_prompt = PromptTemplate(
            template="""
            You are an AI summarizer.

            Refine and condense the following list of highlights from transcript chunks into a clear, organized summary.
            - Group similar points logically under clear bolded headings.
            - Use bullet points for individual insights.
            - Avoid repetition.
            - Output should be in markdown format.

            Highlights:
            {chunk_highlights}
            """,
                input_variables=["chunk_highlights"]
            )
        summary_chain = summary_prompt | model

        final_highlight_response = await summary_chain.ainvoke({
            "chunk_highlights": "\n".join(all_highlights)
        })
    except Exception as e:
        print("error", e)
    return {
        "cleaned_transcription": final_cleaned_transcript,
        "final_highlights": final_highlight_response.content if final_highlight_response else "",
    }

