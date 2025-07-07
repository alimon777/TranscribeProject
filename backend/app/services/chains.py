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
        You are an AI assistant analyzing a transcript chunk from a "{session_purpose}" session.

        You are also given previously generated `provision_content` from earlier chunks. Use them to synthesize a refined, high-level final label or document section that represents the **overall session so far**, including this latest chunk.

        ### Your Tasks:
        1. **Update `provision_content`**:
            - It must be adapted to the session purpose.
            - Refer to the following formats:
                - If session purpose is **User Stories**, use:
                    - User story bullet points
                    - Include clear Acceptance Criteria for each
                    - Follow this format:
                        ```
                        • As a [role], I want [feature] so that [benefit].
                        Acceptance Criteria:
                        • [criterion 1]
                        • [criterion 2]
                        ```
                - If session purpose is **Requirements**, use:
                    - A structured document:
                        - Scope
                        - Overview
                        - Functional Requirements
                        - Non-Functional Requirements
                - If session purpose is something else, use a relevant, structured business-style format.
            - Expand and refine the existing `provision_content` with the current chunk. Don’t just summarize – **aggregate and elaborate**.

        2. **Generate 2–3 quiz questions** from the current chunk only.

        ### Formatting Rules:
        - Strictly return JSON with two keys: `provision_content` and `quiz`
        - Do not use Markdown or triple backticks
        - Quiz format:
            - `question`: string
            - `choices`: list of 3–5 options
            - `correct_answer`: must match one of the choices

        Session Purpose: {session_purpose}

        Previous provision content: {prior_provisions}

        Latest Transcript Chunk:
        {chunk}

        {format_instructions}
        """,
        input_variables=["session_purpose", "prior_provisions", "chunk"],
        partial_variables={"format_instructions": provision_parser.get_format_instructions()},
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