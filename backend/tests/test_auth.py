import pytest

def test_register_first_user_as_admin(client):
    # Registration should succeed since there are no users yet.
    payload = {
        "username": "superadmin",
        "password": "superpassword",
        "role": "user" # Will be overridden to admin by backend logic
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "superadmin"
    assert data["role"] == "admin"

    # Second registration should be disabled.
    payload2 = {
        "username": "secondadmin",
        "password": "somepassword"
    }
    response2 = client.post("/register", json=payload2)
    assert response2.status_code == 403
    assert response2.json()["detail"] == "Registration disabled. Ask an admin to create your account."

def test_login_and_me(client, db):
    # Seed a user
    from schemas import UserCreate
    from crud import create_user
    user_in = UserCreate(username="testuser", password="testpassword", role="user")
    create_user(db, user_in)

    # Login with valid credentials
    response = client.post("/login", data={"username": "testuser", "password": "testpassword"})
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Get /me with valid token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_response = client.get("/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["username"] == "testuser"
    assert me_response.json()["role"] == "user"

    # Login with invalid credentials
    response_invalid = client.post("/login", data={"username": "testuser", "password": "wrongpassword"})
    assert response_invalid.status_code == 401
    assert response_invalid.json()["detail"] == "Invalid username or password"

def test_admin_create_and_delete_user(client, admin_headers, user_headers):
    # Admin can list users
    list_resp = client.get("/users/", headers=admin_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 2 # The admin and the user

    # Non-admin cannot list users
    list_resp_fail = client.get("/users/", headers=user_headers)
    assert list_resp_fail.status_code == 403

    # Admin creates a user
    new_user_payload = {
        "username": "newemployee",
        "password": "employeepassword",
        "role": "user"
    }
    create_resp = client.post("/users/", json=new_user_payload, headers=admin_headers)
    assert create_resp.status_code == 200
    new_user_data = create_resp.json()
    assert new_user_data["username"] == "newemployee"
    assert new_user_data["role"] == "user"
    new_user_id = new_user_data["id"]

    # Non-admin cannot create a user
    create_resp_fail = client.post("/users/", json=new_user_payload, headers=user_headers)
    assert create_resp_fail.status_code == 403

    # Duplicate username check
    create_dup = client.post("/users/", json=new_user_payload, headers=admin_headers)
    assert create_dup.status_code == 400
    assert create_dup.json()["detail"] == "Username already exists"

    # Non-admin cannot delete a user
    del_fail = client.delete(f"/users/{new_user_id}", headers=user_headers)
    assert del_fail.status_code == 403

    # Admin cannot delete themselves
    # Let's find admin's ID
    admin_id = client.get("/me", headers=admin_headers).json()["id"]
    del_self = client.delete(f"/users/{admin_id}", headers=admin_headers)
    assert del_self.status_code == 400
    assert del_self.json()["detail"] == "You cannot delete your own account while logged in"

    # Admin can delete the user
    del_success = client.delete(f"/users/{new_user_id}", headers=admin_headers)
    assert del_success.status_code == 204

    # Delete non-existent user
    del_not_found = client.delete(f"/users/{new_user_id}", headers=admin_headers)
    assert del_not_found.status_code == 404
