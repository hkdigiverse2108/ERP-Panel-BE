import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { branchModel, companyModel, productModel, productTypeModel, stockModel, uomModel, brandModel, categoryModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, findAllAndPopulateWithSorting, extractDataFromFile, handleIncludeId, generateUniqueEan13Barcode } from "../../helper";
import { addBulkProductSchema, addProductSchema, deleteProductSchema, editProductSchema, getProductSchema } from "../../validation";
import axios from "axios";

const ObjectId = require("mongoose").Types.ObjectId;

export const addProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    let { error, value } = addProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (userType !== USER_TYPES.SUPER_ADMIN) {
      value.companyId = user?.companyId?._id;
      if (!value?.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    if (value?.companyId && !(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;
    if (value?.productTypeId && !(await checkIdExist(productTypeModel, value?.productTypeId, "Product Type", res))) return;

    let duplicateCriteria: any = { name: value?.name, isDeleted: false };
    if (value?.companyId) duplicateCriteria.companyId = value.companyId;
    let isExist = await getFirstMatch(productModel, duplicateCriteria, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(errorText), {}, {}));
    }

    const generatedBarcodes = new Set<string>();

    // Auto-generate product-level barcode if empty
    if (!value.barcode || value.barcode.trim() === "") {
      value.barcode = await generateUniqueEan13Barcode(value.companyId, generatedBarcodes);
      value.barcodeType = "EAN_13";
      generatedBarcodes.add(value.barcode);
    }

    // Auto-generate variant-level barcodes if empty
    if (value.variants && value.variants.length > 0) {
      for (const variant of value.variants) {
        if (!variant.barcode || variant.barcode.trim() === "") {
          variant.barcode = await generateUniqueEan13Barcode(value.companyId, generatedBarcodes);
          variant.barcodeType = "EAN_13";
          generatedBarcodes.add(variant.barcode);
        }
      }
    }

    // CHECK 1 — product-level barcode:

    if (value.barcode) {
      const barcodeCriteria: any = { barcode: value.barcode, isDeleted: false };
      if (value.companyId) barcodeCriteria.companyId = value.companyId;
      const barcodeExists = await getFirstMatch(productModel, barcodeCriteria, {}, {});
      if (barcodeExists) return res.status(HTTP_STATUS.CONFLICT).json(
        new apiResponse(HTTP_STATUS.CONFLICT, "A product with this barcode already exists", {}, {})
      );
    }

    // CHECK 2 — variant-level barcodes:
    if (value.variants && value.variants.length > 0) {
      for (const variant of value.variants) {
        if (variant.barcode) {
          const variantBarcodeCriteria: any = { "variants.barcode": variant.barcode, isDeleted: false };
          if (value.companyId) variantBarcodeCriteria.companyId = value.companyId;
          const variantBarcodeExists = await getFirstMatch(productModel, variantBarcodeCriteria, {}, {});
          if (variantBarcodeExists) return res.status(HTTP_STATUS.CONFLICT).json(
            new apiResponse(HTTP_STATUS.CONFLICT, `Variant barcode '${variant.barcode}' already exists on another product`, {}, {})
          );
        }
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    let response = await createOne(productModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const bulkAddProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = userType !== USER_TYPES.SUPER_ADMIN ? user?.companyId?._id : null;

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("File"), {}, {}));
    }

    const { data, error: extractError } = extractDataFromFile(req.file);
    if (extractError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, extractError, {}, {}));
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No data found in the file", {}, {}));
    }

    const productsToAdd = [];
    const namesInFile = new Set();
    const generatedBarcodesInBulk = new Set<string>();


    for (let i = 0; i < data.length; i++) {
      let item = data[i];

      // --- Pre-process the item ---

      // 1. Handle booleans string (TRUE/FALSE)
      Object.keys(item).forEach((key) => {
        if (typeof item[key] === "string") {
          const val = item[key].trim().toUpperCase();
          if (val === "TRUE") item[key] = true;
          else if (val === "FALSE") item[key] = false;
        }
      });

      // 2. Handle productType string (convert to enum format: lowercase and underscores)
      if (item.productType && typeof item.productType === "string") {
        item.productType = item.productType.trim().toLowerCase().replace(/\s+/g, "_");
      }

      // 3. Handle date strings (DD-MM-YYYY or DD/MM/YYYY to Date object)
      if (item.expiryReferenceDate && typeof item.expiryReferenceDate === "string") {
        const dateStr = item.expiryReferenceDate.trim();
        const dateParts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dateParts) {
          const day = parseInt(dateParts[1], 10);
          const month = parseInt(dateParts[2], 10) - 1;
          const year = parseInt(dateParts[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            item.expiryReferenceDate = date;
          }
        }
      }

      // Validate with Joi
      let { error, value } = addBulkProductSchema.validate(item);

      if (error) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: ${error.details[0].message}`, {}, {}));
      }

      // --- Post-validation processing ---

      // 1. Handle ingredients (comma-separated string to array)
      if (value.ingredients && typeof value.ingredients === "string") {
        value.ingredients = value.ingredients
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
      }

      // 2. Handle nutrition (string like 'item1:value1, item2:value2' to array of objects)
      if (value.nutrition && typeof value.nutrition === "string") {
        const nutritionArray = [];
        const pairs = value.nutrition
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p !== "");
        for (const pair of pairs) {
          const parts = pair.split(":");
          const name = parts[0]?.trim() || "";
          const val = parts.slice(1).join(":")?.trim() || ""; // In case the value contains a colon
          if (name || val) {
            nutritionArray.push({
              name: name,
              value: val,
            });
          }
        }
        value.nutrition = nutritionArray;
      }

      if (userType !== USER_TYPES.SUPER_ADMIN) {
        value.companyId = companyId;
      }

      // --- Map names to IDs ---

      // Category & SubCategory Mapping
      if (value.category) {
        const categoryResult = await getFirstMatch(categoryModel, { name: { $regex: new RegExp(`^${value.category.trim()}$`, "i") }, isDeleted: false, parentCategoryId: null }, {}, {});
        if (!categoryResult) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: Category '${value.category}' not found`, {}, {}));
        }
        value.categoryId = categoryResult._id;

        if (value.subCategory) {
          const subCategoryResult = await getFirstMatch(categoryModel, { name: { $regex: new RegExp(`^${value.subCategory.trim()}$`, "i") }, isDeleted: false, parentCategoryId: value.categoryId }, {}, {});
          if (!subCategoryResult) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: Sub-category '${value.subCategory}' not found under '${value.category}'`, {}, {}));
          }
          value.subCategoryId = subCategoryResult._id;
        }
      }

      // Brand & SubBrand Mapping
      if (value.brand) {
        const brandResult = await getFirstMatch(brandModel, { name: { $regex: new RegExp(`^${value.brand.trim()}$`, "i") }, isDeleted: false, parentBrandId: null }, {}, {});
        if (!brandResult) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: Brand '${value.brand}' not found`, {}, {}));
        }
        value.brandId = brandResult._id;

        if (value.subBrand) {
          const subBrandResult = await getFirstMatch(brandModel, { name: { $regex: new RegExp(`^${value.subBrand.trim()}$`, "i") }, isDeleted: false, parentBrandId: value.brandId }, {}, {});
          if (!subBrandResult) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: Sub-brand '${value.subBrand}' not found under '${value.brand}'`, {}, {}));
          }
          value.subBrandId = subBrandResult._id;
        }
      }

      const nameKey = value.companyId ? `${value.name}_${value.companyId}` : value.name;
      if (namesInFile.has(nameKey)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: Duplicate Product Name in file: ${value.name}`, {}, {}));
      }
      namesInFile.add(nameKey);

      if (value.companyId && !(await checkIdExist(companyModel, value.companyId, "Company", null))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: ${responseMessage?.getDataNotFound("Company")}`, {}, {}));
      }

      if (value.branchId && !(await checkIdExist(branchModel, value.branchId, "Branch", null))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: ${responseMessage?.getDataNotFound("Branch")}`, {}, {}));
      }

      if (value?.productTypeId && !(await checkIdExist(productTypeModel, value?.productTypeId, "Product Type", null))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: ${responseMessage?.getDataNotFound("Product Type")}`, {}, {}));
      }

      let duplicateCriteria: any = { name: value?.name, isDeleted: false };
      if (value?.companyId) duplicateCriteria.companyId = value.companyId;
      let isExist = await getFirstMatch(productModel, duplicateCriteria, {}, {});
      if (isExist) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Row ${i + 1}: ${responseMessage?.dataAlreadyExist("Product with this name")}`, {}, {}));
      }

      // Auto-generate product-level barcode if empty
      if (!value.barcode || value.barcode.trim() === "") {
        value.barcode = await generateUniqueEan13Barcode(value.companyId, generatedBarcodesInBulk);
        value.barcodeType = "EAN_13";
        generatedBarcodesInBulk.add(value.barcode);
      }

      value.createdBy = user?._id || null;
      value.updatedBy = user?._id || null;


      // Clean up the string fields used for mapping before saving to DB
      delete value.category;
      delete value.subCategory;
      delete value.brand;
      delete value.subBrand;

      productsToAdd.push(value);
    }

    const response = await productModel.insertMany(productsToAdd);
    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Bulk Products"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const userCompanyId = user?.companyId?._id;

    const { error, value } = editProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const companyId = value?.companyId || userCompanyId;

    if (companyId && !(await checkIdExist(companyModel, companyId, "Company", res))) return;

    if (value?.productTypeId && !(await checkIdExist(productTypeModel, value?.productTypeId, "Product Type", res))) return;

    const currentProduct = await getFirstMatch(productModel, { _id: value?.productId, isDeleted: false }, {}, {});

    if (!currentProduct) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    // Ownership check: non-super-admin can only edit their own company's products
    if (userType !== USER_TYPES.SUPER_ADMIN && userCompanyId) {
      const productCompanyId = currentProduct?.companyId?.toString();
      if (productCompanyId && productCompanyId !== userCompanyId.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Product"), {}, {}));
      }
    }

    // Duplicate name check scoped to company
    let duplicateCriteria: any = { isDeleted: false, name: value?.name, _id: { $ne: value?.productId } };
    if (companyId) duplicateCriteria.companyId = companyId;
    let isExist = await getFirstMatch(productModel, duplicateCriteria, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.dataAlreadyExist(errorText), {}, {}));
    }

    const generatedBarcodesInEdit = new Set<string>();

    // If main barcode is empty (or sent as empty), generate it
    if (value.barcode === "" || (value.barcode === undefined && !currentProduct.barcode)) {
      value.barcode = await generateUniqueEan13Barcode(companyId, generatedBarcodesInEdit);
      value.barcodeType = "EAN_13";
      generatedBarcodesInEdit.add(value.barcode);
    }

    // Auto-generate barcode for variants
    if (value.variants && value.variants.length > 0) {
      for (const variant of value.variants) {
        if (!variant._id) {
          // New variant - if barcode is empty, generate it
          if (!variant.barcode || variant.barcode.trim() === "") {
            variant.barcode = await generateUniqueEan13Barcode(companyId, generatedBarcodesInEdit);
            variant.barcodeType = "EAN_13";
            generatedBarcodesInEdit.add(variant.barcode);
          }
        } else {
          // Existing variant - if they explicitly updated barcode to empty, generate one
          if (variant.barcode === "") {
            variant.barcode = await generateUniqueEan13Barcode(companyId, generatedBarcodesInEdit);
            variant.barcodeType = "EAN_13";
            generatedBarcodesInEdit.add(variant.barcode);
          }
        }
      }
    }

    // BARCODE CHECK (exclude current product):
    if (value.barcode) {
      const barcodeCriteria: any = { barcode: value.barcode, isDeleted: false, _id: { $ne: value.productId } };
      if (companyId) barcodeCriteria.companyId = companyId;
      const barcodeExists = await getFirstMatch(productModel, barcodeCriteria, {}, {});
      if (barcodeExists) return res.status(HTTP_STATUS.CONFLICT).json(
        new apiResponse(HTTP_STATUS.CONFLICT, "A product with this barcode already exists", {}, {})
      );
    }

    // VARIANT MANAGEMENT:
    const updatePayload: any = { ...value };
    delete updatePayload.variants;
    delete updatePayload.removeVariantIds;

    // 1. Remove variants by _id if requested
    if (value.removeVariantIds && value.removeVariantIds.length > 0) {
      await updateData(productModel, { _id: value.productId },
        { $pull: { variants: { _id: { $in: value.removeVariantIds.map(id => new ObjectId(id)) } } } }, {}
      );
    }

    // 2. For each variant in the payload:
    //    - If it has an _id → update that sub-document using arrayFilters
    //    - If no _id → push as new variant
    if (value.variants && value.variants.length > 0) {
      for (const variant of value.variants) {
        if (variant._id) {
          // Update existing variant
          const variantUpdateFields: any = {};
          Object.keys(variant).forEach(k => {
            if (k !== '_id') variantUpdateFields[`variants.$[elem].${k}`] = variant[k];
          });
          await productModel.updateOne(
            { _id: value.productId },
            { $set: variantUpdateFields },
            { arrayFilters: [{ "elem._id": new ObjectId(variant._id) }] }
          );
        } else {
          // Add new variant
          await productModel.updateOne(
            { _id: value.productId },
            { $push: { variants: variant } }
          );
        }
      }
    }

    // 3. Apply the rest of the update (non-variant fields)
    updatePayload.updatedBy = user?._id || null;
    const response = await updateData(productModel, { _id: value.productId }, updatePayload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Product"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { error, value } = deleteProductSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(productModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    // Ownership check: non-super-admin can only delete their own company's products
    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      const productCompanyId = isExist?.companyId?.toString();
      if (productCompanyId && productCompanyId !== companyId.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Product"), {}, {}));
      }
    }

    const payload = {
      updatedBy: user?._id || null,
      isDeleted: true,
    };

    const response = await updateData(productModel, { _id: value?.id }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Product"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { page, limit, search, startDate, endDate, activeFilter, companyFilter, branchFilter, categoryFilter, subCategoryFilter, brandFilter, subBrandFilter, hsnCodeFilter, purchaseTaxFilter, salesTaxIdFilter, productTypeFilter, productTypeIdFilter, giveVariant, givethevariant } = req.query;

    const effectiveCompanyId: any = companyFilter ? new ObjectId(companyFilter as string) : (userType !== USER_TYPES.SUPER_ADMIN ? companyId : null);
    const effectiveBranchId: any = branchFilter ? new ObjectId(branchFilter as string) : (userType !== USER_TYPES.SUPER_ADMIN ? user?.branchId?._id : null);

    // ── Step 1: Load stock entries for the visible scope ───────────────────
    // shouldFilterByStock: true → only show products/variants that have stock
    // shouldFetchStock: true  → fetch stock data to attach qty/price fields
    const shouldFilterByStock = userType !== USER_TYPES.SUPER_ADMIN || !!companyFilter;
    const shouldFetchStock = shouldFilterByStock || !!(effectiveCompanyId || effectiveBranchId);

    const stockByKey = new Map<string, any>();
    const productIdsWithStock = new Set<string>();

    if (shouldFetchStock) {
      const stockBaseCriteria: any = { isDeleted: false };
      if (effectiveCompanyId) stockBaseCriteria.companyId = effectiveCompanyId;
      if (effectiveBranchId) stockBaseCriteria.branchId = effectiveBranchId;
      applyDateFilter(stockBaseCriteria, startDate as string, endDate as string);

      const stockEntries = await stockModel.find(stockBaseCriteria, {
        productId: 1, variantId: 1, qty: 1, mrp: 1, sellingPrice: 1, sellingDiscount: 1,
        sellingMargin: 1, landingCost: 1, purchasePrice: 1, purchaseTaxId: 1, salesTaxId: 1,
        isPurchaseTaxIncluding: 1, isSalesTaxIncluding: 1, uomId: 1, branchId: 1,
      }).populate([
        { path: "purchaseTaxId", select: "name percentage" },
        { path: "salesTaxId", select: "name percentage" },
        { path: "uomId", select: "name code" },
        { path: "branchId", select: "name" },
      ]);

      stockEntries.forEach((s: any) => {
        const key = s.variantId ? `${s.productId}_${s.variantId}` : String(s.productId);
        if (!stockByKey.has(key)) stockByKey.set(key, s);
        productIdsWithStock.add(String(s.productId));
      });

      if (shouldFilterByStock && productIdsWithStock.size === 0) {
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), { product_data: [], totalData: 0, state: { page, limit, totalPages: 1 } }, {}));
      }
    }

    // ── Step 2: Build product query criteria ───────────────────────────────
    let criteria: any = { isDeleted: false };

    if (shouldFilterByStock) {
      criteria._id = { $in: Array.from(productIdsWithStock) };
    }

    if (search) {
      const searchCondition = [
        { name: { $regex: search, $options: "si" } },
        { barcode: { $regex: search, $options: "si" } },
        { "variants.barcode": { $regex: search, $options: "si" } },
        { "variants.sku": { $regex: search, $options: "si" } },
      ];
      if (criteria.$or) {
        criteria.$and = [{ $or: criteria.$or }, { $or: searchCondition }];
        delete criteria.$or;
      } else {
        criteria.$or = searchCondition;
      }
    }

    if (categoryFilter) criteria.categoryId = categoryFilter;
    if (subCategoryFilter) criteria.subCategoryId = subCategoryFilter;
    if (brandFilter) criteria.brandId = brandFilter;
    if (subBrandFilter) criteria.subBrandId = subBrandFilter;
    if (hsnCodeFilter) criteria.hsnCode = hsnCodeFilter;
    if (purchaseTaxFilter) criteria.purchaseTaxId = purchaseTaxFilter;
    if (salesTaxIdFilter) criteria.salesTaxId = salesTaxIdFilter;
    if (productTypeFilter) criteria.productType = productTypeFilter;
    if (productTypeIdFilter) criteria.productTypeId = new ObjectId(productTypeIdFilter);
    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    // ── Step 3: Fetch ALL matching products (no DB-level pagination yet) ───
    const products = await getDataWithSorting(productModel, criteria, { password: 0 }, {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "categoryId", select: "name" },
        { path: "subCategoryId", select: "name" },
        { path: "brandId", select: "name" },
        { path: "subBrandId", select: "name" },
        { path: "productTypeId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
    });

    // ── Step 4: Conditional variant expansion ──────────────────────────────
    const finalList: any[] = [];
    const isGiveVariant = giveVariant === "true" || givethevariant === "true";

    products.forEach((product: any) => {
      const productObj = product.toObject ? product.toObject() : product;

      if (isGiveVariant) {
        if (productObj.variants && productObj.variants.length > 0) {
          // Product WITH variants → one flat row per variant that has stock
          productObj.variants.forEach((variant: any) => {
            const stockKey = `${product._id}_${variant._id}`;
            const stock = stockByKey.get(stockKey);

            // Skip variants with no stock (when filtering by stock is active)
            if (!stock && shouldFilterByStock) return;

            // Variant-level search filter
            if (search) {
              const query = (search as string).toLowerCase();
              const parentMatch = productObj.name.toLowerCase().includes(query);
              const variantMatch = variant.name.toLowerCase().includes(query);
              const barcodeMatch = variant.barcode && variant.barcode.toLowerCase().includes(query);
              const skuMatch = variant.sku && variant.sku.toLowerCase().includes(query);
              if (!parentMatch && !variantMatch && !barcodeMatch && !skuMatch) return;
            }

            finalList.push({
              ...productObj,
              variants: undefined,           // remove the nested array — each variant is its own row
              variantId: variant._id,
              name: `${productObj.name} - ${variant.name}`,
              barcode: variant.barcode ?? productObj.barcode ?? null,
              barcodeType: variant.barcodeType ?? productObj.barcodeType ?? null,
              sku: variant.sku ?? productObj.sku ?? null,
              qty: stock?.qty ?? 0,
              mrp: stock?.mrp ?? variant.mrp ?? productObj.mrp ?? 0,
              sellingPrice: stock?.sellingPrice ?? variant.sellingPrice ?? productObj.sellingPrice ?? 0,
              sellingDiscount: stock?.sellingDiscount ?? productObj.sellingDiscount ?? 0,
              sellingMargin: stock?.sellingMargin ?? productObj.sellingMargin ?? 0,
              landingCost: stock?.landingCost ?? productObj.landingCost ?? 0,
              purchasePrice: stock?.purchasePrice ?? variant.purchasePrice ?? productObj.purchasePrice ?? 0,
              purchaseTaxId: stock?.purchaseTaxId ?? null,
              salesTaxId: stock?.salesTaxId ?? null,
              isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
              isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
              uomId: stock?.uomId ?? null,
              branchId: stock?.branchId ?? null,
            });
          });

          // Also emit the parent product itself if it has a direct stock entry (no variantId)
          // e.g. stock was added at the product level, not tied to any specific variant
          const parentStock = stockByKey.get(String(product._id));
          if (parentStock) {
            let parentMatchesSearch = true;
            if (search) {
              const query = (search as string).toLowerCase();
              parentMatchesSearch =
                productObj.name.toLowerCase().includes(query) ||
                (productObj.barcode && productObj.barcode.toLowerCase().includes(query)) ||
                (productObj.sku && productObj.sku.toLowerCase().includes(query));
            }
            if (parentMatchesSearch) {
              finalList.push({
                ...productObj,
                variants: undefined,
                variantId: null,
                qty: parentStock.qty ?? 0,
                mrp: parentStock.mrp ?? productObj.mrp ?? 0,
                sellingPrice: parentStock.sellingPrice ?? productObj.sellingPrice ?? 0,
                sellingDiscount: parentStock.sellingDiscount ?? productObj.sellingDiscount ?? 0,
                sellingMargin: parentStock.sellingMargin ?? productObj.sellingMargin ?? 0,
                landingCost: parentStock.landingCost ?? productObj.landingCost ?? 0,
                purchasePrice: parentStock.purchasePrice ?? productObj.purchasePrice ?? 0,
                purchaseTaxId: parentStock.purchaseTaxId ?? null,
                salesTaxId: parentStock.salesTaxId ?? null,
                isPurchaseTaxIncluding: parentStock.isPurchaseTaxIncluding ?? false,
                isSalesTaxIncluding: parentStock.isSalesTaxIncluding ?? false,
                uomId: parentStock.uomId ?? null,
                branchId: parentStock.branchId ?? null,
              });
            }
          }
        } else {
          // Product WITHOUT variants → one row as-is
          const stockKey = String(product._id);
          const stock = stockByKey.get(stockKey);

          if (!stock && shouldFilterByStock) return;

          finalList.push({
            ...productObj,
            qty: stock?.qty ?? 0,
            mrp: stock?.mrp ?? productObj.mrp ?? 0,
            sellingPrice: stock?.sellingPrice ?? productObj.sellingPrice ?? 0,
            sellingDiscount: stock?.sellingDiscount ?? productObj.sellingDiscount ?? 0,
            sellingMargin: stock?.sellingMargin ?? productObj.sellingMargin ?? 0,
            landingCost: stock?.landingCost ?? productObj.landingCost ?? 0,
            purchasePrice: stock?.purchasePrice ?? productObj.purchasePrice ?? 0,
            purchaseTaxId: stock?.purchaseTaxId ?? null,
            salesTaxId: stock?.salesTaxId ?? null,
            isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
            isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
            uomId: stock?.uomId ?? null,
            branchId: stock?.branchId ?? null,
          });
        }
      } else {
        // Return standard product with nested variants containing stock details
        let totalQty = 0;
        let mrp = productObj.mrp ?? 0;
        let sellingPrice = productObj.sellingPrice ?? 0;
        let sellingDiscount = productObj.sellingDiscount ?? 0;
        let sellingMargin = productObj.sellingMargin ?? 0;
        let landingCost = productObj.landingCost ?? 0;
        let purchasePrice = productObj.purchasePrice ?? 0;
        let purchaseTaxId = null;
        let salesTaxId = null;
        let isPurchaseTaxIncluding = false;
        let isSalesTaxIncluding = false;
        let uomId = null;
        let branchId = null;

        let firstStock: any = null;

        if (productObj.variants && productObj.variants.length > 0) {
          const variantsWithStock = productObj.variants.map((v: any) => {
            const stockKey = `${product._id}_${v._id}`;
            const stock = stockByKey.get(stockKey);

            totalQty += stock?.qty ?? 0;
            if (!firstStock && stock) {
              firstStock = stock;
            }

            return {
              ...v,
              qty: stock?.qty ?? 0,
              mrp: stock?.mrp ?? v.mrp ?? productObj.mrp ?? 0,
              sellingPrice: stock?.sellingPrice ?? v.sellingPrice ?? productObj.sellingPrice ?? 0,
              sellingDiscount: stock?.sellingDiscount ?? productObj.sellingDiscount ?? 0,
              sellingMargin: stock?.sellingMargin ?? productObj.sellingMargin ?? 0,
              landingCost: stock?.landingCost ?? productObj.landingCost ?? 0,
              purchasePrice: stock?.purchasePrice ?? v.purchasePrice ?? productObj.purchasePrice ?? 0,
              purchaseTaxId: stock?.purchaseTaxId ?? null,
              salesTaxId: stock?.salesTaxId ?? null,
              isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
              isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
              uomId: stock?.uomId ?? null,
              branchId: stock?.branchId ?? null,
            };
          });

          // Also check if parent product itself has stock
          const parentStock = stockByKey.get(String(product._id));
          if (parentStock) {
            totalQty += parentStock.qty ?? 0;
            if (!firstStock) {
              firstStock = parentStock;
            }
          }

          if (firstStock) {
            mrp = firstStock.mrp ?? mrp;
            sellingPrice = firstStock.sellingPrice ?? sellingPrice;
            sellingDiscount = firstStock.sellingDiscount ?? sellingDiscount;
            sellingMargin = firstStock.sellingMargin ?? sellingMargin;
            landingCost = firstStock.landingCost ?? landingCost;
            purchasePrice = firstStock.purchasePrice ?? purchasePrice;
            purchaseTaxId = firstStock.purchaseTaxId ?? null;
            salesTaxId = firstStock.salesTaxId ?? null;
            isPurchaseTaxIncluding = firstStock.isPurchaseTaxIncluding ?? false;
            isSalesTaxIncluding = firstStock.isSalesTaxIncluding ?? false;
            uomId = firstStock.uomId ?? null;
            branchId = firstStock.branchId ?? null;
          }

          productObj.variants = variantsWithStock;
          productObj.variantsWithStock = variantsWithStock;
          productObj.qty = totalQty;
          productObj.mrp = mrp;
          productObj.sellingPrice = sellingPrice;
          productObj.sellingDiscount = sellingDiscount;
          productObj.sellingMargin = sellingMargin;
          productObj.landingCost = landingCost;
          productObj.purchasePrice = purchasePrice;
          productObj.purchaseTaxId = purchaseTaxId;
          productObj.salesTaxId = salesTaxId;
          productObj.isPurchaseTaxIncluding = isPurchaseTaxIncluding;
          productObj.isSalesTaxIncluding = isSalesTaxIncluding;
          productObj.uomId = uomId;
          productObj.branchId = branchId;
        } else {
          // Product WITHOUT variants
          const stockKey = String(product._id);
          const stock = stockByKey.get(stockKey);

          if (!stock && shouldFilterByStock) return;

          if (stock) {
            totalQty = stock.qty ?? 0;
            mrp = stock.mrp ?? mrp;
            sellingPrice = stock.sellingPrice ?? sellingPrice;
            sellingDiscount = stock.sellingDiscount ?? sellingDiscount;
            sellingMargin = stock.sellingMargin ?? sellingMargin;
            landingCost = stock.landingCost ?? landingCost;
            purchasePrice = stock.purchasePrice ?? purchasePrice;
            purchaseTaxId = stock.purchaseTaxId ?? null;
            salesTaxId = stock.salesTaxId ?? null;
            isPurchaseTaxIncluding = stock.isPurchaseTaxIncluding ?? false;
            isSalesTaxIncluding = stock.isSalesTaxIncluding ?? false;
            uomId = stock.uomId ?? null;
            branchId = stock.branchId ?? null;
          }

          productObj.qty = totalQty;
          productObj.mrp = mrp;
          productObj.sellingPrice = sellingPrice;
          productObj.sellingDiscount = sellingDiscount;
          productObj.sellingMargin = sellingMargin;
          productObj.landingCost = landingCost;
          productObj.purchasePrice = purchasePrice;
          productObj.purchaseTaxId = purchaseTaxId;
          productObj.salesTaxId = salesTaxId;
          productObj.isPurchaseTaxIncluding = isPurchaseTaxIncluding;
          productObj.isSalesTaxIncluding = isSalesTaxIncluding;
          productObj.uomId = uomId;
          productObj.branchId = branchId;
        }

        finalList.push(productObj);
      }
    });

    // ── Step 5: In-memory pagination over the final list ──────────
    const totalData = finalList.length;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || totalData || 1;
    const totalPages = limit ? Math.ceil(totalData / limitNum) || 1 : 1;

    const product_data = page && limit
      ? finalList.slice((pageNum - 1) * limitNum, pageNum * limitNum)
      : finalList;

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), { product_data, totalData, state: { page: pageNum, limit: limitNum, totalPages } }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getProductDropdown = async (req, res) => {
  reqInfo(req);
  try {
    let { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { productType, search, barcodeSearch, companyFilter, branchFilter, categoryFilter, brandFilter, isNewProduct, stockFilter, includeId } = req.query;

    // Determine the effective company ID for filtering
    let effectiveCompanyId = companyId;
    if (companyFilter && userType === USER_TYPES.SUPER_ADMIN) {
      effectiveCompanyId = new ObjectId(companyFilter as string);
    }

    let effectiveBranchId = user?.branchId?._id;
    if (branchFilter) {
      effectiveBranchId = new ObjectId(branchFilter as string);
    }

    if (barcodeSearch) {
      let barcodeCriteria: any = {
        $or: [{ barcode: barcodeSearch }, { "variants.barcode": barcodeSearch }],
        isDeleted: false,
        isActive: true,
      };
      // Company scoping (same pattern already in the function)
      if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
        barcodeCriteria.$and = [{ $or: barcodeCriteria.$or }, { $or: [{ companyId }, { companyId: null }, { companyId: { $exists: false } }] }];
        delete barcodeCriteria.$or;
      }

      const product = await getFirstMatch(productModel, barcodeCriteria, {}, {});
      if (!product) {
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), [], {}));
      }

      // Determine matched variant (if any)
      const productObj = product.toObject ? product.toObject() : product;
      let matchedVariant = null;
      if (product.barcode !== barcodeSearch) {
        matchedVariant = (productObj.variants || []).find((v: any) => v.barcode === barcodeSearch) || null;
      }

      // Fetch stock — scoped to variant if matched
      const stockCriteria: any = { productId: product._id, isDeleted: false };
      if (effectiveCompanyId) stockCriteria.companyId = effectiveCompanyId;
      if (effectiveBranchId) stockCriteria.branchId = effectiveBranchId;
      if (matchedVariant) stockCriteria.variantId = matchedVariant._id;

      const stock = await stockModel.findOne(stockCriteria).populate([
        { path: "purchaseTaxId", select: "name percentage" },
        { path: "salesTaxId", select: "name percentage" },
        { path: "uomId", select: "name code" },
      ]);

      const result = {
        _id: product._id,
        variantId: matchedVariant ? matchedVariant._id : undefined,
        name: matchedVariant ? `${product.name} - ${matchedVariant.name}` : product.name,
        productType: product.productType,
        barcode: matchedVariant ? (matchedVariant.barcode ?? null) : (product.barcode ?? null),
        barcodeType: matchedVariant ? (matchedVariant.barcodeType ?? null) : (product.barcodeType ?? null),
        matchedVariant,
        qty: stock?.qty ?? 0,
        mrp: stock?.mrp ?? matchedVariant?.mrp ?? productObj.mrp ?? 0,
        sellingPrice: stock?.sellingPrice ?? matchedVariant?.sellingPrice ?? productObj.sellingPrice ?? 0,
        sellingDiscount: stock?.sellingDiscount ?? productObj.sellingDiscount ?? 0,
        sellingMargin: stock?.sellingMargin ?? productObj.sellingMargin ?? 0,
        purchasePrice: stock?.purchasePrice ?? matchedVariant?.purchasePrice ?? productObj.purchasePrice ?? 0,
        landingCost: stock?.landingCost ?? productObj.landingCost ?? 0,
        purchaseTaxId: stock?.purchaseTaxId ?? null,
        salesTaxId: stock?.salesTaxId ?? null,
        isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
        isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
        uomId: stock?.uomId ?? null,
        branchId: stock?.branchId ?? null,
        images: productObj.images ?? [],
      };

      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), [result], {}));
    }

    // --- Stock filtering (only when NOT a new product) ---
    let productIdsWithStock: string[] = [];
    const stockByProductId = new Map<string, any>();

    if (isNewProduct !== "true") {
      let stockCriteria: any = { isDeleted: false, isActive: true };

      if (effectiveCompanyId) stockCriteria.companyId = effectiveCompanyId;
      if (effectiveBranchId) stockCriteria.branchId = effectiveBranchId;

      if (stockFilter === "true") {
        stockCriteria.qty = { $gt: 0 };
      }

      stockCriteria = handleIncludeId(stockCriteria, includeId, "productId");

      const stockResponse = await getDataWithSorting(
        stockModel,
        stockCriteria,
        { productId: 1, variantId: 1, qty: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1, purchaseTaxId: 1, salesTaxId: 1, isPurchaseTaxIncluding: 1, isSalesTaxIncluding: 1, uomId: 1, branchId: 1 },
        {
          sort: { updatedAt: -1 },
          populate: [
            { path: "purchaseTaxId", select: "name percentage" },
            { path: "salesTaxId", select: "name percentage" },
            { path: "uomId", select: "name code" },
            { path: "companyId", select: "name" },
            { path: "branchId", select: "name" },
          ],
        },
      );

      productIdsWithStock = Array.from(new Set(stockResponse.map((s: any) => String(s.productId))));
      if (productIdsWithStock.length === 0) {
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), [], {}));
      }

      stockResponse.forEach((stock: any) => {
        const key = stock.variantId ? `${stock.productId}_${stock.variantId}` : String(stock.productId);
        if (!stockByProductId.has(key)) stockByProductId.set(key, stock);
      });
    }

    // --- Product filtering ---
    let criteria: any = {
      isDeleted: false,
      isActive: true,
    };

    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
    } else if (userType === USER_TYPES.SUPER_ADMIN && companyFilter) {
      criteria.$or = [{ companyId: companyFilter }, { companyId: null }, { companyId: { $exists: false } }];
    }

    if (isNewProduct !== "true" && productIdsWithStock.length > 0) {
      criteria._id = { $in: productIdsWithStock };
    }

    if (productType) {
      criteria.productType = productType;
    }

    if (categoryFilter) {
      criteria.categoryId = categoryFilter;
    }

    if (brandFilter) {
      criteria.brandId = brandFilter;
    }

    if (search) {
      const searchCondition = [
        { name: { $regex: search, $options: "si" } },
        { barcode: { $regex: search, $options: "si" } },
        { "variants.barcode": { $regex: search, $options: "si" } },
        { "variants.sku": { $regex: search, $options: "si" } },
      ];
      if (criteria.$or) {
        criteria.$and = [{ $or: criteria.$or }, { $or: searchCondition }];
        delete criteria.$or;
      } else {
        criteria.$or = searchCondition;
      }
    }

    criteria = handleIncludeId(criteria, includeId);

    const response = await getDataWithSorting(
      productModel,
      criteria,
      { _id: 1, name: 1, productType: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1, images: 1, barcode: 1, barcodeType: 1, variants: 1 },
      {
        sort: { name: 1 },
      },
    );

