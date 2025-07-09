from services.chains import conflict_chain
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import util
from typing import List, Tuple
from .chains import azure_embedding_model, conflict_chain

SIMILARITY_THRESHOLD = 0.75

def get_similar_pairs(embeddings_a, embeddings_b, threshold: float) -> List[Tuple[int, int]]:
    cosine_scores = util.cos_sim(embeddings_a, embeddings_b) 
    indices = (cosine_scores >= threshold).nonzero(as_tuple=False)
    similar_pairs = [(int(i), int(j)) for i, j in indices]
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
    
def resolve_transcription(transcript, snippet, resolved_content):
    try:
        if resolved_content is not None:
            return transcript.replace(snippet, resolved_content)
        else:
            return transcript.replace(snippet, "")
    except Exception as e:
        return ""