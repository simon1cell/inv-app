import pytest
from datetime import date

def test_comments_endpoints(client, admin_headers, user_headers):
    # Seed an item
    item_payload = {
        "catalogue_num": "CAT-COM",
        "item_name": "Commentable Item",
        "quantity": 10,
        "storage_id": "Cabinet C",
        "last_restocked": str(date.today()),
        "brand": "BrandX",
        "category": "Consumables"
    }
    client.post("/items/", json=item_payload, headers=admin_headers)

    # 1. Normal user posts a comment
    comment_payload = {"comment": "This is a user comment."}
    comment_resp = client.post("/items/CAT-COM/comments", json=comment_payload, headers=user_headers)
    assert comment_resp.status_code == 200
    comment_data = comment_resp.json()
    assert comment_data["item_id"] == "CAT-COM"
    assert comment_data["username"] == "user"
    assert comment_data["comment"] == "This is a user comment."
    comment_id = comment_data["id"]

    # 2. Block empty comments
    empty_resp = client.post("/items/CAT-COM/comments", json={"comment": "   "}, headers=user_headers)
    assert empty_resp.status_code == 400
    assert empty_resp.json()["detail"] == "Comment cannot be empty"

    # 3. Post to non-existent item
    fail_post = client.post("/items/NONEXISTENT/comments", json={"comment": "Hello"}, headers=user_headers)
    assert fail_post.status_code == 404

    # 4. List comments
    # Let's post another comment first to test order
    client.post("/items/CAT-COM/comments", json={"comment": "Second comment"}, headers=admin_headers)

    list_resp = client.get("/items/CAT-COM/comments", headers=user_headers)
    assert list_resp.status_code == 200
    comments_list = list_resp.json()
    assert len(comments_list) == 2
    # Check descending order (newest first)
    assert comments_list[0]["comment"] == "Second comment"
    assert comments_list[0]["username"] == "admin"
    assert comments_list[1]["comment"] == "This is a user comment."
    assert comments_list[1]["username"] == "user"

    # 5. Comment deletion permissions
    # Non-admin cannot delete
    del_fail = client.delete(f"/item-comments/{comment_id}", headers=user_headers)
    assert del_fail.status_code == 403

    # Admin can delete
    del_success = client.delete(f"/item-comments/{comment_id}", headers=admin_headers)
    assert del_success.status_code == 200
    assert del_success.json()["message"] == "Comment deleted"

    # List again: should only contain 1 comment now
    list_resp2 = client.get("/items/CAT-COM/comments", headers=user_headers)
    assert len(list_resp2.json()) == 1

    # Delete non-existent comment
    del_fail_404 = client.delete(f"/item-comments/{comment_id}", headers=admin_headers)
    assert del_fail_404.status_code == 404
