from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from core.config import settings
from pydantic import BaseModel, Field
from typing import List

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

class QuizItem(BaseModel):
    question: str
    choices: List[str]
    correct_answer: str
class ChunkAnalysisOutput(BaseModel):
    provision_content: str
    quiz: List[QuizItem]
provision_parser = JsonOutputParser(pydantic_object=ChunkAnalysisOutput)

class ConflictItem(BaseModel):
    new_code: str
    existing_code: str
    anomaly: str
class ConflictOutput(BaseModel):
    conflicts: List[ConflictItem]
class SummaryOutput(BaseModel):
    facts: List[str]
summary_parser = JsonOutputParser(pydantic_object=SummaryOutput)
conflict_parser = JsonOutputParser(pydantic_object=ConflictOutput)

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

highlights = PromptTemplate(
    template="""
        You are an AI summarizer.

        Refine and condense the following list of highlights from transcript chunks into a clear, organized summary.
        - Group similar points logically under clear bolded headings.
        - Use bullet points for individual insights.
        - Avoid repetition.
        - Output should be in markdown format.

        Highlights:
        {chunk_highlights}

        - do not add markdown to the response, and do not start or end with ```.
        """,
        input_variables=["chunk_highlights"]
    )
summary_chain = highlights | model

prompt = PromptTemplate(
    template="""
        You are an AI assistant analyzing a transcript chunk from a session titled "{session_purpose}".
        
        Based on the session purpose and content, create a comprehensive, well-structured session documentation.
        Generate appropriate headings and subheadings that best fit the session content and purpose.
        
        Requirements:
        1. Use clear, descriptive headings (ALL CAPS) that are relevant to the session content
        2. Include detailed bullet points under each section
        3. Provide comprehensive coverage of the discussion
        4. Avoid markdown formatting - use plain text with proper spacing
        5. Make it universally acceptable for any session type
        6. Include actionable items, decisions, and key insights
        7. Build upon previous content to create a cohesive document
        
        Also generate 2-3 quiz questions based on the content:
        - question (string)
        - choices (list of 4 options)
        - correct_answer (string - must match one of the choices exactly)
        
        Use the existing `provision_content` and current `chunk` to create a refined, comprehensive session summary.
        
        Session Purpose: {session_purpose}
        Previous Content: {prior_provisions}
        Current Chunk: {chunk}

        {format_instructions}
        
        Return JSON with keys: provision_content (string) and quiz (list of question objects).
        """,
        input_variables=["session_purpose", "prior_provisions", "chunk"],
        partial_variables={"format_instructions": provision_parser.get_format_instructions()}
    )
chain = prompt | model | provision_parser


summary_prompt = PromptTemplate(
    template="""
        You are an AI assistant tasked with summarizing a meeting transcript.

        Summarize it into clear, factual bullet points. Each bullet must represent one discrete idea, statement, decision, or observation that was made in the transcript. Avoid opinions or filler language.

        Transcript:
        \"\"\"{transcript}\"\"\"

        {format_instructions}
        """,
        input_variables=["transcript"],
        partial_variables={"format_instructions": summary_parser.get_format_instructions()}
    )
summarize_chain = summary_prompt | model | summary_parser

conflict_prompt = PromptTemplate(
    template="""
        You are an AI assistant detecting contradictions or anomalies between two summarized transcripts.

        Here are the two sets of summarized facts:

        Summary A (new transcript):
        {facts_a}

        Summary B (existing transcript):
        {facts_b}

        Compare these facts and return a list of conflicts. For each, provide:
        - new_code: the fact from Summary A
        - existing_code: the contradicting or mismatched fact from Summary B
        - anomaly: one of the following values:
            - CONTRADICTION
            - SIGNIFICANT_OVERLAP
            - SEMANTIC_DIFFERENCE
            - OUTDATED_INFO

        {format_instructions}
        """,
        input_variables=["facts_a", "facts_b"],
        partial_variables={"format_instructions": conflict_parser.get_format_instructions()}
    )
conflict_chain = conflict_prompt | model | conflict_parser