<<<<<<< HEAD
    const mergedResponse = response.map((product) => {
        const stock = stockByProductId.get(String(product._id));
        return {
          _id: product._id,
          name: product.name,
          productType: product.productType,
=======
    const mergedResponse: any[] = [];

    response.forEach((product: any) => {
      const productObj = product.toObject ? product.toObject() : product;
      if (productObj.variants && productObj.variants.length > 0) {
        // 1. Add variant rows
        productObj.variants.forEach((variant: any) => {
          const stockKey = `${product._id}_${variant._id}`;
          const stock = stockByProductId.get(stockKey);

          if (isNewProduct !== "true" && (!stock || (stockFilter === "true" && stock.qty <= 0))) {
            return;
          }

          // If a search query is entered, only show this variant if it matches the query, or if the parent product name matches
          if (search) {
            const query = (search as string).toLowerCase();
            const parentNameMatch = product.name.toLowerCase().includes(query);
            const variantNameMatch = variant.name.toLowerCase().includes(query);
            const barcodeMatch = variant.barcode && variant.barcode.toLowerCase().includes(query);
            const skuMatch = variant.sku && variant.sku.toLowerCase().includes(query);

            if (!parentNameMatch && !variantNameMatch && !barcodeMatch && !skuMatch) {
              return;
            }
          }

          mergedResponse.push({
            _id: product._id,
            variantId: variant._id,
            name: `${product.name} - ${variant.name}`,
            productType: product.productType,
            barcode: variant.barcode ?? null,
            barcodeType: variant.barcodeType ?? null,
            qty: stock?.qty ?? 0,
            purchasePrice: stock?.purchasePrice ?? variant.purchasePrice ?? product.purchasePrice,
            landingCost: stock?.landingCost ?? product.landingCost,
            mrp: stock?.mrp ?? variant.mrp ?? product.mrp,
            sellingPrice: stock?.sellingPrice ?? variant.sellingPrice ?? product.sellingPrice,
            sellingDiscount: stock?.sellingDiscount ?? product.sellingDiscount,
            sellingMargin: stock?.sellingMargin ?? product.sellingMargin,
            purchaseTaxId: stock?.purchaseTaxId ?? null,
            salesTaxId: stock?.salesTaxId ?? null,
            isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
            isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
            uomId: stock?.uomId ?? null,
            branchId: stock?.branchId ?? null,
            images: product.images ?? [],
          });
        });

        // 2. Also check if the parent product itself has stock
        const parentStock = stockByProductId.get(String(product._id));
        if (parentStock && parentStock.qty > 0) {
          if (search) {
            const query = (search as string).toLowerCase();
            const parentNameMatch = product.name.toLowerCase().includes(query);
            const barcodeMatch = product.barcode && product.barcode.toLowerCase().includes(query);
            const skuMatch = product.sku && product.sku.toLowerCase().includes(query);

            if (!parentNameMatch && !barcodeMatch && !skuMatch) {
              return;
            }
          }

          mergedResponse.push({
            _id: product._id,
            name: product.name,
            productType: product.productType,
            barcode: product.barcode ?? null,
            barcodeType: product.barcodeType ?? null,
            qty: parentStock.qty,
            purchasePrice: parentStock.purchasePrice ?? product.purchasePrice,
            landingCost: parentStock.landingCost ?? product.landingCost,
            mrp: parentStock.mrp ?? product.mrp,
            sellingPrice: parentStock.sellingPrice ?? product.sellingPrice,
            sellingDiscount: parentStock.sellingDiscount ?? product.sellingDiscount,
            sellingMargin: parentStock.sellingMargin ?? product.sellingMargin,
            purchaseTaxId: parentStock.purchaseTaxId ?? null,
            salesTaxId: parentStock.salesTaxId ?? null,
            isPurchaseTaxIncluding: parentStock.isPurchaseTaxIncluding ?? false,
            isSalesTaxIncluding: parentStock.isSalesTaxIncluding ?? false,
            uomId: parentStock.uomId ?? null,
            branchId: parentStock.branchId ?? null,
            images: product.images ?? [],
          });
        }
      } else {
        const stock = stockByProductId.get(String(product._id));

        if (isNewProduct !== "true" && stockFilter === "true" && (!stock || stock.qty <= 0)) {
          return;
        }

        mergedResponse.push({
          _id: product._id,
          name: product.name,
          productType: product.productType,
          barcode: product.barcode ?? null,
          barcodeType: product.barcodeType ?? null,
>>>>>>> 364284a19b3c8ddeaa3e73aeebbf48b4bd3c9859
          qty: stock?.qty ?? 0,
          purchasePrice: stock?.purchasePrice ?? product.purchasePrice,
          landingCost: stock?.landingCost ?? product.landingCost,
          mrp: stock?.mrp ?? product.mrp,
          sellingPrice: stock?.sellingPrice ?? product.sellingPrice,
          sellingDiscount: stock?.sellingDiscount ?? product.sellingDiscount,
          sellingMargin: stock?.sellingMargin ?? product.sellingMargin,
<<<<<<< HEAD
          purchaseTaxId: stock?.purchaseTaxId,
          salesTaxId: stock?.salesTaxId,
          isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding,
          isSalesTaxIncluding: stock?.isSalesTaxIncluding,
          uomId: stock?.uomId,
          branchId: stock?.branchId,
          images: product.images ?? [],
        };
=======
          purchaseTaxId: stock?.purchaseTaxId ?? null,
          salesTaxId: stock?.salesTaxId ?? null,
          isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
          isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
          uomId: stock?.uomId ?? null,
          branchId: stock?.branchId ?? null,
          images: product.images ?? [],
        });
      }
>>>>>>> 364284a19b3c8ddeaa3e73aeebbf48b4bd3c9859
    });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), mergedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { error, value } = getProductSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      productModel,
      {
        _id: value?.id,
        isDeleted: false,
        ...(userType !== USER_TYPES.SUPER_ADMIN && companyId ? { $or: [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }] } : {}),
      },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
          { path: "productTypeId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
          // { path: "purchaseTaxId", select: "name percentage" },
          // { path: "salesTaxId", select: "name percentage" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    const { variantId } = req.query;

    if (variantId) {
      const variantExists = (response.variants || []).some(
        (v: any) => v._id.toString() === variantId.toString()
      );
      if (!variantExists) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Variant not found on this product", {}, {}));
      }
    }

    const stockCriteria: any = {
      productId: response._id,
      isDeleted: false,
    };

    if (variantId) {
      stockCriteria.variantId = new ObjectId(variantId as string);
    } else {
      stockCriteria.variantId = null;
    }

    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      stockCriteria.companyId = companyId;
      stockCriteria.branchId = user?.branchId?._id;
    }

    const stockAggregation = await stockModel.aggregate([
      { $match: stockCriteria },

      {
        $lookup: {
          from: "taxes",
          localField: "purchaseTaxId",
          foreignField: "_id",
          as: "purchaseTax",
        },
      },

      {
        $unwind: {
          path: "$purchaseTax",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "taxes",
          localField: "salesTaxId",
          foreignField: "_id",
          as: "salesTax",
        },
      },
      {
        $unwind: {
          path: "$salesTax",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "uoms",
          localField: "uomId",
          foreignField: "_id",
          as: "uomData",
        },
      },
      {
        $unwind: {
          path: "$uomData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$productId",
          totalQty: { $sum: "$qty" },
          totalMrp: { $sum: "$mrp" },
          totalSellingPrice: { $sum: "$sellingPrice" },
          totalSellingDiscount: { $sum: "$sellingDiscount" },
          totalLandingCost: { $sum: "$landingCost" },
          totalPurchasePrice: { $sum: "$purchasePrice" },
          totalSellingMargin: { $sum: "$sellingMargin" },

          purchaseTaxId: {
            $first: {
              _id: "$purchaseTax._id",
              name: "$purchaseTax.name",
              percentage: "$purchaseTax.percentage",
            },
          },

          salesTaxId: {
            $first: {
              _id: "$salesTax._id",
              name: "$salesTax.name",
              percentage: "$salesTax.percentage",
            },
          },

          isPurchaseTaxIncluding: { $first: "$isPurchaseTaxIncluding" },
          isSalesTaxIncluding: { $first: "$isSalesTaxIncluding" },
          uomData: { $first: "$uomData" },
          branchId: { $first: "$branchId" },
          variantId: { $first: "$variantId" },
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branchData",
        },
      },
      {
        $unwind: {
          path: "$branchData",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          uomId: 1,
          uomData: {
            _id: "$uomData._id",
            name: "$uomData.name",
            code: "$uomData.code",
          },
          totalQty: 1,
          totalMrp: 1,
          totalSellingPrice: 1,
          totalSellingDiscount: 1,
          totalLandingCost: 1,
          totalPurchasePrice: 1,
          totalSellingMargin: 1,
          branchData: {
            _id: "$branchData._id",
            name: "$branchData.name",
          },
          purchaseTaxId: 1,
          salesTaxId: 1,
          isPurchaseTaxIncluding: 1,
          isSalesTaxIncluding: 1,
          variantId: 1,
        },
      },
    ]);

    const stock = stockAggregation.length > 0 ? stockAggregation[0] : {};

    const matchedVariant = variantId
      ? (response.variants || []).find((v: any) => v._id.toString() === variantId.toString())
      : null;

    const productsWithStock: any = {
      ...(response.toObject ? response.toObject() : response),
      mrp: stock.totalMrp ?? (matchedVariant ? (matchedVariant.mrp ?? 0) : (response.mrp ?? 0)),
      sellingPrice: stock.totalSellingPrice ?? (matchedVariant ? (matchedVariant.sellingPrice ?? 0) : (response.sellingPrice ?? 0)),
      sellingDiscount: stock.totalSellingDiscount ?? (response.sellingDiscount ?? 0),
      landingCost: stock.totalLandingCost ?? (response.landingCost ?? 0),
      purchasePrice: stock.totalPurchasePrice ?? (matchedVariant ? (matchedVariant.purchasePrice ?? 0) : (response.purchasePrice ?? 0)),
      sellingMargin: stock.totalSellingMargin ?? (response.sellingMargin ?? 0),
      qty: stock.totalQty ?? 0,
      purchaseTaxId: stock.purchaseTaxId,
      salesTaxId: stock.salesTaxId,
      isPurchaseTaxIncluding: stock.isPurchaseTaxIncluding,
      isSalesTaxIncluding: stock.isSalesTaxIncluding,
      uomId: stock.uomData,
      branchId: stock.branchData,
      variantId: stock.variantId ?? (matchedVariant ? matchedVariant._id : null),
    };

    if (matchedVariant) {
      productsWithStock.name = `${response.name} - ${matchedVariant.name}`;
      if (matchedVariant.sku) productsWithStock.sku = matchedVariant.sku;
      if (matchedVariant.itemCode) productsWithStock.itemCode = matchedVariant.itemCode;
      if (matchedVariant.barcode) productsWithStock.barcode = matchedVariant.barcode;
      if (matchedVariant.barcodeType) productsWithStock.barcodeType = matchedVariant.barcodeType;
      productsWithStock.isActive = matchedVariant.isActive ?? productsWithStock.isActive;
      if (matchedVariant.attributes) productsWithStock.attributes = matchedVariant.attributes;
    }

    // Fetch all stock records for this product (all variants) in one query
    const allVariantStock = await stockModel.find({
      productId: response._id,
      isDeleted: false,
      ...(variantId ? { variantId: new ObjectId(variantId as string) } : {}),
      ...(userType !== USER_TYPES.SUPER_ADMIN && companyId ? { companyId } : {}),
    }).populate([
      { path: "uomId", select: "name code" },
      { path: "purchaseTaxId", select: "name percentage" },
      { path: "salesTaxId", select: "name percentage" },
    ]);

    // Build a map keyed by variantId string
    const variantStockMap = allVariantStock.reduce((acc, s) => {
      if (s.variantId) acc[s.variantId.toString()] = s;
      return acc;
    }, {});

    // Attach stock to each variant in the product
    const targetVariants = variantId
      ? (productsWithStock.variants || []).filter((v: any) => v._id.toString() === variantId.toString())
      : (productsWithStock.variants || []);

    const variantsWithStock = targetVariants.map((v: any) => {
      const vs = variantStockMap[v._id?.toString()];
      return {
        ...v,
        qty: vs?.qty ?? 0,
        mrp: vs?.mrp ?? v.mrp ?? 0,
        sellingPrice: vs?.sellingPrice ?? v.sellingPrice ?? 0,
        purchasePrice: vs?.purchasePrice ?? v.purchasePrice ?? 0,
        uomId: vs?.uomId ?? null,
        purchaseTaxId: vs?.purchaseTaxId ?? null,
        salesTaxId: vs?.salesTaxId ?? null,
      };
    });

    productsWithStock.variants = targetVariants;
    productsWithStock.variantsWithStock = variantsWithStock;

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), productsWithStock, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const detectProduct = async (req, res) => {
  reqInfo(req);
  try {
    let files = req.files ? (req.files as any[]) : [];
    if (!files || files.length === 0) {
      if (req.file) {
        files = [req.file];
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "At least one image file is required", {}, {}));
      }
    }

    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    let skuMatchesDetailsArray = [];

    // 1. Prepare Base64 Image
    const firstFile = files[0];
    const imageBase64 = firstFile.buffer.toString("base64");

    // 2. Call Internal AI Analyze API
    let results: any[] = [];
    let idMatches: Record<string, number> = {};
    let idCounts: Record<string, number> = {};

    try {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:4001";
      const authHeader = req.headers.authorization;

      const aiApiResponse = await axios.post(`${backendUrl}/ai/analyze`, { imageBase64 }, { headers: { Authorization: authHeader } });

      const aiItems = aiApiResponse.data?.data || [];

      const unmatchedItems = [];

      // 3. Map AI Results to Product ID context
      aiItems.forEach((item: any) => {
        if (item.matched && item.product_id) {
          const productId = item.product_id;
          idMatches[productId] = 0.95;
          idCounts[productId] = (idCounts[productId] || 0) + (item.quantity || 1);
        } else {
          unmatchedItems.push(item);
        }
      });

      results = [{ image: firstFile.originalname, items_count: aiItems.length, unmatched_items: unmatchedItems }];

      // 4. Data Hydration (Stock Lookups)
      const matchedIds = Object.keys(idMatches);
      if (matchedIds.length > 0) {
        let criteria: any = { isDeleted: false, _id: { $in: matchedIds }, isActive: true };

        // Ownership check for products
        if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
          criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
        }
        console.log("criteria => ", criteria);
        const enrichedProducts = await findAllAndPopulateWithSorting(productModel, criteria, {}, {}, [
          { path: "companyId", select: "name" },
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
        ]);
        console.log("enrichedProducts => ", enrichedProducts);
        skuMatchesDetailsArray = await Promise.all(
          enrichedProducts.map(async (product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const productIdStr = product._id.toString();
            const stockCriteria: any = { isDeleted: false, productId: product._id };
            if (companyId) stockCriteria.companyId = new ObjectId(companyId.toString());

            // Pull first available stock for this item
            const stockInfo = await stockModel.findOne(stockCriteria).populate([
              { path: "companyId", select: "name" },
              { path: "branchId", select: "name" },
              { path: "purchaseTaxId"},
              { path: "salesTaxId" },
              { path: "uomId", select: "name code" },
            ]);

            return {
              ...productObj,
              mrp: stockInfo?.mrp || productObj.mrp || 0,
              sellingPrice: stockInfo?.sellingPrice || productObj.sellingPrice || 0,
              sellingDiscount: stockInfo?.sellingDiscount || 0,
              qty: stockInfo?.qty || 0,
              uomId: stockInfo?.uomId || null,
              purchaseTaxId: stockInfo?.purchaseTaxId || null,
              salesTaxId: stockInfo?.salesTaxId || null,
              isPurchaseTaxIncluding: stockInfo?.isPurchaseTaxIncluding,
              isSalesTaxIncluding: stockInfo?.isSalesTaxIncluding,
              branchId: stockInfo?.branchId || null,
              ai_confidence: idMatches[productIdStr] || 0,
              detect_qty: idCounts[productIdStr] || 1,
            };
          }),
        );
      }
    } catch (err: any) {
      console.error("Internal AI Delegation error:", err?.response?.data || err?.message);
      results = [{ success: false, message: "Detection service temporarily unavailable" }];
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Products detected successfully", { results, sku_matches_details: skuMatchesDetailsArray }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
  }
};

