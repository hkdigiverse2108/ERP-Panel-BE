import { apiResponse, HTTP_STATUS, DISCOUNT_MODE, DISCOUNT_APPLICABLE, DISCOUNT_APPLIES_TO, MINIMUM_REQUIREMENT, DISCOUNT_STATUS, VALUE_TYPE } from "../../common";
import { discountModel, productModel, PosOrderModel } from "../../database";

import { checkCompany, checkIdExist, countData, createOne, findAllAndPopulate, getData, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addDiscountSchema, deleteDiscountSchema, editDiscountSchema, getDiscountSchema, verifyDiscountSchema, applyDiscountSchema, removeDiscountSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

// Populate paths for discount references
const discountPopulate = [
  { path: "companyId", select: "name" },
  { path: "branchIds", select: "name" },
  { path: "categoryIds", select: "name" },
  { path: "subcategoryIds", select: "name" },
  { path: "brandIds", select: "name" },
  { path: "productIds", select: "name" },
  { path: "excludedProductIds", select: "name" },
  { path: "buyXGetY.getProductIds", select: "name" },
  { path: "productAtFixAmount.freeProductIds", select: "name" },
  { path: "createdBy", select: "fullName" },
  { path: "updatedBy", select: "fullName" },
];

export const addDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addDiscountSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate date range when end date is set
    if (value.hasEndDate && value.endDateTime && new Date(value.startDateTime) >= new Date(value.endDateTime)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start Date must be before End Date", {}, {}));
    }

    // Check unique title
    const titleExist = await getFirstMatch(discountModel, { companyId: value.companyId, title: value?.title, isDeleted: false }, {}, {});
    if (titleExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Title"), {}, {}));

    // Check unique discount code (if provided)
    if (value.discountCode) {
      const codeExist = await getFirstMatch(discountModel, { companyId: value.companyId, discountCode: value.discountCode, isDeleted: false }, {}, {});
      if (codeExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Discount Code"), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    // chnage other with auto apply true to false
    if (value.autoApply) {
      await discountModel.updateMany({ companyId: value.companyId, autoApply: true }, { autoApply: false });
    }

    const response = await createOne(discountModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }



    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editDiscountSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let isExist = await getFirstMatch(discountModel, { _id: value?.discountId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    // Check unique title
    if (value.title) {
      const titleExist = await getFirstMatch(discountModel, { companyId: isExist?.companyId, title: value?.title, isDeleted: false, _id: { $ne: value?.discountId } }, {}, {});
      if (titleExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Title"), {}, {}));
    }

    // Check unique discount code (if being updated)
    if (value.discountCode) {
      const codeExist = await getFirstMatch(discountModel, { companyId: isExist?.companyId, discountCode: value.discountCode, isDeleted: false, _id: { $ne: value?.discountId } }, {}, {});
      if (codeExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Discount Code"), {}, {}));
    }

    // Validate date range if dates are being updated
    const startDT = value.startDateTime || isExist.startDateTime;
    const endDT = value.endDateTime || isExist.endDateTime;
    const hasEndDate = value.hasEndDate !== undefined ? value.hasEndDate : isExist.hasEndDate;

    if (hasEndDate && endDT && new Date(startDT) >= new Date(endDT)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start Date must be before End Date", {}, {}));
    }

    value.updatedBy = user?._id || null;

    // chnage other with auto apply true to false
    if (value.autoApply) {
      await discountModel.updateMany({ companyId: isExist?.companyId, autoApply: true }, { autoApply: false });
    }

    const response = await updateData(discountModel, { _id: value?.discountId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Discount"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteDiscountSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(discountModel, value?.id, "Discount", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(discountModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Discount"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, status, startDateTime, endDateTime, activeFilter, companyFilter, discountMode, appliesTo, branchFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [
        { title: { $regex: search, $options: "si" } },
        { discountCode: { $regex: search, $options: "si" } },
      ];
    }

    if (status) {
      criteria.status = status;
    }

    if (discountMode) {
      criteria.discountMode = discountMode;
    }

    if (appliesTo) {
      criteria.appliesTo = appliesTo;
    }

    if (branchFilter) {
      criteria.branchIds = new ObjectId(branchFilter);
    }

    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime as string);
      const end = new Date(endDateTime as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.startDateTime = { $lte: end };
        criteria.$and = [
          { $or: [{ endDateTime: { $gte: start } }, { endDateTime: null }, { hasEndDate: false }] },
        ];
      }
    }

    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    };

    const response = await findAllAndPopulate(discountModel, criteria, {}, options, discountPopulate);

    const discountIds = response.map((d: any) => d._id);
    const stats = await PosOrderModel.aggregate([
      { $match: { discountId: { $in: discountIds }, isDeleted: false } },
      {
        $group: {
          _id: "$discountId",
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const statsMap = stats.reduce((acc: any, curr: any) => {
      acc[curr._id.toString()] = { orders: curr.orders, revenue: curr.revenue };
      return acc;
    }, {});

    const enrichedResponse = response.map((d: any) => {
      const s = statsMap[d._id.toString()] || { orders: 0, revenue: 0 };
      return {
        ...d,
        orders: s.orders,
        revenue: s.revenue,
      };
    });

    const totalData = await countData(discountModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    // --- Global Summary Stats ---
    const globalStats = await PosOrderModel.aggregate([
      { $match: { companyId: criteria.companyId, discountId: { $ne: null }, isDeleted: false } },
      {
        $group: {
          _id: null,
          orderWithDiscounts: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
          discountGiven: { $sum: "$discountAmount" },
        },
      },
    ]);

    const activeDiscounts = await countData(discountModel, { companyId: criteria.companyId, status: "active", isDeleted: false });

    const summary = {
      totalDiscounts: totalData,
      activeDiscounts,
      orderWithDiscounts: globalStats[0]?.orderWithDiscounts || 0,
      revenue: globalStats[0]?.revenue || 0,
      discountGiven: globalStats[0]?.discountGiven || 0,
    };
    // ----------------------------

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Discount"), { discount_data: enrichedResponse, totalData, state, ...summary }, {}));


  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getDiscountSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await findAllAndPopulate(discountModel, { _id: value?.id, isDeleted: false }, {}, {}, discountPopulate);

    if (!response || response.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    const discount = response[0];
    const stats = await PosOrderModel.aggregate([
      { $match: { discountId: discount._id, isDeleted: false } },
      {
        $group: {
          _id: "$discountId",
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const s = stats[0] || { orders: 0, revenue: 0 };
    const enrichedDiscount = {
      ...discount,
      orders: s.orders,
      revenue: s.revenue,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Discount"), enrichedDiscount, {}));

  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getDropdownDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { search, status, startDateTime, endDateTime, activeFilter, companyFilter, discountMode, appliesTo, branchFilter } = req.query;

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [
        { title: { $regex: search, $options: "si" } },
        { discountCode: { $regex: search, $options: "si" } },
      ];
    }

    if (status) {
      criteria.status = status;
    }

    if (discountMode) {
      criteria.discountMode = discountMode;
    }

    if (appliesTo) {
      criteria.appliesTo = appliesTo;
    }

    if (branchFilter) {
      criteria.branchIds = new ObjectId(branchFilter);
    }

    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime as string);
      const end = new Date(endDateTime as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.startDateTime = { $lte: end };
        criteria.$and = [
          { $or: [{ endDateTime: { $gte: start } }, { endDateTime: null }, { hasEndDate: false }] },
        ];
      }
    }
    // avoid most fields
    const projection = {
      discountCode: 1,
      title: 1,
      autoApply: 1,
      // discountMode: 1,
      // discountType: 1,
      // discountValue: 1,
      // appliesTo: 1,
      // minimumRequirement: 1,
      // minimumPurchaseAmount: 1,
      // minimumQuantity: 1,
      // branchIds: 1,
      // customerIds: 1,
      // productIds: 1,
      // categoryIds: 1,
      // brandIds: 1,
      // customerGroupIds: 1,
      // status: 1,
      // isActive: 1,
      // hasEndDate: 1,
      // startDateTime: 1,
      // endDateTime: 1,
      // createdAt: 1,
      // updatedAt: 1,
    };

    const response = await getData(discountModel, criteria, projection, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// ─── Discount Eligibility Check (shared by verify & apply) ───

const checkDiscountEligibility = async (discount: any, branchId: string, customerId: string | null, items: any[], totalAmount: number, totalQty: number) => {
  // 1. Status
  if (discount.status !== DISCOUNT_STATUS.ACTIVE) {
    return `Discount is ${discount.status}`;
  }

  // 2. Date/Time range
  const now = new Date();

  if (discount.startDateTime) {
    if (now < new Date(discount.startDateTime)) return "Discount is not yet active";
  }

  if (discount.hasEndDate && discount.endDateTime) {
    if (now > new Date(discount.endDateTime)) return "Discount has expired";
  }

  // 3. Branch scope
  if (discount.branchIds && discount.branchIds.length > 0 && branchId) {
    const branchMatch = discount.branchIds.some((b: any) => b.toString() === branchId.toString());
    if (!branchMatch) return "Discount is not available for this branch";
  }

  // 4. Minimum requirement
  if (discount.minimumRequirement === MINIMUM_REQUIREMENT.MIN_PURCHASE_AMOUNT) {
    if (totalAmount < (discount.minimumPurchaseAmount || 0)) {
      return `Minimum purchase amount of ${discount.minimumPurchaseAmount} is required`;
    }
  } else if (discount.minimumRequirement === MINIMUM_REQUIREMENT.MIN_QUANTITY) {
    if (totalQty < (discount.minimumQuantity || 0)) {
      return `Minimum quantity of ${discount.minimumQuantity} items is required`;
    }
  }

  // 5. Usage limits
  if (discount.usageLimitTotal && discount.usedCount >= discount.usageLimitTotal) {
    return "Discount usage limit reached";
  }

  if (discount.usageLimitPerCustomer && customerId) {
    const customerEntry = discount.customerIds ? discount.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;
    if (customerEntry) return "You have already used this discount";
  }

  return null; // eligible
};

// ─── Get Qualifying Items ───

const getQualifyingItems = async (discount: any, items: any[]) => {
  let qualifyingItems = [...items];

  // Filter by appliesTo
  if (discount.appliesTo === DISCOUNT_APPLIES_TO.SPECIFIC_PRODUCTS) {
    const productIdSet = new Set((discount.productIds || []).map((id: any) => id.toString()));
    qualifyingItems = qualifyingItems.filter((item: any) => productIdSet.has(item.productId?.toString()));
  } else if (discount.appliesTo === DISCOUNT_APPLIES_TO.SPECIFIC_CATEGORY || discount.appliesTo === DISCOUNT_APPLIES_TO.SPECIFIC_BRAND) {
    // Fetch product details for category/brand matching
    const productIds = items.map((item: any) => item.productId);
    const products = await productModel.find({ _id: { $in: productIds }, isDeleted: false }).lean();
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    if (discount.appliesTo === DISCOUNT_APPLIES_TO.SPECIFIC_CATEGORY) {
      const categoryIdSet = new Set((discount.categoryIds || []).map((id: any) => id.toString()));
      const subcategoryIdSet = new Set((discount.subcategoryIds || []).map((id: any) => id.toString()));

      qualifyingItems = qualifyingItems.filter((item: any) => {
        const product = productMap.get(item.productId?.toString());
        if (!product) return false;
        return categoryIdSet.has(product.categoryId?.toString()) || subcategoryIdSet.has(product.subCategoryId?.toString());
      });
    } else {
      const brandIdSet = new Set((discount.brandIds || []).map((id: any) => id.toString()));
      qualifyingItems = qualifyingItems.filter((item: any) => {
        const product = productMap.get(item.productId?.toString());
        if (!product) return false;
        return brandIdSet.has(product.brandId?.toString());
      });
    }
  }

  // Exclude specific products
  if (discount.excludedProductIds && discount.excludedProductIds.length > 0) {
    const excludeSet = new Set(discount.excludedProductIds.map((id: any) => id.toString()));
    qualifyingItems = qualifyingItems.filter((item: any) => !excludeSet.has(item.productId?.toString()));
  }

  // Exclude already discounted
  if (discount.excludeAlreadyDiscounted) {
    qualifyingItems = qualifyingItems.filter((item: any) => !(item.discountAmount > 0));
  }

  // Ensure reward products for BUY_X_GET_Y are included if they are in the cart
  if (discount.discountMode === DISCOUNT_MODE.BUY_X_GET_Y && discount.buyXGetY?.getProductIds?.length > 0) {
    const rewardProductIdSet = new Set(discount.buyXGetY.getProductIds.map((id: any) => id.toString()));
    const rewardItemsInCart = items.filter((item: any) => rewardProductIdSet.has(item.productId?.toString()));

    // Add reward items if they are not already in qualifyingItems
    const existingQualifyingIds = new Set(qualifyingItems.map((item: any) => item.productId?.toString()));
    for (const rewardItem of rewardItemsInCart) {
      if (!existingQualifyingIds.has(rewardItem.productId?.toString())) {
        qualifyingItems.push(rewardItem);
      }
    }
  }

  return qualifyingItems;
};

// ─── Calculate Discount Amount ───

const calculateDiscountAmount = (discount: any, qualifyingItems: any[], totalAmount: number) => {
  let discountAmount = 0;

  if (discount.discountMode === DISCOUNT_MODE.NORMAL) {
    if (discount.discountApplicable === DISCOUNT_APPLICABLE.ENTIRE_BILL) {
      if (discount.discountType === VALUE_TYPE.PERCENTAGE) {
        discountAmount = (totalAmount * (discount.discountValue || 0)) / 100;
      } else {
        discountAmount = discount.discountValue || 0;
      }
    } else {
      for (const item of qualifyingItems) {
        const itemTotal = (item.mrp || item.unitCost || 0) * (item.qty || 1);
        if (discount.discountType === VALUE_TYPE.PERCENTAGE) {
          discountAmount += (itemTotal * (discount.discountValue || 0)) / 100;
        } else {
          discountAmount += discount.discountValue || 0;
        }
      }
    }
  } else if (discount.discountMode === DISCOUNT_MODE.RANGE_WISE) {
    for (const item of qualifyingItems) {
      const qty = item.qty || 1;
      const itemTotal = (item.mrp || item.unitCost || 0) * qty;
      const rule = (discount.rangeWiseRules || []).find((r: any) => qty >= r.minQty && qty <= r.maxQty);
      if (rule) {
        if (rule.discountType === VALUE_TYPE.PERCENTAGE) {
          discountAmount += (itemTotal * rule.discountValue) / 100;
        } else {
          discountAmount += rule.discountValue;
        }
      }
    }
  } else if (discount.discountMode === DISCOUNT_MODE.BUY_X_GET_Y) {
    const bxgy = discount.buyXGetY;
    if (bxgy) {
      const totalQualifyingQty = qualifyingItems.reduce((sum, item) => sum + (item.qty || 0), 0);
      const numSets = Math.floor(totalQualifyingQty / bxgy.buyQty);
      let totalGetQty = numSets * bxgy.getQty;

      if (totalGetQty > 0) {
        let potentialRewardItems = [];

        if (bxgy.getProductIds && bxgy.getProductIds.length > 0) {
          // Discount applies to specific products in the cart
          const rewardProductIdSet = new Set(bxgy.getProductIds.map((id: any) => id.toString()));
          // Important: reward items must be in the original items list, not just qualifyingItems
          // However, qualifyingItems usually already includes relevant items. 
          // Let's assume reward items should also be from the list of items provided (passed through qualifyingItems logic or similar)
          // Actually, let's use all items from qualifyingItems if they match rewardProductIdSet
          potentialRewardItems = qualifyingItems.filter((item: any) => rewardProductIdSet.has(item.productId?.toString()));
        } else {
          // Discount applies to the same items that qualified
          potentialRewardItems = [...qualifyingItems];
        }

        // Sort by price (ascending) to apply discount to cheapest items first (standard practice)
        potentialRewardItems.sort((a, b) => (a.mrp || a.unitCost || 0) - (b.mrp || b.unitCost || 0));

        let appliedGetQty = 0;
        for (const item of potentialRewardItems) {
          if (appliedGetQty >= totalGetQty) break;

          const itemPrice = item.mrp || item.unitCost || 0;
          const itemQtyAvailable = item.qty || 0;
          const qtyToDiscount = Math.min(itemQtyAvailable, totalGetQty - appliedGetQty);

          if (bxgy.getDiscountType === VALUE_TYPE.PERCENTAGE) {
            discountAmount += (itemPrice * qtyToDiscount * bxgy.getDiscountValue) / 100;
          } else {
            discountAmount += qtyToDiscount * bxgy.getDiscountValue;
          }
          appliedGetQty += qtyToDiscount;
        }
      }
    }
  } else if (discount.discountMode === DISCOUNT_MODE.PRODUCT_AT_FIX_AMOUNT) {
    const fixAmount = discount.productAtFixAmount;
    if (fixAmount && totalAmount >= fixAmount.minimumAmount) {
      discountAmount = 0; // free product benefit, handled by frontend/POS
    }
  }

  // Ensure discount doesn't exceed total
  discountAmount = Math.min(discountAmount, totalAmount);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return discountAmount;
};

// ─── Verify Discount (check eligibility + calculate, no usage increment) ───

export const verifyDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = verifyDiscountSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { discountId, discountCode, branchId, customerId, items, totalAmount, totalQty } = value;

    const criteria: any = { isDeleted: false };
    if (discountId) {
      criteria._id = discountId;
    } else {
      criteria.discountCode = discountCode;
    }

    const discount = await getFirstMatch(discountModel, criteria, {}, {});
    if (!discount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    const eligibilityError = await checkDiscountEligibility(discount, branchId, customerId, items || [], totalAmount || 0, totalQty || 0);
    if (eligibilityError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, eligibilityError, {}, {}));
    }

    const qualifyingItems = await getQualifyingItems(discount, items || []);

    if (qualifyingItems.length === 0 && discount.discountMode !== DISCOUNT_MODE.PRODUCT_AT_FIX_AMOUNT) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No items qualify for this discount", {}, {}));
    }

    const discountAmount = calculateDiscountAmount(discount, qualifyingItems, totalAmount || 0);

    const result: any = {
      discountId: discount._id,
      title: discount.title,
      discountCode: discount.discountCode,
      discountMode: discount.discountMode,
      discountApplicable: discount.discountApplicable,
      discountAmount,
      qualifyingItemCount: qualifyingItems.length,
      finalAmount: (totalAmount || 0) - discountAmount,
    };

    if (discount.discountMode === DISCOUNT_MODE.BUY_X_GET_Y && discount.buyXGetY) {
      result.freeProducts = {
        buyQty: discount.buyXGetY.buyQty,
        getQty: discount.buyXGetY.getQty,
        getProductIds: discount.buyXGetY.getProductIds,
        getDiscountType: discount.buyXGetY.getDiscountType,
        getDiscountValue: discount.buyXGetY.getDiscountValue,
      };
    }

    if (discount.discountMode === DISCOUNT_MODE.PRODUCT_AT_FIX_AMOUNT && discount.productAtFixAmount) {
      const fixAmount = discount.productAtFixAmount;
      if ((totalAmount || 0) >= fixAmount.minimumAmount) {
        result.freeProducts = {
          freeProductIds: fixAmount.freeProductIds,
          freeQty: fixAmount.freeQty,
          minimumAmount: fixAmount.minimumAmount,
        };
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Discount verified successfully", result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

// ─── Apply Discount (verify + increment usage) ───

export const applyDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = applyDiscountSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { discountId, discountCode, branchId, customerId, items, totalAmount, totalQty } = value;

    const criteria: any = { isDeleted: false };
    if (discountId) {
      criteria._id = discountId;
    } else {
      criteria.discountCode = discountCode;
    }

    const discount = await getFirstMatch(discountModel, criteria, {}, {});
    if (!discount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    const eligibilityError = await checkDiscountEligibility(discount, branchId, customerId, items || [], totalAmount || 0, totalQty || 0);
    if (eligibilityError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, eligibilityError, {}, {}));
    }

    const qualifyingItems = await getQualifyingItems(discount, items || []);

    if (qualifyingItems.length === 0 && discount.discountMode !== DISCOUNT_MODE.PRODUCT_AT_FIX_AMOUNT) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No items qualify for this discount", {}, {}));
    }

    const discountAmount = calculateDiscountAmount(discount, qualifyingItems, totalAmount || 0);


    const result: any = {
      discountId: discount._id,
      title: discount.title,
      discountCode: discount.discountCode,
      discountMode: discount.discountMode,
      discountApplicable: discount.discountApplicable,
      discountAmount,
      qualifyingItemCount: qualifyingItems.length,
      finalAmount: (totalAmount || 0) - discountAmount,
    };

    if (discount.discountMode === DISCOUNT_MODE.BUY_X_GET_Y && discount.buyXGetY) {
      result.freeProducts = {
        buyQty: discount.buyXGetY.buyQty,
        getQty: discount.buyXGetY.getQty,
        getProductIds: discount.buyXGetY.getProductIds,
        getDiscountType: discount.buyXGetY.getDiscountType,
        getDiscountValue: discount.buyXGetY.getDiscountValue,
      };
    }

    if (discount.discountMode === DISCOUNT_MODE.PRODUCT_AT_FIX_AMOUNT && discount.productAtFixAmount) {
      const fixAmount = discount.productAtFixAmount;
      if ((totalAmount || 0) >= fixAmount.minimumAmount) {
        result.freeProducts = {
          freeProductIds: fixAmount.freeProductIds,
          freeQty: fixAmount.freeQty,
          minimumAmount: fixAmount.minimumAmount,
        };
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Discount applied successfully", result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

// ─── Remove Discount (decrement usage) ───

export const removeDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = removeDiscountSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { discountId, customerId } = value;

    const discount = await getFirstMatch(discountModel, { _id: discountId }, {}, {});
    if (!discount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    // Decrement usage logic removed (now handled in order flows)


    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Discount removed successfully", {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};
