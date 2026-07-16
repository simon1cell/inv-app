import pytest
from datetime import date, timedelta, datetime

def test_item_crud_and_permissions(client, admin_headers, user_headers):
    # Test Create Item (Admin)
    item_payload = {
        "catalogue_num": "CAT-001",
        "item_name": "Test Pipette Tips",
        "quantity": 10,
        "storage_id": "Cabinet A",
        "last_restocked": str(date.today()),
        "brand": "Eppendorf",
        "category": "Consumables",
        "reorder_threshold": 5,
        "critical_threshold": 2
    }
    
    # Non-admin cannot create
    create_fail = client.post("/items/", json=item_payload, headers=user_headers)
    assert create_fail.status_code == 403

    # Admin can create
    create_success = client.post("/items/", json=item_payload, headers=admin_headers)
    assert create_success.status_code == 200
    item_data = create_success.json()
    assert item_data["catalogue_num"] == "CAT-001"
    assert item_data["quantity"] == 10

    # Get single item
    get_resp = client.get("/items/CAT-001", headers=user_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["item_name"] == "Test Pipette Tips"

    # Get non-existent item
    get_fail = client.get("/items/NONEXISTENT", headers=user_headers)
    assert get_fail.status_code == 404

    # Update item (Non-admin fails, Admin succeeds)
    update_payload = {"quantity": 12, "brand": "Bio-Rad"}
    update_fail = client.put("/items/CAT-001", json=update_payload, headers=user_headers)
    assert update_fail.status_code == 403

    update_success = client.put("/items/CAT-001", json=update_payload, headers=admin_headers)
    assert update_success.status_code == 200
    assert update_success.json()["quantity"] == 12
    assert update_success.json()["brand"] == "Bio-Rad"

    # Delete item (Non-admin fails, Admin succeeds)
    del_fail = client.delete("/items/CAT-001", headers=user_headers)
    assert del_fail.status_code == 403

    del_success = client.delete("/items/CAT-001", headers=admin_headers)
    assert del_success.status_code == 200

    # Delete non-existent
    del_fail_404 = client.delete("/items/CAT-001", headers=admin_headers)
    assert del_fail_404.status_code == 404

def test_item_use_and_restock(client, admin_headers, user_headers):
    # Seed an item
    item_payload = {
        "catalogue_num": "CAT-002",
        "item_name": "Test Eppendorf Tubes",
        "quantity": 100,
        "storage_id": "Cabinet B",
        "last_restocked": str(date.today()),
        "brand": "Eppendorf",
        "category": "Plastics"
    }
    client.post("/items/", json=item_payload, headers=admin_headers)

    # Use item (Both user and admin can use)
    use_user = client.post("/items/CAT-002/use?amount=20", headers=user_headers)
    assert use_user.status_code == 200
    assert use_user.json()["quantity"] == 80

    use_admin = client.post("/items/CAT-002/use?amount=10", headers=admin_headers)
    assert use_admin.status_code == 200
    assert use_admin.json()["quantity"] == 70

    # Test invalid use amount
    use_invalid = client.post("/items/CAT-002/use?amount=-5", headers=user_headers)
    assert use_invalid.status_code == 422 # FastAPI query validation (gt=0) or 400

    # Test usage bounds
    use_excessive = client.post("/items/CAT-002/use?amount=100", headers=user_headers)
    assert use_excessive.status_code == 400
    assert use_excessive.json()["detail"] == "Not enough quantity"

    # Restock item (Admin only)
    restock_user = client.post("/items/CAT-002/restock?amount=30", headers=user_headers)
    assert restock_user.status_code == 403

    restock_admin = client.post("/items/CAT-002/restock?amount=30", headers=admin_headers)
    assert restock_admin.status_code == 200
    assert restock_admin.json()["quantity"] == 100

def test_item_transactions_and_permissions(client, admin_headers, user_headers):
    # Seed an item
    item_payload = {
        "catalogue_num": "CAT-003",
        "item_name": "Reagent A",
        "quantity": 50,
        "storage_id": "Fridge 1",
        "last_restocked": str(date.today()),
        "brand": "Sigma",
        "category": "Chemicals"
    }
    client.post("/items/", json=item_payload, headers=admin_headers)

    # Transaction: use/decrease amount (User is allowed)
    tx_use = client.post("/items/CAT-003/transaction?change_amount=-10", headers=user_headers)
    assert tx_use.status_code == 200
    assert tx_use.json()["quantity"] == 40

    # Transaction: increase amount (User is NOT allowed)
    tx_add_user = client.post("/items/CAT-003/transaction?change_amount=10", headers=user_headers)
    assert tx_add_user.status_code == 403

    # Transaction: increase amount (Admin is allowed)
    tx_add_admin = client.post("/items/CAT-003/transaction?change_amount=20", headers=admin_headers)
    assert tx_add_admin.status_code == 200
    assert tx_add_admin.json()["quantity"] == 60

    # Transaction: zero amount check
    tx_zero = client.post("/items/CAT-003/transaction?change_amount=0", headers=admin_headers)
    assert tx_zero.status_code == 400

    # Transaction: negative result bounds check
    tx_bounds = client.post("/items/CAT-003/transaction?change_amount=-100", headers=admin_headers)
    assert tx_bounds.status_code == 400

def test_items_filtering_and_dashboard(client, admin_headers, user_headers):
    # Seed items with different statuses
    # 1. Normal stock
    client.post("/items/", json={
        "catalogue_num": "CAT-NORMAL", "item_name": "Normal Item", "quantity": 10,
        "storage_id": "Shelf 1", "last_restocked": str(date.today()), "brand": "BrandA",
        "reorder_threshold": 5, "critical_threshold": 2
    }, headers=admin_headers)

    # 2. Low stock (quantity <= reorder_threshold)
    client.post("/items/", json={
        "catalogue_num": "CAT-LOW", "item_name": "Low Stock Item", "quantity": 4,
        "storage_id": "Shelf 1", "last_restocked": str(date.today()), "brand": "BrandA",
        "reorder_threshold": 5, "critical_threshold": 2
    }, headers=admin_headers)

    # 3. Critical stock (quantity <= critical_threshold)
    client.post("/items/", json={
        "catalogue_num": "CAT-CRIT", "item_name": "Critical Stock Item", "quantity": 1,
        "storage_id": "Shelf 1", "last_restocked": str(date.today()), "brand": "BrandA",
        "reorder_threshold": 5, "critical_threshold": 2
    }, headers=admin_headers)

    # 4. Out of stock (quantity <= 0)
    client.post("/items/", json={
        "catalogue_num": "CAT-OUT", "item_name": "Out of Stock Item", "quantity": 0,
        "storage_id": "Shelf 2", "last_restocked": str(date.today()), "brand": "BrandB",
        "reorder_threshold": 5, "critical_threshold": 2
    }, headers=admin_headers)

    # 5. Expiring soon (expiry_date within 14 days)
    expiring_soon_date = date.today() + timedelta(days=5)
    client.post("/items/", json={
        "catalogue_num": "CAT-EXP", "item_name": "Expiring Item", "quantity": 20,
        "storage_id": "Shelf 2", "last_restocked": str(date.today()), "brand": "BrandB",
        "expiry_date": str(expiring_soon_date), "reorder_threshold": 5, "critical_threshold": 2
    }, headers=admin_headers)

    # Test listings with filters
    # Filter by name
    res_name = client.get("/items/?name=Normal", headers=user_headers)
    assert len(res_name.json()) == 1
    assert res_name.json()[0]["catalogue_num"] == "CAT-NORMAL"

    # Filter by storage
    res_storage = client.get("/items/?storage_id=Shelf 2", headers=user_headers)
    assert len(res_storage.json()) == 2

    # Filter by status: out_of_stock
    res_out = client.get("/items/?status=out_of_stock", headers=user_headers)
    assert len(res_out.json()) == 1
    assert res_out.json()[0]["catalogue_num"] == "CAT-OUT"

    # Filter by status: critical
    res_crit = client.get("/items/?status=critical", headers=user_headers)
    assert len(res_crit.json()) == 1
    assert res_crit.json()[0]["catalogue_num"] == "CAT-CRIT"

    # Filter by status: low_stock
    # Note: low stock query returns items <= reorder_threshold (including critical and out of stock)
    # CAT-LOW (4), CAT-CRIT (1), CAT-OUT (0) are all low stock
    res_low = client.get("/items/?status=low_stock", headers=user_headers)
    assert len(res_low.json()) == 3

    # Filter by status: expiring_soon
    res_exp = client.get("/items/?status=expiring_soon", headers=user_headers)
    assert len(res_exp.json()) == 1
    assert res_exp.json()[0]["catalogue_num"] == "CAT-EXP"

    # Verify Dashboard Stats endpoint
    dash_resp = client.get("/dashboard", headers=user_headers)
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert stats["unique_items"] == 5
    assert stats["total_quantity"] == 10 + 4 + 1 + 0 + 20
    assert stats["out_of_stock"] == 1
    assert stats["critical"] == 1
    assert stats["low_stock"] == 3
    assert stats["expiring_soon"] == 1