// export const detectProduct = async (req, res) => {
//   reqInfo(req);
//   try {
//     let files = req.files ? (req.files as any[]) : [];
//     if (!files || files.length === 0) {
//       if (req.file) {
//         files = [req.file];
//       } else {
//         return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "At least one image file is required", {}, {}));
//       }
//     }

//     const { user } = req.headers;
//     const userType = user?.userType;
//     const companyId = user?.companyId?._id;
//     let skuMatchesDetailsArray = [];

//     const formData = new FormData();
//     for (const file of files) {
//       formData.append("image", file.buffer, {
//         filename: file.originalname,
//         contentType: file.mimetype,
//       });
//     }

//     let results: any[] = [];

//     try {
//       const aiResponse = await axios.post("https://train-product.ai-setu.cloud/api/scanimg", formData, {
//         headers: { ...formData.getHeaders() },
//         timeout: 60000,
//       });

//       let responseData = aiResponse?.data || {};
//       let rootData = responseData;

//       if (Array.isArray(responseData)) {
//         rootData = responseData[0] || {};
//       } else if (Array.isArray(responseData.data)) {
//         rootData = responseData.data[0] || {};
//       } else if (responseData.data) {
//         rootData = responseData.data;
//       }

//       let skuMatches: Record<string, number> = {};
//       let skuCounts: Record<string, number> = {};

