from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from core.config import settings
from pydantic import BaseModel, Field
from typing import List
from langchain_openai import AzureOpenAIEmbeddings

azure_embedding_model = AzureOpenAIEmbeddings(
        model=settings.AZURE_OPENAI_EMBED_MODEL,
        api_key=settings.AZURE_OPENAI_EMBED_API_KEY,
        azure_endpoint=settings.AZURE_OPENAI_EMBED_API_ENDPOINT,
        api_version=settings.AZURE_OPENAI_EMBED_VERSION,
    )

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
conflict_parser = JsonOutputParser(pydantic_object=ConflictOutput)

transcriptPrompt = PromptTemplate(
    template="""
        You are an AI assistant that **cleans and lightly enhances transcript chunks** without altering their meaning.

        Your responsibilities:
        1. Fix grammar, punctuation, and any accent-related issues.
        2. Ensure a proper beginning and ending (e.g., don't start mid-sentence).
        3. Structure the text into well-separated, readable paragraphs.
        4. Do NOT summarize, rephrase, or remove any meaningful content.
        5. Keep the wording and intent of the original chunk as close as possible.
        6. Return the improved transcript chunk in full.
        7. Along with this, Extract key bullet-point highlights from the chunk.

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

        Refine and condense the following list of highlights from transcript chunks into a clear, well-organized plain-text summary.

        - Group similar points logically under clear, bold-style headings (just text, no Markdown).
        - Use hyphenated bullet points (-) for individual insights.
        - Do not repeat information.
        - Maintain good spacing between sections for readability.
        - Do NOT add Markdown or wrap the response in ``` or any other formatting blocks.

        Highlights:
        {chunk_highlights}
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

conflict_prompt = PromptTemplate(
    template="""
        You are an AI assistant tasked with detecting **true contradictions or factual anomalies** between two transcript chunks.

        Below are two sets of summarized facts from separate transcript sections:

        Summary A (new transcript chunk):
        {facts_a}

        Summary B (existing transcript chunk):
        {facts_b}

        Your task:
        - Compare both summaries carefully.
        - Only return results if there are **meaningful contradictions or factual mismatches**.
        - Ignore statements that are **paraphrased**, **semantically similar**, or express the **same idea** in different words — these are NOT conflicts.

        Return a result ONLY if one or more of the following anomalies are clearly present:
        - **CONTRADICTION**: The two summaries clearly assert opposing facts.
        - **OUTDATED_INFO**: One summary reflects updated or corrected information that invalidates the other.
        - **SEMANTIC_DIFFERENCE**: Subtle but important difference in meaning, intent, or interpretation — only if it could change downstream understanding or decisions.

        DO NOT return results for:
        - Rephrased or overlapping content
        - Slight variations in wording that preserve the same meaning

        If a conflict is found, return:
        - **new_code**: The exact sentence from Summary A's corresponding transcript chunk (verbatim).
        - **existing_code**: The exact sentence from Summary B's corresponding transcript chunk (verbatim).
        - **anomaly**: One of: CONTRADICTION, OUTDATED_INFO, SEMANTIC_DIFFERENCE

        {format_instructions}
        """,
        input_variables=["facts_a", "facts_b"],
        partial_variables={"format_instructions": conflict_parser.get_format_instructions()}
    )
conflict_chain = conflict_prompt | model | conflict_parser