import pytest
from datetime import date
from io import BytesIO
import main
from pathlib import Path
import tempfile

@pytest.fixture(autouse=True)
def temp_upload_root(tmp_path):
    # Override UPLOAD_ROOT in main to use a temporary directory for each test
    original_root = main.UPLOAD_ROOT
    main.UPLOAD_ROOT = tmp_path
    yield
    main.UPLOAD_ROOT = original_root

def test_document_routes_and_transitions(client, admin_headers, user_headers):
    # Seed an order
    order_payload = {
        "item_name": "Test Pipette Tips Box",
        "catalog_no": "CAT-DOC-01",
        "vendor": "USA Scientific",
        "units_ordered": 20,
        "status": "Ordered"
    }
    order_resp = client.post("/orders/", json=order_payload, headers=admin_headers)
    order_id = order_resp.json()["id"]

    # 1. Non-admin cannot list documents
    list_fail = client.get(f"/orders/{order_id}/documents", headers=user_headers)
    assert list_fail.status_code == 403

    # Admin lists documents (should be empty initially)
    list_success = client.get(f"/orders/{order_id}/documents", headers=admin_headers)
    assert list_success.status_code == 200
    assert len(list_success.json()) == 0

    # List documents for non-existent order
    list_fail_404 = client.get("/orders/9999/documents", headers=admin_headers)
    assert list_fail_404.status_code == 404

    # 2. Document upload permissions and type validation
    dummy_pdf = BytesIO(b"dummy pdf contents")
    
    # Non-admin upload fails
    upload_fail = client.post(
        f"/orders/{order_id}/documents?document_type=invoice",
        files={"file": ("invoice.pdf", dummy_pdf, "application/pdf")},
        headers=user_headers
    )
    assert upload_fail.status_code == 403

    # Invalid document type fails
    dummy_pdf.seek(0)
    upload_fail_type = client.post(
        f"/orders/{order_id}/documents?document_type=invalid_type",
        files={"file": ("invoice.pdf", dummy_pdf, "application/pdf")},
        headers=admin_headers
    )
    assert upload_fail_type.status_code == 400

    # 3. Upload confirmation document (should mark order status as Confirmed)
    dummy_pdf.seek(0)
    upload_conf = client.post(
        f"/orders/{order_id}/documents?document_type=confirmation",
        files={"file": ("conf.pdf", dummy_pdf, "application/pdf")},
        headers=admin_headers
    )
    assert upload_conf.status_code == 200
    conf_data = upload_conf.json()
    assert conf_data["document_type"] == "confirmation"
    conf_doc_id = conf_data["id"]

    # Verify order is now Confirmed
    order_conf_check = client.get("/orders/", headers=admin_headers)
    target_order = [o for o in order_conf_check.json() if o["id"] == order_id][0]
    assert target_order["status"] == "Confirmed"

    # 4. Upload invoice document (should mark order status as Invoice Received)
    dummy_pdf.seek(0)
    upload_inv = client.post(
        f"/orders/{order_id}/documents?document_type=invoice",
        files={"file": ("invoice.pdf", dummy_pdf, "application/pdf")},
        headers=admin_headers
    )
    assert upload_inv.status_code == 200
    inv_doc_id = upload_inv.json()["id"]

    order_inv_check = client.get("/orders/", headers=admin_headers)
    target_order = [o for o in order_inv_check.json() if o["id"] == order_id][0]
    assert target_order["status"] == "Invoice Received"

    # 5. Upload delivery document (should mark order status as Delivered and receive items)
    dummy_pdf.seek(0)
    upload_deliv = client.post(
        f"/orders/{order_id}/documents?document_type=delivery",
        files={"file": ("delivery_slip.pdf", dummy_pdf, "application/pdf")},
        headers=admin_headers
    )
    assert upload_deliv.status_code == 200
    deliv_doc_id = upload_deliv.json()["id"]

    order_deliv_check = client.get("/orders/", headers=admin_headers)
    target_order = [o for o in order_deliv_check.json() if o["id"] == order_id][0]
    assert target_order["status"] == "Delivered"

    # Check inventory was incremented
    item_resp = client.get("/items/CAT-DOC-01", headers=user_headers)
    assert item_resp.json()["quantity"] == 20

    # 6. Document downloads
    # Non-admin download fails
    dl_fail = client.get(f"/order-documents/{inv_doc_id}/download", headers=user_headers)
    assert dl_fail.status_code == 403

    # Admin download succeeds
    dl_success = client.get(f"/order-documents/{inv_doc_id}/download", headers=admin_headers)
    assert dl_success.status_code == 200
    assert dl_success.content == b"dummy pdf contents"

    # Download non-existent document
    dl_fail_404 = client.get("/order-documents/9999/download", headers=admin_headers)
    assert dl_fail_404.status_code == 404

    # 7. Document deletion
    # Non-admin delete fails
    del_doc_fail = client.delete(f"/order-documents/{inv_doc_id}", headers=user_headers)
    assert del_doc_fail.status_code == 403

    # Admin delete succeeds
    del_doc_success = client.delete(f"/order-documents/{inv_doc_id}", headers=admin_headers)
    assert del_doc_success.status_code == 200
    assert del_doc_success.json()["message"] == "Document deleted"

    # Verify document is removed from database list
    list_after_del = client.get(f"/orders/{order_id}/documents", headers=admin_headers)
    doc_ids = [d["id"] for d in list_after_del.json()]
    assert inv_doc_id not in doc_ids

    # Delete non-existent document
    del_doc_fail_404 = client.delete(f"/order-documents/{inv_doc_id}", headers=admin_headers)
    assert del_doc_fail_404.status_code == 404
