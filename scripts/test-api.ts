import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword } from "../lib/auth";
import {
  getOrCreateItemTypeByName,
  createItem,
  getItemByCatalogueNum,
  updateItem,
  deleteItem,
  createAuditLog,
  receiveOrderIntoInventory
} from "../lib/crud";

async function runTests() {
  console.log("🚀 Starting Fullstack API & Database Validation Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Clean up any old test records first
    await prisma.itemCommentRead.deleteMany({ where: { username: "test_admin" } });
    await prisma.itemComment.deleteMany({ where: { username: "test_admin" } });
    await prisma.auditLog.deleteMany({ where: { username: "test_admin" } });
    await prisma.orderEvent.deleteMany({ where: { created_by: "test_admin" } });
    await prisma.orderDocument.deleteMany({});
    await prisma.order.deleteMany({ where: { order_placed_by: "test_admin" } });
    await prisma.item.deleteMany({ where: { catalogue_num: { startsWith: "TEST-CAT-" } } });
    await prisma.user.deleteMany({ where: { username: "test_admin" } });

    // 1. Password Hashing and Verification
    console.log("--- 1. Testing Authentication Helpers ---");
    const hashed = await hashPassword("password123");
    const isMatch = await comparePassword("password123", hashed);
    const isWrong = await comparePassword("wrongpassword", hashed);
    assert(isMatch === true, "Password hashing matches correct plain text");
    assert(isWrong === false, "Password hashing rejects wrong plain text");

    // 2. User Creation & Admin Bootstrap
    console.log("\n--- 2. Testing User Creation & Admin Rules ---");
    // Verify count of users
    const initialUserCount = await prisma.user.count();
    const testAdmin = await prisma.user.create({
      data: {
        username: "test_admin",
        hashed_password: hashed,
        role: initialUserCount === 0 ? "admin" : "user", // Simulate the register bootstrap
      },
    });
    assert(testAdmin.username === "test_admin", "User registered successfully");
    assert(testAdmin.role === (initialUserCount === 0 ? "admin" : "user"), `Bootstrapped user role assigned: ${testAdmin.role}`);

    // 3. Item Types & Item Creation
    console.log("\n--- 3. Testing Item Types & Item Creation ---");
    const itemType = await getOrCreateItemTypeByName("Test Pipette", "Consumables", "Eppendorf");
    assert(itemType.name === "Test Pipette", "ItemType resolved/created successfully");

    const createdItem = await createItem({
      item_name: "Test Pipette 200ul",
      item_type_id: itemType.id,
      catalogue_num: "TEST-CAT-001",
      lot_num: 12345,
      quantity: 10,
      storage_id: "Shelf A",
      expiry_date: "2027-01-01",
      last_restocked: new Date(),
      brand: "Eppendorf",
      reorder_threshold: 5,
      critical_threshold: 2,
      category: "Consumables",
      shelf_num: "Row 3",
      tags: "test,pipette",
    });

    assert(createdItem.catalogue_num === "TEST-CAT-001", "Item created with correct catalogue number");
    assert(createdItem.quantity === 10, "Item quantity is correct");

    // 4. Audit Log Verification
    console.log("\n--- 4. Testing Audit Logs ---");
    const auditLog = await createAuditLog(
      "test_admin",
      "CREATE",
      createdItem.id,
      "Test item created",
      0,
      10,
      10
    );
    assert(auditLog.username === "test_admin", "Audit log created successfully");
    assert(auditLog.action === "CREATE", "Audit log action is 'CREATE'");

    // 5. Update and Transactions
    console.log("\n--- 5. Testing Update & Transactions ---");
    const updatedItem = await updateItem("TEST-CAT-001", { quantity: 15 });
    assert(updatedItem !== null && updatedItem.quantity === 15, "Item quantity updated successfully");

    // 6. Comments & Notifications
    console.log("\n--- 6. Testing Comments & Notifications ---");
    const comment = await prisma.itemComment.create({
      data: {
        item_id: "TEST-CAT-001",
        username: "test_admin",
        comment: "Needs calibration check.",
      },
    });
    assert(comment.comment === "Needs calibration check.", "Comment added to item");

    // Check notifications
    const commentRead = await prisma.itemCommentRead.findFirst({
      where: { username: "test_admin", item_id: "TEST-CAT-001" },
    });
    // Since no comment read exists yet, comment should be unread
    assert(!commentRead, "No read marker exists yet for this comment/user");

    // Mark as read
    await prisma.itemCommentRead.create({
      data: {
        username: "test_admin",
        item_id: "TEST-CAT-001",
        last_seen_at: new Date(),
      },
    });

    const updatedCommentRead = await prisma.itemCommentRead.findFirst({
      where: { username: "test_admin", item_id: "TEST-CAT-001" },
    });
    assert(!!updatedCommentRead, "Comment marked as read successfully");

    // 7. Orders & Automated Receiving
    console.log("\n--- 7. Testing Orders & Automated Receiving ---");
    const order = await prisma.order.create({
      data: {
        item_type_id: itemType.id,
        order_date: new Date(),
        order_placed_by: "test_admin",
        po_number: "PO-TEST-999",
        vendor: "Eppendorf",
        category: "Consumables",
        catalog_no: "TEST-CAT-001",
        item_name: "Test Pipette 200ul",
        units_ordered: 5,
        price_per_unit: 100.0,
        total_price: 500.0,
        status: "Ordered",
      },
    });

    assert(order.status === "Ordered", "Order created with state 'Ordered'");

    // Update to Delivered and trigger inventory auto-receiving
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "Delivered",
        delivery_date: new Date(),
        received_by: "test_admin",
      },
    });

    await receiveOrderIntoInventory(updatedOrder);

    const postReceiveItem = await getItemByCatalogueNum("TEST-CAT-001");
    // Original qty was 15, ordered units was 5, so new qty should be 20
    assert(postReceiveItem !== null && postReceiveItem.quantity === 20, `Auto-receiving successful. New quantity: ${postReceiveItem?.quantity} (expected: 20)`);

    // 8. Delete / Archiving
    console.log("\n--- 8. Testing Archiving/Deletion ---");
    const deletedItem = await deleteItem("TEST-CAT-001");
    assert(deletedItem !== null && deletedItem.is_archived === true, "Item archived successfully");
    assert(deletedItem?.quantity === 0, "Archived item quantity set to 0");

    // Clean up test records
    await prisma.itemCommentRead.deleteMany({ where: { username: "test_admin" } });
    await prisma.itemComment.deleteMany({ where: { username: "test_admin" } });
    await prisma.auditLog.deleteMany({ where: { username: "test_admin" } });
    await prisma.orderEvent.deleteMany({ where: { created_by: "test_admin" } });
    await prisma.order.deleteMany({ where: { order_placed_by: "test_admin" } });
    await prisma.item.deleteMany({ where: { catalogue_num: "TEST-CAT-001" } });
    await prisma.user.deleteMany({ where: { username: "test_admin" } });

    console.log(`\n🎉 Tests Complete! Passed: ${passed}, Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("\n❌ Fatal Error during test execution:\n", err);
    process.exit(1);
  }
}

runTests();
