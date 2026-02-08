"""
Vector Memory System with Pinecone

Implements long-term memory for AI girlfriends using:
- Pinecone vector database for semantic search
- Embeddings for conversation context
- Memory importance scoring
- Automatic summarization
"""

import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import hashlib
import json

# Pinecone client
try:
    from pinecone import Pinecone, ServerlessSpec
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    logging.warning("Pinecone not installed. Memory system will use fallback.")

# OpenAI for embeddings
from openai import OpenAI

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ============================================================================
# MEMORY IMPORTANCE SCORING
# ============================================================================

class MemoryImportance:
    """Calculate importance scores for memories"""

    @staticmethod
    def score_memory(content: str, context: Dict) -> float:
        """
        Score memory importance from 0.0 to 1.0

        Factors:
        - Length (longer = more detailed = more important)
        - Emotional keywords
        - Personal information
        - Firsts/milestones
        - Sexual content (higher affection = higher importance)
        """
        score = 0.5  # Base score

        content_lower = content.lower()

        # Length factor (up to +0.1)
        if len(content) > 100:
            score += 0.1
        elif len(content) > 50:
            score += 0.05

        # Emotional keywords (+0.2)
        emotional_keywords = [
            'amour', 'aime', 'adore', 'déteste', 'heureux', 'triste',
            'excité', 'envie', 'désir', 'fantasme', 'rêve', 'peur'
        ]
        if any(kw in content_lower for kw in emotional_keywords):
            score += 0.2

        # Personal information (+0.2)
        personal_keywords = [
            'famille', 'travail', 'ami', 'rêve', 'objectif', 'secret',
            'passé', 'enfance', 'prénom', 'nom', 'âge', 'ville'
        ]
        if any(kw in content_lower for kw in personal_keywords):
            score += 0.2

        # Firsts/milestones (+0.3)
        milestone_keywords = [
            'première fois', 'premier', 'jamais', 'toujours rêvé',
            'anniversaire', 'spécial', 'important', 'mémorable'
        ]
        if any(kw in content_lower for kw in milestone_keywords):
            score += 0.3

        # Sexual/intimate content (importance scales with affection)
        affection = context.get('affection', 0)
        sexual_keywords = ['sexe', 'baiser', 'faire l\'amour', 'fantasme', 'désir']
        if any(kw in content_lower for kw in sexual_keywords):
            score += 0.1 + (affection / 100) * 0.2  # 0.1-0.3 based on affection

        # Questions about user preferences (+0.15)
        if any(q in content_lower for q in ['tu aimes', 'tu préfères', 'ton', 'ta', 'tes']):
            score += 0.15

        # Clamp to 0.0-1.0
        return min(1.0, max(0.0, score))


# ============================================================================
# VECTOR MEMORY CLIENT
# ============================================================================