//       if (rootData.results && Array.isArray(rootData.results)) {
//         for (const item of rootData.results) {
//           if (item.response) {
//             const itemSkuMatches = item.response.sku_matches || {};
//             for (const [sku, conf] of Object.entries(itemSkuMatches)) {
//               skuMatches[sku] = Math.max(skuMatches[sku] || 0, conf as number);
//             }

//             const itemDetections = item.response.detections || [];
//             for (const det of itemDetections) {
//               if (det.matched_sku) {
//                 skuCounts[det.matched_sku] = (skuCounts[det.matched_sku] || 0) + 1;
//               }
//             }
//           }
//         }
//       } else {
//         const itemSkuMatches = rootData.sku_matches || {};
//         for (const [sku, conf] of Object.entries(itemSkuMatches)) {
//           skuMatches[sku] = conf as number;
//         }

//         if (rootData.sku_counts) {
//           skuCounts = rootData.sku_counts;
//         } else {
//           const itemDetections = rootData.detections || [];
//           for (const det of itemDetections) {
//             if (det.matched_sku) {
//               skuCounts[det.matched_sku] = (skuCounts[det.matched_sku] || 0) + 1;
//             }
//           }
//         }
//       }

//       const matchedSkus = Object.keys(skuMatches);

//       let products: any[] = [];
//       let productsWithStock: any[] = [];
//       const effectiveCompanyId = companyId || null;

