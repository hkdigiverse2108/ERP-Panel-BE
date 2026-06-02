import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "./database/connection";
import { companyModel, branchModel, productModel, stockModel, PosOrderModel, uomModel, taxModel, userModel, PosCashRegisterModel, contactModel, supplierBillModel, InvoiceModel } from "./database";
import { addProduct, editProduct, getOneProduct, getProductDropdown, getByBarcode, getAllProduct } from "./controllers/product";
import { addStock, getOneStock, getAllStock, bulkStockAdjustment } from "./controllers/stock";
import { addPosOrder, editPosOrder, deletePosOrder } from "./controllers/posOrder";
import { addSupplierBill, editSupplierBill, deleteSupplierBill } from "./controllers/supplierBill";
import { addInvoice, editInvoice, deleteInvoice } from "./controllers/invoice";
import { HTTP_STATUS } from "./common";

const ObjectId = mongoose.Types.ObjectId;

function mockResponse() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return res;
}

function mockRequest(body: any, headers: any = {}, params: any = {}, query: any = {}) {
  return {
    body,
    headers,
    params,
    query,
    header: (name: string) => {
      if (name.toLowerCase() === "user-agent") {
        return "Mozilla/5.0 (Mock User Agent)";
      }
      return headers[name] || headers[name.toLowerCase()] || "";
    }
  };
}