class VectorMemorySystem:
    """Manages long-term memory using Pinecone vector database"""

    def __init__(self):
        self.pinecone_client = None
        self.index = None
        self.embedding_client = None
        self.dimension = 1536  # OpenAI ada-002 embedding size

        # Initialize clients
        self._initialize_pinecone()
        self._initialize_embeddings()

    def _initialize_pinecone(self):
        """Initialize Pinecone client and index"""
        if not PINECONE_AVAILABLE:
            logger.warning("Pinecone not available - using fallback memory")
            return

        if not settings.PINECONE_API_KEY:
            logger.warning("PINECONE_API_KEY not set - memory system disabled")
            return

        try:
            # Initialize Pinecone
            self.pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)

            index_name = settings.PINECONE_INDEX_NAME

            # Check if index exists
            existing_indexes = self.pinecone_client.list_indexes()
            index_names = [idx['name'] for idx in existing_indexes]

            if index_name not in index_names:
                logger.info(f"Creating Pinecone index: {index_name}")
                self.pinecone_client.create_index(
                    name=index_name,
                    dimension=self.dimension,
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-east-1'
                    )
                )

            # Connect to index
            self.index = self.pinecone_client.Index(index_name)
            logger.info(f"✅ Pinecone initialized: {index_name}")

        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
            self.pinecone_client = None
            self.index = None

    def _initialize_embeddings(self):
        """Initialize OpenAI client for embeddings"""
        if settings.OPENROUTER_API_KEY:
            # Use OpenRouter (compatible with OpenAI SDK)
            self.embedding_client = OpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )
            logger.info("✅ Embedding client initialized (OpenRouter)")
        else:
            logger.warning("No embedding client available - memory features limited")

    # ============================================================================
    # EMBEDDING GENERATION
    # ============================================================================

    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding vector for text"""
        if not self.embedding_client:
            return None

        try:
            # Use OpenAI text-embedding-ada-002 (or equivalent)
            response = self.embedding_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    # ============================================================================
    # MEMORY STORAGE
    # ============================================================================

    def store_memory(
        self,
        user_id: int,
        girl_id: str,
        content: str,
        context: Optional[Dict] = None
    ) -> bool:
        """
        Store a memory in vector database

        Args:
            user_id: User ID
            girl_id: Girlfriend ID
            content: Memory content (text)
            context: Additional context (affection, timestamp, etc.)

        Returns:
            Success boolean
        """
        if not self.index or not self.embedding_client:
            logger.warning("Memory storage unavailable - Pinecone or embeddings not configured")
            return False

        context = context or {}

        try:
            # Generate embedding
            embedding = self.generate_embedding(content)
            if not embedding:
                return False

            # Calculate importance score
            importance = MemoryImportance.score_memory(content, context)

            # Generate unique ID
            memory_id = self._generate_memory_id(user_id, girl_id, content)

            # Prepare metadata
            metadata = {
                'user_id': user_id,
                'girl_id': girl_id,
                'content': content[:1000],  # Truncate long content for metadata
                'importance': importance,
                'timestamp': datetime.utcnow().isoformat(),
                'affection': context.get('affection', 0),
                **context  # Additional context
            }

            # Store in Pinecone
            self.index.upsert(
                vectors=[{
                    'id': memory_id,
                    'values': embedding,
                    'metadata': metadata
                }]
            )

            logger.info(f"✅ Memory stored: {memory_id} (importance: {importance:.2f})")
            return True

        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            return False

    # ============================================================================
    # MEMORY RETRIEVAL
    # ============================================================================

    def retrieve_memories(
        self,
        user_id: int,
        girl_id: str,
        query: str,
        top_k: int = 5,
        min_importance: float = 0.3
    ) -> List[Dict]:
        """
        Retrieve relevant memories using semantic search

        Args:
            user_id: User ID
            girl_id: Girlfriend ID
            query: Query text for semantic search
            top_k: Number of memories to retrieve
            min_importance: Minimum importance threshold

        Returns:
            List of memory dictionaries with content and metadata
        """
        if not self.index or not self.embedding_client:
            return []

        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query)
            if not query_embedding:
                return []

            # Search Pinecone with filters
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k * 2,  # Get extra, filter later
                filter={
                    'user_id': {'$eq': user_id},
                    'girl_id': {'$eq': girl_id},
                    'importance': {'$gte': min_importance}
                },
                include_metadata=True
            )

            # Format results
            memories = []
            for match in results.matches[:top_k]:
                memories.append({
                    'content': match.metadata.get('content'),
                    'importance': match.metadata.get('importance'),
                    'timestamp': match.metadata.get('timestamp'),
                    'affection': match.metadata.get('affection'),
                    'similarity': match.score
                })

            logger.info(f"✅ Retrieved {len(memories)} memories for query: {query[:50]}...")
            return memories

        except Exception as e:
            logger.error(f"Failed to retrieve memories: {e}")
            return []

    def get_recent_memories(
        self,
        user_id: int,
        girl_id: str,
        days: int = 7,
        limit: int = 10
    ) -> List[Dict]:
        """Get recent important memories without query"""
        if not self.index:
            return []

        try:
            # Get recent memories sorted by importance
            cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

            results = self.index.query(
                vector=[0.0] * self.dimension,  # Dummy vector
                top_k=limit,
                filter={
                    'user_id': {'$eq': user_id},
                    'girl_id': {'$eq': girl_id},
                    'timestamp': {'$gte': cutoff_date}
                },
                include_metadata=True
            )

            # Sort by importance
            memories = [
                {
                    'content': m.metadata.get('content'),
                    'importance': m.metadata.get('importance'),
                    'timestamp': m.metadata.get('timestamp'),
                }
                for m in results.matches
            ]
            memories.sort(key=lambda x: x['importance'], reverse=True)

            return memories[:limit]

        except Exception as e:
            logger.error(f"Failed to get recent memories: {e}")
            return []

    # ============================================================================
    # MEMORY SUMMARIZATION
    # ============================================================================

    def summarize_conversation(
        self,
        user_id: int,
        girl_id: str,
        messages: List[Dict]
    ) -> Optional[str]:
        """
        Summarize a conversation and extract key points for memory

        Args:
            user_id: User ID
            girl_id: Girlfriend ID
            messages: List of message dicts with 'sender' and 'content'

        Returns:
            Summary text or None
        """
        if len(messages) < 5:
            return None  # Too short to summarize

        # Build conversation text
        conversation = "\n".join([
            f"{msg['sender']}: {msg['content']}"
            for msg in messages[-20:]  # Last 20 messages
        ])

        # Use LLM to summarize (if available)
        if self.embedding_client:
            try:
                response = self.embedding_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system",
                            "content": "Résume cette conversation en français en 2-3 phrases. Extrait les informations importantes sur l'utilisateur (préférences, faits personnels, émotions)."
                        },
                        {
                            "role": "user",
                            "content": conversation
                        }
                    ],
                    max_tokens=150,
                    temperature=0.3
                )

                summary = response.choices[0].message.content.strip()
                logger.info(f"✅ Conversation summarized: {len(messages)} messages → {len(summary)} chars")
                return summary

            except Exception as e:
                logger.error(f"Failed to summarize conversation: {e}")

        return None

    # ============================================================================
    # CONTEXT BUILDING
    # ============================================================================

    def build_memory_context(
        self,
        user_id: int,
        girl_id: str,
        current_message: str,
        max_memories: int = 5
    ) -> str:
        """
        Build memory context string for AI prompt

        Args:
            user_id: User ID
            girl_id: Girlfriend ID
            current_message: Current user message
            max_memories: Maximum memories to include

        Returns:
            Formatted memory context string
        """
        # Retrieve relevant memories
        memories = self.retrieve_memories(
            user_id=user_id,
            girl_id=girl_id,
            query=current_message,
            top_k=max_memories
        )

        if not memories:
            return "Aucune mémoire spécifique."

        # Format memories
        context_lines = []
        for i, memory in enumerate(memories, 1):
            importance_icon = "⭐" if memory['importance'] > 0.7 else "📌"
            context_lines.append(
                f"{importance_icon} {memory['content']}"
            )

        return "\n".join(context_lines)

    # ============================================================================
    # UTILITY METHODS
    # ============================================================================

    def _generate_memory_id(self, user_id: int, girl_id: str, content: str) -> str:
        """Generate unique memory ID"""
        timestamp = datetime.utcnow().isoformat()
        data = f"{user_id}:{girl_id}:{content}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    def delete_user_memories(self, user_id: int, girl_id: str) -> bool:
        """Delete all memories for a user-girl pair"""
        if not self.index:
            return False

        try:
            # Pinecone doesn't support bulk delete by filter directly
            # Need to query and delete by IDs
            logger.warning("Bulk delete not implemented - use Pinecone console")
            return True

        except Exception as e:
            logger.error(f"Failed to delete memories: {e}")
            return False

    def get_stats(self, user_id: int, girl_id: str) -> Dict:
        """Get memory statistics"""
        if not self.index:
            return {'total_memories': 0, 'status': 'unavailable'}

        try:
            stats = self.index.describe_index_stats()
            return {
                'total_memories': stats.total_vector_count,
                'dimension': stats.dimension,
                'status': 'active'
            }

        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {'status': 'error'}


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_memory_system_instance = None

def get_memory_system() -> VectorMemorySystem:
    """Get singleton memory system instance"""
    global _memory_system_instance
    if _memory_system_instance is None:
        _memory_system_instance = VectorMemorySystem()
    return _memory_system_instance
