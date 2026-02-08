"""
Chat functionality tests

Test chat message sending, receiving, and AI responses
"""

import pytest
from fastapi import status


class TestChatMessages:
    """Test chat message operations"""

    def test_send_message(self, api_client, auth_headers, sample_match):
        """Test sending a message"""
        response = api_client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "girl_id": "sophie_25",
                "content": "Salut !"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["user_message"]["content"] == "Salut !"
        assert "ai_response" in data

    def test_get_conversation_history(self, api_client, auth_headers, sample_messages):
        """Test getting conversation history"""
        response = api_client.get(
            "/api/v1/chat/history/sophie_25",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) == 5

    def test_get_conversation_history_with_pagination(self, api_client, auth_headers, sample_messages):
        """Test conversation history pagination"""
        response = api_client.get(
            "/api/v1/chat/history/sophie_25?limit=2",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["messages"]) == 2

    def test_mark_messages_as_read(self, api_client, auth_headers, sample_messages):
        """Test marking messages as read"""
        response = api_client.post(
            "/api/v1/chat/read/sophie_25",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK

    def test_get_unread_count(self, api_client, auth_headers):
        """Test getting unread message count"""
        response = api_client.get(
            "/api/v1/chat/unread-count",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_unread" in data

    def test_send_message_without_match(self, api_client, auth_headers):
        """Test sending message to girl without match"""
        response = api_client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "girl_id": "nonexistent_girl",
                "content": "Hello"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAIResponses:
    """Test AI response generation"""

    def test_ai_response_quality(self, api_client, auth_headers, sample_match, mock_openrouter):
        """Test AI response is contextual"""
        response = api_client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "girl_id": "sophie_25",
                "content": "Comment vas-tu ?"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        ai_response = response.json()["ai_response"]
        assert ai_response["content"]
        assert len(ai_response["content"]) > 0

    def test_ai_response_follows_archetype(self, api_client, auth_headers, sample_match, mock_openrouter):
        """Test AI response matches girl's archetype"""
        # This would require checking personality traits in response
        response = api_client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "girl_id": "sophie_25",
                "content": "Parle-moi de toi"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        ai_response = response.json()["ai_response"]
        assert ai_response["content"]


class TestConversationStats:
    """Test conversation statistics"""

    def test_get_conversation_stats(self, api_client, auth_headers, sample_messages):
        """Test getting conversation statistics"""
        response = api_client.get(
            "/api/v1/chat/stats/sophie_25",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_messages" in data
        assert "user_messages" in data
        assert "girl_messages" in data