async function runTests() {
  console.log("=== Starting Integration Tests for Variants & Barcode Updates ===");
  await connectDb();

  // 1. Get or create base records (Company, Branch, UOM, Tax)
  let company: any = await companyModel.findOne();
  if (!company) {
    company = await companyModel.create({ name: "Test Company", isActive: true });
    console.log("Created temporary company:", company._id);
  }
  let branch: any = await branchModel.findOne({ companyId: company._id });
  if (!branch) {
    branch = await branchModel.create({ name: "Test Branch", companyId: company._id, isActive: true });
    console.log("Created temporary branch:", branch._id);
  }
  let uom: any = await uomModel.findOne();
  if (!uom) {
    uom = await uomModel.create({ name: "Unit", code: "PCS" });
    console.log("Created temporary UOM:", uom._id);
  }
  let tax: any = await taxModel.findOne();
  if (!tax) {
    tax = await taxModel.create({ name: "GST 18%", percentage: 18 });
    console.log("Created temporary Tax:", tax._id);
  }

  // Always create a fresh employee user for deterministic userType in tests
  const user: any = await userModel.create({
    fullName: "Test Salesman",
    email: "salesman_" + Date.now() + "@test.com",
    password: "password",
    userType: "employee",
    isActive: true,
    companyId: company._id,
    branchId: branch._id
  });
  const createdUser = true;
  console.log("Created temporary user:", user._id);

  // Create an open cash register for the test branch
  const register: any = await PosCashRegisterModel.create({
    companyId: company._id,
    branchId: branch._id,
    openingCash: 1000,
    status: "open",
    registerNo: "REG-" + Date.now(),
    createdBy: user._id
  });
  console.log("Created open cash register:", register._id);

  // Setup headers / user context
  const mockHeaders = {
    user: {
      _id: user._id,
      userType: user.userType,
      companyId: { _id: company._id },
      branchId: { _id: branch._id }
    }
  };

  // Keep track of created IDs for cleanup
  const productsToClean: string[] = [];
  const stocksToClean: string[] = [];
  const ordersToClean: string[] = [];
  const contactsToClean: string[] = [];
  const billsToClean: string[] = [];
  const invoicesToClean: string[] = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Create a product with variants & barcode
    // ----------------------------------------------------
    console.log("\n[Test 1] Creating product with variants and barcode...");
    const req1 = mockRequest({
      name: "Test T-Shirt " + Date.now(),
      barcode: "TSHIRT123",
      barcodeType: "CODE_128",
      variants: [
        {
          name: "Red / L",
          sku: "TSHIRT-RED-L",
          barcode: "BAR-RED-L",
          barcodeType: "EAN_13",
          mrp: 500,
          sellingPrice: 450,
          purchasePrice: 300,
          attributes: [{ key: "color", value: "Red" }, { key: "size", value: "L" }]
        },
        {
          name: "Blue / M",
          sku: "TSHIRT-BLUE-M",
          barcode: "BAR-BLUE-M",
          barcodeType: "EAN_13",
          mrp: 480,
          sellingPrice: 430,
          purchasePrice: 280,
          attributes: [{ key: "color", value: "Blue" }, { key: "size", value: "M" }]
        }
      ]
    }, mockHeaders);
    const res1 = mockResponse();
    await addProduct(req1, res1);

    if (res1.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Failed to create product: ${res1.jsonData?.message}`);
    }
    const product1: any = res1.jsonData.data;
    productsToClean.push(product1._id.toString());
    console.log(`Product created: ${product1.name} (_id: ${product1._id})`);
    console.log(`Number of variants: ${product1.variants?.length}`);

    // ----------------------------------------------------
    // TEST 1B: Create a product and variants WITHOUT barcodes (Auto-Generation Check)
    // ----------------------------------------------------
    console.log("\n[Test 1B] Creating product and variants WITHOUT barcodes to check auto-generation...");
    const req1B = mockRequest({
      name: "Auto Barcode Shirt " + Date.now(),
      // barcode left empty
      variants: [
        {
          name: "White / L",
          sku: "SHIRT-WHITE-L",
          mrp: 400,
          sellingPrice: 350,
          purchasePrice: 200,
          attributes: [{ key: "color", value: "White" }, { key: "size", value: "L" }]
        },
        {
          name: "Black / M",
          sku: "SHIRT-BLACK-M",
          mrp: 400,
          sellingPrice: 350,
          purchasePrice: 200,
          attributes: [{ key: "color", value: "Black" }, { key: "size", value: "M" }]
        }
      ]
    }, mockHeaders);
    const res1B = mockResponse();
    await addProduct(req1B, res1B);
    if (res1B.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Failed to create product with auto-generated barcodes: ${res1B.jsonData?.message}`);
    }
    const product1B: any = res1B.jsonData.data;
    productsToClean.push(product1B._id.toString());
    console.log(`Product created: ${product1B.name} (_id: ${product1B._id})`);
    console.log(`Product Auto Barcode: ${product1B.barcode} (Type: ${product1B.barcodeType})`);
    if (!product1B.barcode || !product1B.barcode.startsWith("200") || product1B.barcode.length !== 13) {
      throw new Error(`Invalid auto-generated product barcode: ${product1B.barcode}`);
    }
    product1B.variants.forEach((v: any, index: number) => {
      console.log(`Variant ${index} Auto Barcode: ${v.barcode} (Type: ${v.barcodeType})`);
      if (!v.barcode || !v.barcode.startsWith("200") || v.barcode.length !== 13) {
        throw new Error(`Invalid auto-generated variant barcode: ${v.barcode}`);
      }
    });
    console.log("Success: Product and variants auto-generated valid EAN-13 barcodes successfully!");

    // ----------------------------------------------------
    // TEST 2: Validate product-level barcode duplicate check
    // ----------------------------------------------------
    console.log("\n[Test 2] Testing duplicate product-level barcode...");
    const req2 = mockRequest({
      name: "Another Shirt " + Date.now(),
      barcode: "TSHIRT123", // Duplicate barcode
    }, mockHeaders);
    const res2 = mockResponse();
    await addProduct(req2, res2);
    if (res2.statusCode === HTTP_STATUS.CONFLICT) {
      console.log("Success: Duplicate product barcode rejected (Conflict).");
    } else {
      throw new Error(`Duplicate product barcode was not rejected. Status: ${res2.statusCode}`);
    }

    // ----------------------------------------------------
    // TEST 3: Validate variant-level barcode duplicate check
    // ----------------------------------------------------
    console.log("\n[Test 3] Testing duplicate variant-level barcode...");
    const req3 = mockRequest({
      name: "Yet Another Shirt " + Date.now(),
      barcode: "NEWBARCODE",
      variants: [
        {
          name: "Green / S",
          barcode: "BAR-RED-L" // Duplicate variant barcode from product1
        }
      ]
    }, mockHeaders);
    const res3 = mockResponse();
    await addProduct(req3, res3);
    if (res3.statusCode === HTTP_STATUS.CONFLICT) {
      console.log("Success: Duplicate variant barcode rejected (Conflict).");
    } else {
      throw new Error(`Duplicate variant barcode was not rejected. Status: ${res3.statusCode}`);
    }

    // ----------------------------------------------------
    // TEST 4: Edit Product - Add, Update and Remove variants
    // ----------------------------------------------------
    console.log("\n[Test 4] Editing product (updating variants)...");
    const variantToUpdate: any = product1.variants[0]; // Red / L
    const variantToRemove: any = product1.variants[1]; // Blue / M

    const req4 = mockRequest({
      productId: product1._id.toString(),
      name: product1.name + " (Edited)",
      removeVariantIds: [variantToRemove._id.toString()],
      variants: [
        {
          _id: variantToUpdate._id.toString(),
          name: "Red / L (Modified)",
          mrp: 600, // Change mrp
          sellingPrice: 550
        },
        {
          name: "Yellow / S (New)",
          sku: "TSHIRT-YELLOW-S",
          barcode: "BAR-YELLOW-S",
          barcodeType: "EAN_13",
          mrp: 400,
          sellingPrice: 350,
          attributes: [{ key: "color", value: "Yellow" }, { key: "size", value: "S" }]
        }
      ]
    }, mockHeaders);
    const res4 = mockResponse();
    await editProduct(req4, res4);
    if (res4.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Product edit failed: ${res4.jsonData?.message}`);
    }

    // Retrieve updated product
    const req4_retrieve = mockRequest({}, mockHeaders, { id: product1._id.toString() });
    const res4_retrieve = mockResponse();
    await getOneProduct(req4_retrieve, res4_retrieve);
    const updatedProduct: any = res4_retrieve.jsonData.data;

    console.log("Success: Product updated.");
    console.log("Remaining/Added variants:");
    updatedProduct.variants.forEach((v: any) => {
      console.log(` - ${v.name}: mrp=${v.mrp}, barcode=${v.barcode}, _id=${v._id}`);
    });

    const hasRed = updatedProduct.variants.find((v: any) => v._id.toString() === variantToUpdate._id.toString() && v.mrp === 600);
    const hasYellow = updatedProduct.variants.find((v: any) => v.name.includes("Yellow"));
    const hasBlue = updatedProduct.variants.find((v: any) => v._id.toString() === variantToRemove._id.toString());

    if (!hasRed) throw new Error("Variant Red / L was not updated correctly.");
    if (!hasYellow) throw new Error("Variant Yellow / S was not added.");
    if (hasBlue) throw new Error("Variant Blue / M was not removed.");
    console.log("Success: Subdocument addition, update, and removal verified!");

    // ----------------------------------------------------
    // TEST 5: addStock for variants (Scoped uniqueness)
    // ----------------------------------------------------
    console.log("\n[Test 5] Adding stock for product variants...");
    const redVariant: any = updatedProduct.variants.find((v: any) => v.name.includes("Red"));
    const yellowVariant: any = updatedProduct.variants.find((v: any) => v.name.includes("Yellow"));

    // Add stock for Red Variant
    const stockReq1 = mockRequest({
      productId: product1._id.toString(),
      variantId: redVariant._id.toString(),
      qty: 20,
      mrp: 600,
      sellingPrice: 550,
      uomId: uom._id.toString(),
      companyId: company._id.toString(),
      branchId: branch._id.toString()
    }, mockHeaders);
    const stockRes1 = mockResponse();
    await addStock(stockReq1, stockRes1);
    if (stockRes1.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Failed to add stock for Red variant: ${stockRes1.jsonData?.message}`);
    }
    stocksToClean.push(stockRes1.jsonData.data._id.toString());
    console.log("Success: Added 20 qty stock for Red variant");

    // Add stock for Yellow Variant
    const stockReq2 = mockRequest({
      productId: product1._id.toString(),
      variantId: yellowVariant._id.toString(),
      qty: 15,
      mrp: 400,
      sellingPrice: 350,
      uomId: uom._id.toString(),
      companyId: company._id.toString(),
      branchId: branch._id.toString()
    }, mockHeaders);
    const stockRes2 = mockResponse();
    await addStock(stockReq2, stockRes2);
    if (stockRes2.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Failed to add stock for Yellow variant: ${stockRes2.jsonData?.message}`);
    }
    stocksToClean.push(stockRes2.jsonData.data._id.toString());
    console.log("Success: Added 15 qty stock for Yellow variant");

    // Retrieve stocks via getOneStock
    console.log("\nRetrieving stock details for product...");
    const stockGetReq = mockRequest({}, mockHeaders, { id: product1._id.toString() }, {});
    const stockGetRes = mockResponse();
    await getOneStock(stockGetReq, stockGetRes);
    const stockSummary = stockGetRes.jsonData.data;
    console.log(`Total availableQty across variants: ${stockSummary.availableQty}`);
    console.log("Variants Stock breakdown:");
    console.log(stockSummary.variantsStock);

    if (stockSummary.availableQty !== 35) {
      throw new Error(`Expected total qty to be 35, but got ${stockSummary.availableQty}`);
    }
    if (stockSummary.variantsStock.length !== 2) {
      throw new Error(`Expected 2 variant stock records, but got ${stockSummary.variantsStock.length}`);
    }
    console.log("Success: Scoped uniqueness and variant stock breakdown verified!");

    // ----------------------------------------------------
    // TEST 6: getProductDropdown with barcodeSearch
    // ----------------------------------------------------
    console.log("\n[Test 6] Testing getProductDropdown with barcodeSearch...");
    // Search Yellow variant barcode
    const dropdownReq = mockRequest({}, mockHeaders, {}, {
      barcodeSearch: "BAR-YELLOW-S",
      companyFilter: company._id.toString(),
      branchFilter: branch._id.toString()
    });
    const dropdownRes = mockResponse();
    await getProductDropdown(dropdownReq, dropdownRes);
    if (dropdownRes.statusCode !== HTTP_STATUS.OK || dropdownRes.jsonData.data.length === 0) {
      throw new Error("Failed to find product via barcode dropdown search");
    }
    const matchedDropdownResult = dropdownRes.jsonData.data[0];
    console.log("Success: Found product by variant barcode in dropdown.");
    console.log(`Matched name: ${matchedDropdownResult.name}, sellingPrice: ${matchedDropdownResult.sellingPrice}, qty: ${matchedDropdownResult.qty}`);
    if (matchedDropdownResult.sellingPrice !== 350 || matchedDropdownResult.qty !== 15) {
      throw new Error("Variant price or qty is incorrect in dropdown response");
    }
    if (!matchedDropdownResult.name.includes("Yellow / S")) {
      throw new Error(`Expected variant name in dropdown result name, but got: ${matchedDropdownResult.name}`);
    }
    if (matchedDropdownResult.barcode !== "BAR-YELLOW-S") {
      throw new Error(`Expected barcode "BAR-YELLOW-S" in dropdown result, but got: ${matchedDropdownResult.barcode}`);
    }
    if (!matchedDropdownResult.variantId) {
      throw new Error("Expected variantId at the top level of the dropdown result");
    }

    // ----------------------------------------------------
    // TEST 7: getByBarcode scan endpoint
    // ----------------------------------------------------
    console.log("\n[Test 7] Testing GET /barcode/:code scan endpoint...");
    const scanReq = mockRequest({}, mockHeaders, { code: "BAR-RED-L" });
    const scanRes = mockResponse();
    await getByBarcode(scanReq, scanRes);
    if (scanRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Scan endpoint failed: ${scanRes.jsonData?.message}`);
    }
    const scanData = scanRes.jsonData.data;
    console.log("Success: Scan endpoint resolved barcode successfully.");
    console.log(`Matched Product: ${scanData.product.name}`);
    console.log(`Matched Variant: ${scanData.matchedVariant?.name}`);
    console.log(`Stock: qty=${scanData.stock?.qty}, mrp=${scanData.stock?.mrp}`);
    if (scanData.stock?.qty !== 20 || scanData.matchedVariant?.name !== "Red / L (Modified)") {
      throw new Error("Incorrect product variant/stock resolved by barcode");
    }

    // ----------------------------------------------------
    // TEST 7B: getOneProduct with variantId query param
    // ----------------------------------------------------
    console.log("\n[Test 7B] Testing getOneProduct with variantId query param...");
    // 1. Fetch with non-existent variant ID
    const badVariantReq = mockRequest({}, mockHeaders, { id: product1._id.toString() }, { variantId: new ObjectId().toString() });
    const badVariantRes = mockResponse();
    await getOneProduct(badVariantReq, badVariantRes);
    if (badVariantRes.statusCode !== HTTP_STATUS.NOT_FOUND) {
      throw new Error(`Expected 404 for bad variant ID, got ${badVariantRes.statusCode}`);
    }
    console.log("Success: Non-existent variant ID returned 404 as expected.");

    // 2. Fetch with valid variant ID
    const goodVariantReq = mockRequest({}, mockHeaders, { id: product1._id.toString() }, { variantId: redVariant._id.toString() });
    const goodVariantRes = mockResponse();
    await getOneProduct(goodVariantReq, goodVariantRes);
    if (goodVariantRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Failed to fetch variant via getOneProduct: ${goodVariantRes.jsonData?.message}`);
    }
    const variantProd = goodVariantRes.jsonData.data;
    console.log(`Resolved Product: ${variantProd.name}, Qty: ${variantProd.qty}, MRP: ${variantProd.mrp}`);
    if (variantProd.qty !== 20 || variantProd.mrp !== 600 || variantProd.sellingPrice !== 550) {
      throw new Error(`Scoped stock/price for variant is incorrect: qty=${variantProd.qty}, mrp=${variantProd.mrp}`);
    }
    if (variantProd.variants.length !== 1 || variantProd.variantsWithStock.length !== 1) {
      throw new Error(`Expected exactly 1 variant in the variants list, got variants=${variantProd.variants.length}, variantsWithStock=${variantProd.variantsWithStock.length}`);
    }
    console.log("Success: Scoped variant lookup and pricing verified successfully!");

    // ----------------------------------------------------
    // TEST 8: POS Order creation, stock deduction, and reversion
    // ----------------------------------------------------
    console.log("\n[Test 8] Testing POS Order stock updates for variants...");
    const salesMan = user._id;

    // Create POS Order
    const posReq = mockRequest({
      salesManId: salesMan.toString(),
      companyId: company._id.toString(),
      branchId: branch._id.toString(),
      totalQty: 2,
      totalMrp: 1200,
      totalAmount: 1100,
      paymentMethod: "cash",
      paymentStatus: "paid",
      status: "completed",
      items: [
        {
          productId: product1._id.toString(),
          variantId: redVariant._id.toString(), // Deduct 2 from Red (initial=20)
          qty: 2,
          mrp: 600,
          unitCost: 550,
          netAmount: 1100
        }
      ],
      additionalCharges: []
    }, mockHeaders);
    const posRes = mockResponse();
    await addPosOrder(posReq, posRes);
    if (posRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`POS Order creation failed: ${posRes.jsonData?.message}`);
    }
    const orderId = posRes.jsonData.data._id.toString();
    ordersToClean.push(orderId);
    console.log(`POS Order created: ${orderId}`);

    // Verify Red variant stock is decreased to 18
    let checkStockRed: any = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Red variant qty after order deduction: ${checkStockRed?.qty} (Expected: 18)`);
    if (checkStockRed?.qty !== 18) {
      throw new Error(`Expected 18, but got ${checkStockRed?.qty}`);
    }

    // Edit POS Order (Increase qty to 5 - stock should become 15)
    console.log("Editing POS Order (changing quantity to 5)...");
    const editPosReq = mockRequest({
      posOrderId: orderId,
      totalQty: 5,
      totalMrp: 3000,
      totalAmount: 2750,
      items: [
        {
          productId: product1._id.toString(),
          variantId: redVariant._id.toString(),
          qty: 5,
          mrp: 600,
          unitCost: 550,
          netAmount: 2750
        }
      ]
    }, mockHeaders);
    const editPosRes = mockResponse();
    await editPosOrder(editPosReq, editPosRes);
    if (editPosRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`POS Order edit failed: ${editPosRes.jsonData?.message}`);
    }

    checkStockRed = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Red variant qty after edit: ${checkStockRed?.qty} (Expected: 15)`);
    if (checkStockRed?.qty !== 15) {
      throw new Error(`Expected 15, but got ${checkStockRed?.qty}`);
    }

    // Delete/Cancel POS Order (Revert stock back to 20)
    console.log("Deleting POS Order (reverting stock)...");
    const deletePosReq = mockRequest({}, mockHeaders, { id: orderId }, {});
    const deletePosRes = mockResponse();
    await deletePosOrder(deletePosReq, deletePosRes);
    if (deletePosRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`POS Order deletion failed: ${deletePosRes.jsonData?.message}`);
    }

    checkStockRed = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Red variant qty after deletion/revert: ${checkStockRed?.qty} (Expected: 20)`);
    if (checkStockRed?.qty !== 20) {
      throw new Error(`Expected 20, but got ${checkStockRed?.qty}`);
    }
    // ----------------------------------------------------
    // TEST 9: getAllProduct — variants expanded as flat rows
    // ----------------------------------------------------
    console.log("\n[Test 9] Testing getAllProduct with expanded variant rows...");
    const getAllReq = mockRequest({}, mockHeaders, {}, { page: "1", limit: "50" });
    const getAllRes = mockResponse();
    await getAllProduct(getAllReq, getAllRes);
    if (getAllRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`getAllProduct failed: ${getAllRes.jsonData?.message}`);
    }
    const productsList: any[] = getAllRes.jsonData.data.product_data;

    // Both variants should appear as separate flat rows (not nested inside a parent)
    const redRow = productsList.find((r: any) =>
      r._id.toString() === product1._id.toString() && r.variantId?.toString() === redVariant._id.toString()
    );
    const yellowRow = productsList.find((r: any) =>
      r._id.toString() === product1._id.toString() && r.variantId?.toString() === yellowVariant._id.toString()
    );
    // The raw parent product (without variantId) should NOT appear as a separate row
    const parentRow = productsList.find((r: any) =>
      r._id.toString() === product1._id.toString() && !r.variantId
    );

    console.log("Red row found:", !!redRow, "qty:", redRow?.qty);
    console.log("Yellow row found:", !!yellowRow, "qty:", yellowRow?.qty);
    console.log("Parent row (should be absent):", !!parentRow);

    if (!redRow) throw new Error("Red variant is missing from getAllProduct flat list");
    if (!yellowRow) throw new Error("Yellow variant is missing from getAllProduct flat list");
    if (parentRow) throw new Error("Parent product appeared as a separate row — should only show variants");
    if (redRow.qty !== 20) throw new Error(`Expected Red qty=20 but got ${redRow.qty}`);
    if (yellowRow.qty !== 15) throw new Error(`Expected Yellow qty=15 but got ${yellowRow.qty}`);
    if (!redRow.name.includes("Red")) throw new Error("Red row name should contain variant name");
    if (!redRow.variants) {
      // variants nested array should be stripped from the flat row
      console.log("Success: nested variants array not present in flat row.");
    }
    console.log("Success: getAllProduct returns flat expanded variant rows with correct stock!");

    // ----------------------------------------------------
    // TEST 10: supplierBill variant-aware stock updates
    // ----------------------------------------------------
    console.log("\n[Test 10] Testing supplierBill variant-aware stock updates...");
    let contact: any = await contactModel.findOne({ companyId: company._id });
    if (!contact) {
      contact = await contactModel.create({
        companyId: company._id,
        branchId: branch._id,
        firstName: "Test",
        lastName: "Contact",
        companyName: "Test Contact Company",
        phoneNo: "9876543210",
        contactType: "supplier",
        address: [
          {
            addressLine1: "123 Supplier Street",
            pinCode: 123456
          }
        ]
      });
    }
    contactsToClean.push(contact._id.toString());

    // Clean up any existing stock for redVariant
    await stockModel.deleteMany({ productId: product1._id, variantId: redVariant._id });

    const billItems = [
      {
        productId: product1._id.toString(),
        variantId: redVariant._id.toString(),
        qty: 10,
        uomId: uom._id.toString(),
        unit: "PCS",
        unitCost: 500,
        mrp: 600,
        sellingPrice: 550,
      }
    ];

    const addBillReq = mockRequest({
      supplierId: contact._id.toString(),
      supplierBillDate: new Date(),
      billingAddress: contact.address[0]._id.toString(),
      productDetails: billItems,
      companyId: company._id.toString(),
      branchId: branch._id.toString()
    }, mockHeaders);
    const addBillRes = mockResponse();
    await addSupplierBill(addBillReq, addBillRes);
    if (addBillRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`addSupplierBill failed: ${addBillRes.jsonData?.message}`);
    }
    const billId = addBillRes.jsonData.data._id;
    billsToClean.push(billId.toString());

    let billStock = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Stock qty for Red variant after supplier bill: ${billStock?.qty} (Expected: 10)`);
    if (!billStock || billStock.qty !== 10) {
      throw new Error(`Expected 10, but got ${billStock?.qty}`);
    }

    console.log("Editing supplier bill (changing quantity to 12)...");
    const editBillReq = mockRequest({
      supplierBillId: billId.toString(),
      productDetails: [
        {
          productId: product1._id.toString(),
          variantId: redVariant._id.toString(),
          qty: 12,
          uomId: uom._id.toString(),
          unit: "PCS",
          unitCost: 500,
          mrp: 600,
          sellingPrice: 550,
        }
      ]
    }, mockHeaders);
    const editBillRes = mockResponse();
    await editSupplierBill(editBillReq, editBillRes);
    if (editBillRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`editSupplierBill failed: ${editBillRes.jsonData?.message}`);
    }
    billStock = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Stock qty for Red variant after edit: ${billStock?.qty} (Expected: 12)`);
    if (!billStock || billStock.qty !== 12) {
      throw new Error(`Expected 12, but got ${billStock?.qty}`);
    }

    // ----------------------------------------------------
    // TEST 11: invoice variant-aware stock updates
    // ----------------------------------------------------
    console.log("\n[Test 11] Testing invoice variant-aware stock updates...");
    const addInvReq = mockRequest({
      customerId: contact._id.toString(),
      date: new Date(),
      dueDate: new Date(),
      billingAddress: contact.address[0]._id.toString(),
      items: [
        {
          productId: product1._id.toString(),
          variantId: redVariant._id.toString(),
          qty: 3,
          price: 550,
          uomId: uom._id.toString(),
          unit: "PCS",
          taxableAmount: 1650,
          totalAmount: 1650
        }
      ],
      companyId: company._id.toString(),
      branchId: branch._id.toString()
    }, mockHeaders);
    const addInvRes = mockResponse();
    await addInvoice(addInvReq, addInvRes);
    if (addInvRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`addInvoice failed: ${addInvRes.jsonData?.message}`);
    }
    const invoiceId = addInvRes.jsonData.data._id;
    invoicesToClean.push(invoiceId.toString());

    let invStock = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Stock qty for Red variant after invoice: ${invStock?.qty} (Expected: 9)`); // 12 - 3 = 9
    if (!invStock || invStock.qty !== 9) {
      throw new Error(`Expected 9, but got ${invStock?.qty}`);
    }

    console.log("Deleting invoice (reverting stock)...");
    const deleteInvReq = mockRequest({}, mockHeaders, { id: invoiceId.toString() });
    const deleteInvRes = mockResponse();
    await deleteInvoice(deleteInvReq, deleteInvRes);
    if (deleteInvRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`deleteInvoice failed: ${deleteInvRes.jsonData?.message}`);
    }
    invStock = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Stock qty for Red variant after invoice deletion: ${invStock?.qty} (Expected: 12)`);
    if (!invStock || invStock.qty !== 12) {
      throw new Error(`Expected 12, but got ${invStock?.qty}`);
    }

    console.log("Deleting supplier bill (reverting stock)...");
    const deleteBillReq = mockRequest({}, mockHeaders, { id: billId.toString() });
    const deleteBillRes = mockResponse();
    await deleteSupplierBill(deleteBillReq, deleteBillRes);
    if (deleteBillRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`deleteSupplierBill failed: ${deleteBillRes.jsonData?.message}`);
    }
    billStock = await stockModel.findOne({ productId: product1._id, variantId: redVariant._id });
    console.log(`Stock qty for Red variant after deletion: ${billStock?.qty} (Expected: 0)`);
    if (billStock && billStock.qty !== 0) {
      throw new Error(`Expected 0, but got ${billStock?.qty}`);
    }

    // ----------------------------------------------------
    // TEST 12: getAllStock — flat expanded variant stock rows
    // ----------------------------------------------------
    console.log("\n[Test 12] Testing getAllStock with expanded variant rows...");
    const getAllStockReq = mockRequest({}, mockHeaders, {}, { page: "1", limit: "50" });
    const getAllStockRes = mockResponse();
    await getAllStock(getAllStockReq, getAllStockRes);
    if (getAllStockRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`getAllStock failed: ${getAllStockRes.jsonData?.message}`);
    }
    const stockList: any[] = getAllStockRes.jsonData.data.stock_data;

    // Both variants should appear as separate flat rows
    const stockRedRow = stockList.find((r: any) =>
      r._id.toString() === product1._id.toString() && r.variantId?.toString() === redVariant._id.toString()
    );
    const stockYellowRow = stockList.find((r: any) =>
      r._id.toString() === product1._id.toString() && r.variantId?.toString() === yellowVariant._id.toString()
    );
    const stockParentRow = stockList.find((r: any) =>
      r._id.toString() === product1._id.toString() && !r.variantId
    );

    console.log("Stock Red row found:", !!stockRedRow, "qty:", stockRedRow?.availableQty);
    console.log("Stock Yellow row found:", !!stockYellowRow, "qty:", stockYellowRow?.availableQty);
    console.log("Stock Parent row (should be absent):", !!stockParentRow);

    if (!stockRedRow) throw new Error("Red variant is missing from getAllStock flat list");
    if (!stockYellowRow) throw new Error("Yellow variant is missing from getAllStock flat list");
    if (stockParentRow) throw new Error("Parent product appeared as a separate row in getAllStock");
    if (stockRedRow.availableQty !== 0) throw new Error(`Expected Red availableQty=0 but got ${stockRedRow.availableQty}`);
    if (stockYellowRow.availableQty !== 15) throw new Error(`Expected Yellow availableQty=15 but got ${stockYellowRow.availableQty}`);

    // Test stockFilter = "true" (only return stock > 0, so Red variant should be filtered out)
    console.log("Testing getAllStock with stockFilter=true (should filter out Red variant)...");
    const filteredStockReq = mockRequest({}, mockHeaders, {}, { page: "1", limit: "50", stockFilter: "true" });
    const filteredStockRes = mockResponse();
    await getAllStock(filteredStockReq, filteredStockRes);
    if (filteredStockRes.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`getAllStock with filter failed: ${filteredStockRes.jsonData?.message}`);
    }
    const filteredStockList: any[] = filteredStockRes.jsonData.data.stock_data;
    const filteredRedRow = filteredStockList.find((r: any) =>
      r._id.toString() === product1._id.toString() && r.variantId?.toString() === redVariant._id.toString()
    );
    const filteredYellowRow = filteredStockList.find((r: any) =>
      r._id.toString() === product1._id.toString() && r.variantId?.toString() === yellowVariant._id.toString()
    );
    console.log("Filtered Red row found (expected: false):", !!filteredRedRow);
    console.log("Filtered Yellow row found (expected: true):", !!filteredYellowRow);
    if (filteredRedRow) throw new Error("Red variant with 0 qty was not filtered out by stockFilter=true");
    if (!filteredYellowRow) throw new Error("Yellow variant with 15 qty was incorrectly filtered out by stockFilter=true");

    console.log("Success: getAllStock returns flat expanded variant stock rows with correct filtering!");

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");

  } catch (err: any) {
    console.error("\n!!! TEST ERROR FAILED !!!");
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Cleanup Database
    console.log("\nCleaning up test records from database...");
    if (productsToClean.length > 0) {
      await productModel.deleteMany({ _id: { $in: productsToClean } });
      console.log(`Removed ${productsToClean.length} products`);
    }
    if (stocksToClean.length > 0) {
      await stockModel.deleteMany({ _id: { $in: stocksToClean } });
      console.log(`Removed ${stocksToClean.length} stocks`);
    }
    if (ordersToClean.length > 0) {
      // Clean PosOrder and PosPayments
      await PosOrderModel.deleteMany({ _id: { $in: ordersToClean } });
      console.log(`Removed ${ordersToClean.length} orders`);
    }
    if (billsToClean.length > 0) {
      await supplierBillModel.deleteMany({ _id: { $in: billsToClean } });
      console.log(`Removed ${billsToClean.length} bills`);
    }
    if (invoicesToClean.length > 0) {
      await InvoiceModel.deleteMany({ _id: { $in: invoicesToClean } });
      console.log(`Removed ${invoicesToClean.length} invoices`);
    }
    if (contactsToClean.length > 0) {
      await contactModel.deleteMany({ _id: { $in: contactsToClean } });
      console.log(`Removed ${contactsToClean.length} contacts`);
    }
    // Clean Register
    if (register) {
      await PosCashRegisterModel.deleteOne({ _id: register._id });
      console.log("Removed cash register");
    }
    // Clean User if created
    if (createdUser && user) {
      await userModel.deleteOne({ _id: user._id });
      console.log("Removed temporary user");
    }

    await mongoose.connection.close();
    console.log("Database connection closed. Test runner finished.");
  }
}

runTests();