//       if (matchedSkus.length > 0) {
//         let criteria: any = {
//           isDeleted: false,
//           sku: { $in: matchedSkus },
//           isActive: true,
//         };

//         if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
//           criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
//         }

//         let populate = [
//           { path: "categoryId", select: "name" },
//           { path: "subCategoryId", select: "name" },
//           { path: "brandId", select: "name" },
//           { path: "subBrandId", select: "name" },
//         ];
//         products = await findAllAndPopulateWithSorting(
//           productModel,
//           criteria,
//           {},
//           {},
//           populate
//         );

//         productsWithStock = await Promise.all(
//           products.map(async (product: any) => {
//             const productObj = product.toObject ? product.toObject() : product;
//             const linkedStockIds = (productObj.stockIds || []).filter((id: any) => id);

//             let stockCriteria: any = { isDeleted: false };

//             if (linkedStockIds.length > 0) {
//               stockCriteria._id = { $in: linkedStockIds.map((id: any) => new ObjectId(id.toString())) };
//               if (effectiveCompanyId) {
//                 stockCriteria.companyId = new ObjectId(effectiveCompanyId.toString());
//               }
//             } else {
//               stockCriteria.productId = product._id;
//               if (effectiveCompanyId) {
//                 stockCriteria.companyId = new ObjectId(effectiveCompanyId.toString());
//               }
//             }

