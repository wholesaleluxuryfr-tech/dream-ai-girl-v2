"""
Authentication tests

Test user registration, login, and JWT token handling
"""

import pytest
from fastapi import status


class TestUserRegistration:
    """Test user registration flow"""

    def test_register_new_user(self, api_client):
        """Test successful user registration"""
        response = api_client.post("/api/v1/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "age": 25
        })

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert "password" not in data
        assert "token" in data

    def test_register_duplicate_username(self, api_client, test_user):
        """Test registration with duplicate username"""
        response = api_client.post("/api/v1/auth/register", json={
            "username": test_user.username,
            "email": "different@example.com",
            "password": "SecurePass123!",
            "age": 25
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "username" in response.json()["detail"].lower()

    def test_register_duplicate_email(self, api_client, test_user):
        """Test registration with duplicate email"""
        response = api_client.post("/api/v1/auth/register", json={
            "username": "differentuser",
            "email": test_user.email,
            "password": "SecurePass123!",
            "age": 25
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()["detail"].lower()

    def test_register_weak_password(self, api_client):
        """Test registration with weak password"""
        response = api_client.post("/api/v1/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "weak",
            "age": 25
        })

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_underage(self, api_client):
        """Test registration with age < 18"""
        response = api_client.post("/api/v1/auth/register", json={
            "username": "younguser",
            "email": "young@example.com",
            "password": "SecurePass123!",
            "age": 17
        })

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestUserLogin:
    """Test user login flow"""

    def test_login_with_username(self, api_client, test_user):
        """Test login with username"""
        response = api_client.post("/api/v1/auth/login", json={
            "username_or_email": test_user.username,
            "password": "TestPass123!"
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["username"] == test_user.username

    def test_login_with_email(self, api_client, test_user):
        """Test login with email"""
        response = api_client.post("/api/v1/auth/login", json={
            "username_or_email": test_user.email,
            "password": "TestPass123!"
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    def test_login_wrong_password(self, api_client, test_user):
        """Test login with wrong password"""
        response = api_client.post("/api/v1/auth/login", json={
            "username_or_email": test_user.username,
            "password": "WrongPassword123!"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user"""
        response = api_client.post("/api/v1/auth/login", json={
            "username_or_email": "nonexistent",
            "password": "TestPass123!"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestTokenRefresh:
    """Test JWT token refresh"""

    def test_refresh_valid_token(self, api_client, test_user):
        """Test refreshing valid token"""
        # First login
        login_response = api_client.post("/api/v1/auth/login", json={
            "username_or_email": test_user.username,
            "password": "TestPass123!"
        })
        refresh_token = login_response.json()["refresh_token"]

        # Refresh token
        response = api_client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    def test_refresh_invalid_token(self, api_client):
        """Test refreshing invalid token"""
        response = api_client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid_token"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestProtectedEndpoints:
    """Test protected endpoint authentication"""

    def test_access_protected_with_valid_token(self, api_client, auth_headers):
        """Test accessing protected endpoint with valid token"""
        response = api_client.get("/api/v1/users/me", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK

    def test_access_protected_without_token(self, api_client):
        """Test accessing protected endpoint without token"""
        response = api_client.get("/api/v1/users/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_protected_with_invalid_token(self, api_client):
        """Test accessing protected endpoint with invalid token"""
        response = api_client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
