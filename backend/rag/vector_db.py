from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.http.exceptions import UnexpectedResponse
import uuid
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "qdrant_data")
COLLECTION_NAME = "cisco_knowledge"

# Initialize Qdrant Client (local disk storage)
client = QdrantClient(path=DB_PATH)

def init_db():
    try:
        client.get_collection(collection_name=COLLECTION_NAME)
    except Exception: # Collection doesn't exist
        # We don't need to specify vector size if we use fastembed in add()!
        # But we can set up the client to use FastEmbed directly.
        pass

def chunk_text(text: str, max_words: int = 200) -> list:
    """Simple word-based chunker for documents."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), max_words):
        chunk = " ".join(words[i:i+max_words])
        chunks.append(chunk)
    return chunks

def ingest_document(url: str, title: str, content: str):
    """
    Chunks a document and inserts it into Qdrant using FastEmbed.
    """
    client.set_model("BAAI/bge-small-en-v1.5") # Small, fast embedding model
    
    chunks = chunk_text(content)
    if not chunks:
        return
        
    docs = []
    metadata = []
    ids = []
    
    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) < 20:
            continue
        docs.append(chunk)
        metadata.append({
            "url": url,
            "title": title,
            "chunk_index": i
        })
        ids.append(str(uuid.uuid4()))
        
    # client.add() uses the built-in fastembed model to embed and insert
    client.add(
        collection_name=COLLECTION_NAME,
        documents=docs,
        metadata=metadata,
        ids=ids
    )

def search_knowledge(query: str, limit: int = 3) -> list:
    """
    Searches the vector database for relevant chunks using FastEmbed.
    """
    try:
        client.set_model("BAAI/bge-small-en-v1.5")
        
        results = client.query(
            collection_name=COLLECTION_NAME,
            query_text=query,
            limit=limit
        )
        
        formatted_results = []
        for res in results:
            formatted_results.append({
                "content": res.document,
                "url": res.metadata.get("url"),
                "title": res.metadata.get("title"),
                "score": res.score
            })
        return formatted_results
    except Exception as e:
        print(f"Search error: {e}")
        return []

if __name__ == "__main__":
    init_db()
    print("Qdrant initialized at:", DB_PATH)