//             const stockAggregation = await stockModel.aggregate([
//               { $match: stockCriteria },
//               {
//                 $lookup: {
//                   from: "taxes",
//                   localField: "purchaseTaxId",
//                   foreignField: "_id",
//                   as: "purchaseTax",
//                 },
//               },
//               {
//                 $unwind: {
//                   path: "$purchaseTax",
//                   preserveNullAndEmptyArrays: true,
//                 },
//               },
//               {
//                 $lookup: {
//                   from: "taxes",
//                   localField: "salesTaxId",
//                   foreignField: "_id",
//                   as: "salesTax",
//                 },
//               },
//               {
//                 $unwind: {
//                   path: "$salesTax",
//                   preserveNullAndEmptyArrays: true,
//                 },
//               },
//               {
//                 $lookup: {
//                   from: "uoms",
//                   localField: "uomId",
//                   foreignField: "_id",
//                   as: "uomData",
//                 },
//               },
//               {
//                 $unwind: {
//                   path: "$uomData",
//                   preserveNullAndEmptyArrays: true,
//                 },
//               },
//               {
//                 $project: {
//                   _id: 0,
//                   qty: 1,
//                   mrp: 1,
//                   sellingPrice: 1,
//                   sellingDiscount: 1,
//                   landingCost: 1,
//                   purchasePrice: 1,
//                   sellingMargin: 1,
//                   isPurchaseTaxIncluding: 1,
//                   isSalesTaxIncluding: 1,
//                   purchaseTaxId: {
//                     _id: "$purchaseTax._id",
//                     name: "$purchaseTax.name",
//                     percentage: "$purchaseTax.percentage",
//                   },
//                   salesTaxId: {
//                     _id: "$salesTax._id",
//                     name: "$salesTax.name",
//                     percentage: "$salesTax.percentage",
//                   },
//                   uomData: {
//                     _id: "$uomData._id",
//                     name: "$uomData.name",
//                     code: "$uomData.code",
//                   },
//                 },
//               },
//               { $limit: 1 }
//             ]);

