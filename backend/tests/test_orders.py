import pytest
from datetime import date
from io import BytesIO
from openpyxl import Workbook

def test_order_creation_and_inventory_placeholder(client, admin_headers, user_headers):
    # Non-admin cannot create order
    order_payload = {
        "item_name": "Test Pipettes",
        "catalog_no": "CAT-ORD-01",
        "vendor": "VWR",
        "category": "Consumables",
        "units_ordered": 10,
        "price_per_unit": 15.0,
        "status": "Ordered"
    }
    create_fail = client.post("/orders/", json=order_payload, headers=user_headers)
    assert create_fail.status_code == 403

    # Admin creates order (status is "Ordered")
    create_success = client.post("/orders/", json=order_payload, headers=admin_headers)
    assert create_success.status_code == 200
    order_data = create_success.json()
    assert order_data["id"] is not None
    assert order_data["status"] == "Ordered"
    order_id = order_data["id"]

    # Verify inventory placeholder item is automatically created with 0 quantity and Pending Order storage_id
    item_resp = client.get("/items/CAT-ORD-01", headers=user_headers)
    assert item_resp.status_code == 200
    item_data = item_resp.json()
    assert item_data["catalogue_num"] == "CAT-ORD-01"
    assert item_data["quantity"] == 0
    assert item_data["storage_id"] == "Pending Order"
    assert "pending" in item_data["tags"]

    # Get events for the order
    events_resp = client.get(f"/orders/{order_id}/events", headers=admin_headers)
    assert events_resp.status_code == 200

def test_order_delivered_and_paid_transitions(client, admin_headers, user_headers):
    # Create a new order
    order_payload = {
        "item_name": "Test Syringes",
        "catalog_no": "CAT-ORD-02",
        "vendor": "BD",
        "units_ordered": 50,
        "status": "Ordered"
    }
    create_resp = client.post("/orders/", json=order_payload, headers=admin_headers)
    order_id = create_resp.json()["id"]

    # Non-admin cannot mark delivered
    del_payload = {
        "delivery_date": str(date.today()),
        "received_by": "John Doe",
        "notes": "Delivered in good condition"
    }
    del_fail = client.post(f"/orders/{order_id}/mark-delivered", json=del_payload, headers=user_headers)
    assert del_fail.status_code == 403

    # Admin marks delivered
    del_success = client.post(f"/orders/{order_id}/mark-delivered", json=del_payload, headers=admin_headers)
    assert del_success.status_code == 200
    assert del_success.json()["status"] == "Delivered"

    # Verify inventory is incremented and storage_id updated
    item_resp = client.get("/items/CAT-ORD-02", headers=user_headers)
    assert item_resp.status_code == 200
    item_data = item_resp.json()
    assert item_data["quantity"] == 50
    assert item_data["storage_id"] == "Imported" # Receives into inventory from placeholder
    assert "received" in item_data["tags"]

    # Mark delivered again (should not increment inventory again, but update delivery info)
    client.post(f"/orders/{order_id}/mark-delivered", json=del_payload, headers=admin_headers)
    item_resp_after = client.get("/items/CAT-ORD-02", headers=user_headers)
    assert item_resp_after.json()["quantity"] == 50 # Remains 50, not 100

    # Non-admin cannot mark paid
    paid_payload = {
        "date_paid": str(date.today()),
        "amount_paid": 750.0,
        "cc_invoice": "INV-999",
        "notes": "Paid by CC"
    }
    paid_fail = client.post(f"/orders/{order_id}/mark-paid", json=paid_payload, headers=user_headers)
    assert paid_fail.status_code == 403

    # Admin marks paid
    paid_success = client.post(f"/orders/{order_id}/mark-paid", json=paid_payload, headers=admin_headers)
    assert paid_success.status_code == 200
    assert paid_success.json()["status"] == "Paid"
    assert paid_success.json()["amount_paid"] == 750.0

def test_orders_export_and_import(client, admin_headers, user_headers):
    # Seed an order to export
    order_payload = {
        "item_name": "Export Item",
        "catalog_no": "CAT-EXP-ORD",
        "vendor": "Millipore",
        "units_ordered": 5,
        "status": "Ordered"
    }
    client.post("/orders/", json=order_payload, headers=admin_headers)

    # Test Export
    export_resp = client.get("/orders/export", headers=admin_headers)
    assert export_resp.status_code == 200
    assert export_resp.headers["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(export_resp.content) > 0

    # Test Export Non-admin
    export_fail = client.get("/orders/export", headers=user_headers)
    assert export_fail.status_code == 403

    # Create mock Excel import file using openpyxl
    wb = Workbook()
    ws = wb.active
    ws.title = "Orders"
    ws.append(["Date", "Order Placed by", "PO Number", "Vendor", "Category", "Catalog No.", "Item Name", "# of Units", "Price / Unit", "Status"])
    ws.append(["2026-07-15", "Alice", "PO-100", "Sigma", "Chemicals", "CAT-EXCEL-1", "Excel Item 1", 5, 12.5, "Ordered"])
    ws.append(["2026-07-15", "Bob", "PO-101", "Fisher", "Plastics", "CAT-EXCEL-2", "Excel Item 2", 10, 2.0, "Delivered"])
    ws.append(["2026-07-15", "Charlie", "PO-102", "Microsoft", "IT Support", "CAT-EXCEL-3", "Office 365 License", 1, 100.0, "Ordered"]) # Service order

    file_stream = BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)

    # Test Import Non-admin
    import_fail = client.post(
        "/orders/import",
        files={"file": ("test.xlsx", file_stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=user_headers
    )
    assert import_fail.status_code == 403

    # Test Import Admin
    file_stream.seek(0)
    import_success = client.post(
        "/orders/import",
        files={"file": ("test.xlsx", file_stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=admin_headers
    )
    assert import_success.status_code == 200
    orders_imported = import_success.json()
    
    # Check that service order (CAT-EXCEL-3) was skipped, and the other 2 were imported
    assert len(orders_imported) == 2
    imported_catalogs = [o["catalog_no"] for o in orders_imported]
    assert "CAT-EXCEL-1" in imported_catalogs
    assert "CAT-EXCEL-2" in imported_catalogs
    assert "CAT-EXCEL-3" not in imported_catalogs

    # Verify inventory details for imported items
    # Excel Item 1 (Ordered): placeholder quantity should be 0
    item1 = client.get("/items/CAT-EXCEL-1", headers=user_headers).json()
    assert item1["quantity"] == 0
    assert item1["storage_id"] == "Pending Order"

    # Excel Item 2 (Delivered): should have been auto-received with quantity 10
    item2 = client.get("/items/CAT-EXCEL-2", headers=user_headers).json()
    assert item2["quantity"] == 10
    assert item2["storage_id"] == "Imported"