//             const stockInfo = stockAggregation.length > 0 ? stockAggregation[0] : null;

//             return {
//               ...productObj,
//               mrp: stockInfo ? stockInfo.mrp : (productObj.mrp || 0),
//               sellingPrice: stockInfo ? stockInfo.sellingPrice : (productObj.sellingPrice || 0),
//               sellingDiscount: stockInfo ? stockInfo.sellingDiscount : (productObj.sellingDiscount || 0),
//               landingCost: stockInfo ? stockInfo.landingCost : (productObj.landingCost || 0),
//               purchasePrice: stockInfo ? stockInfo.purchasePrice : (productObj.purchasePrice || 0),
//               sellingMargin: stockInfo ? stockInfo.sellingMargin : (productObj.sellingMargin || 0),
//               qty: stockInfo ? stockInfo.qty : 0,
//               uomId: stockInfo ? stockInfo.uomData : null,
//               purchaseTaxId: (stockInfo && stockInfo.purchaseTaxId && stockInfo.purchaseTaxId._id) ? stockInfo.purchaseTaxId : null,
//               salesTaxId: (stockInfo && stockInfo.salesTaxId && stockInfo.salesTaxId._id) ? stockInfo.salesTaxId : null,
//               isPurchaseTaxIncluding: stockInfo ? stockInfo.isPurchaseTaxIncluding : false,
//               isSalesTaxIncluding: stockInfo ? stockInfo.isSalesTaxIncluding : false,
//             };
//           }),
//         );
//       }

//       skuMatchesDetailsArray = productsWithStock.map((p: any) => ({
//         ...p,
//         ai_confidence: skuMatches[p.sku] || 0,
//         detect_qty: skuCounts[p.sku] || 1
//       }));

//       // Return unified results block
//       results = [{
//         ...rootData,
//       }];
//     } catch (err: any) {
//       console.error("Error processing batch image detection", err?.message);
//       results = [{
//         success: false,
//         message: err?.message || "Detection failed for batch images",
//       }];
//     }

//     return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, (responseMessage as any)?.getDataSuccess?.("AI Detections") || "Products detected successfully", { results, sku_matches_details: skuMatchesDetailsArray || [] }, {}));
//   } catch (error) {
//     console.error(error);
//     return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, (responseMessage as any)?.internalServerError || "Internal server error", {}, error));
//   }
// };

export const getByBarcode = async (req, res) => {
  reqInfo(req);
  try {
    const code = req.params.code;
    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;

    let criteria: any = {
      $or: [{ barcode: code }, { "variants.barcode": code }],
      isDeleted: false,
    };
    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      criteria.$and = [{ $or: criteria.$or }, { $or: [{ companyId }, { companyId: null }, { companyId: { $exists: false } }] }];
      delete criteria.$or;
    }

    const product = await getFirstMatch(productModel, criteria, {}, {
      populate: [
        { path: "categoryId", select: "name" },
        { path: "brandId", select: "name" },
        { path: "productTypeId", select: "name" },
      ],
    });
    if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json(
      new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {})
    );

    // Determine matchedVariant
    const productObj = product.toObject ? product.toObject() : product;
    let matchedVariant = null;
    if (product.barcode !== code) {
      matchedVariant = (productObj.variants || []).find((v: any) => v.barcode === code) || null;
    }

    // Fetch stock
    const stockCriteria: any = { productId: product._id, isDeleted: false };
    if (companyId) stockCriteria.companyId = new ObjectId(companyId.toString());
    if (branchId) stockCriteria.branchId = new ObjectId(branchId.toString());
    if (matchedVariant) stockCriteria.variantId = matchedVariant._id;

    const stock = await stockModel.findOne(stockCriteria).populate([
      { path: "uomId", select: "name code" },
      { path: "purchaseTaxId", select: "name percentage" },
      { path: "salesTaxId", select: "name percentage" },
      { path: "branchId", select: "name" },
    ]);

    const result = {
      product: { ...productObj, variants: undefined },
      matchedVariant,
      stock: stock ? {
        qty: stock.qty,
        mrp: stock.mrp,
        sellingPrice: stock.sellingPrice,
        sellingDiscount: stock.sellingDiscount,
        purchasePrice: stock.purchasePrice,
        landingCost: stock.landingCost,
        uomId: stock.uomId,
        purchaseTaxId: stock.purchaseTaxId,
        salesTaxId: stock.salesTaxId,
        isPurchaseTaxIncluding: stock.isPurchaseTaxIncluding,
        isSalesTaxIncluding: stock.isSalesTaxIncluding,
        branchId: stock.branchId,
      } : null,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const assignBarcodes = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const userCompanyId = user?.companyId?._id;

    // Optional productId from body to target a specific product
    const { productId } = req.body;

    const companyId = userType !== USER_TYPES.SUPER_ADMIN ? userCompanyId : null;

    let productsToProcess: any[] = [];

    if (productId) {
      const criteria: any = { _id: productId, isDeleted: false };
      if (companyId) criteria.companyId = companyId;

      const product = await productModel.findOne(criteria);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {})
        );
      }
      productsToProcess = [product];
    } else {
      // Find all products for the company (or all if super admin) that are missing barcodes
      // either at the product level or in any of their variants
      let query: any = { isDeleted: false };
      if (companyId) query.companyId = companyId;

      query.$or = [
        { barcode: { $in: [null, undefined, ""] } },
        { barcode: { $exists: false } },
        {
          $and: [
            { variants: { $exists: true, $not: { $size: 0 } } },
            {
              $or: [
                { "variants.barcode": { $in: [null, undefined, ""] } },
                { "variants.barcode": { $exists: false } }
              ]
            }
          ]
        }
      ];

      productsToProcess = await productModel.find(query);
    }

    if (productsToProcess.length === 0) {
      return res.status(HTTP_STATUS.OK).json(
        new apiResponse(HTTP_STATUS.OK, "No products found that require barcode assignment", { updatedProductsCount: 0, updatedVariantsCount: 0 }, {})
      );
    }

    let updatedProductsCount = 0;
    let updatedVariantsCount = 0;
    const localGeneratedBarcodes = new Set<string>();

    for (const product of productsToProcess) {
      let isUpdated = false;
      const targetCompanyId = product.companyId || companyId;

      // 1. Assign product-level barcode if missing
      if (!product.barcode || product.barcode.trim() === "") {
        product.barcode = await generateUniqueEan13Barcode(targetCompanyId, localGeneratedBarcodes);
        product.barcodeType = "EAN_13";
        localGeneratedBarcodes.add(product.barcode);
        isUpdated = true;
        updatedProductsCount++;
      }

      // 2. Assign variant-level barcodes if missing
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (!variant.barcode || variant.barcode.trim() === "") {
            variant.barcode = await generateUniqueEan13Barcode(targetCompanyId, localGeneratedBarcodes);
            variant.barcodeType = "EAN_13";
            localGeneratedBarcodes.add(variant.barcode);
            isUpdated = true;
            updatedVariantsCount++;
          }
        }
      }

      if (isUpdated) {
        await productModel.updateOne(
          { _id: product._id },
          {
            $set: {
              barcode: product.barcode,
              barcodeType: product.barcodeType,
              variants: product.variants,
              updatedBy: user?._id || null
            }
          }
        );
      }
    }

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        "Barcodes assigned successfully",
        {
          updatedProductsCount,
          updatedVariantsCount,
          totalProductsProcessed: productsToProcess.length,
        },
        {}
      )
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error)
    );
  }
};
