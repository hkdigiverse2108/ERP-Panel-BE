import mongoose from "mongoose";
import { apiResponse, CUSTOMER_CATEGORY_ENUM, HTTP_STATUS, POS_ORDER_STATUS, VOUCHAR_TYPE, ACCOUNT_TYPE, POS_VOUCHER_TYPE, RETURN_POS_ORDER_TYPE, PAYMENT_MODE } from "../../common";
import { accountModel, debitNoteModel, InvoiceModel, PosOrderModel, PosPaymentModel, productModel, returnPosOrderModel, salesCreditNoteModel, stockModel, supplierBillModel, voucherModel } from "../../database";
import { applyDateFilter, reqInfo, responseMessage } from "../../helper";
import { getCategoryWiseCustomersSchema, } from "../../validation";

// Frequency-based thresholds for customer categorization
const CUSTOMER_THRESHOLDS = {
    VIP: 5,
    REGULAR: 3,
    RISK: 1,
};

export const transactionDetails = async (req, res) => {
    try {
        const { user } = req.headers;
        let { startDate, endDate, companyFilter } = req.query;

        let finalCompanyId = user?.companyId?._id;
        if (companyFilter) {
            finalCompanyId = new mongoose.Types.ObjectId(companyFilter as string);
        } else if (finalCompanyId) {
            finalCompanyId = new mongoose.Types.ObjectId(finalCompanyId as string);
        }

        const commonCriteria: any = { isDeleted: false };
        if (finalCompanyId) commonCriteria.companyId = finalCompanyId;

        const dateCriteria: any = { ...commonCriteria };
        applyDateFilter(dateCriteria, startDate as string, endDate as string, "createdAt");

        // Specific date criteria for models with distinct date fields if needed
        const voucherDateCriteria: any = { ...commonCriteria };
        applyDateFilter(voucherDateCriteria, startDate as string, endDate as string, "date");

        const purchaseDateCriteria: any = { ...commonCriteria };
        applyDateFilter(purchaseDateCriteria, startDate as string, endDate as string, "supplierBillDate");

        // Execute aggregations in parallel
        const [
            salesData,
            purchaseData,
            salesReturnData,
            expenseData,
            inventoryData,
            cashFlowData
        ] = await Promise.all([
            // 🔹 Sales & Revenue
            PosOrderModel.aggregate([
                { $match: { ...dateCriteria, status: POS_ORDER_STATUS.COMPLETED } },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: "$totalAmount" },
                        totalInvoice: { $sum: 1 },
                        soldQty: { $sum: "$totalQty" },
                        uniqueCustomers: { $addToSet: { $cond: [{ $ne: ["$customerId", null] }, "$customerId", "$$REMOVE"] } },
                        toReceive: { $sum: "$dueAmount" },
                        totalItemCost: {
                            $sum: {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: ["$$this.qty", { $ifNull: ["$$this.unitCost", 0] }] }] }
                                }
                            }
                        }
                    }
                }
            ]),
            // 🔹 Purchase & Supplier
            supplierBillModel.aggregate([
                { $match: purchaseDateCriteria },
                {
                    $group: {
                        _id: null,
                        totalPurchase: { $sum: "$summary.netAmount" },
                        totalBills: { $sum: 1 },
                        purchaseQty: { $sum: "$productDetails.totalQty" },
                        uniqueSuppliers: { $addToSet: { $cond: [{ $ne: ["$supplierId", null] }, "$supplierId", "$$REMOVE"] } },
                        toPay: { $sum: "$balanceAmount" },
                        totalPurchaseReturn: { $sum: "$returnProductDetails.summary.netAmount" }
                    }
                }
            ]),
            // 🔹 Sales Return
            returnPosOrderModel.aggregate([
                { $match: dateCriteria },
                {
                    $group: {
                        _id: null,
                        totalSalesReturn: { $sum: "$total" }
                    }
                }
            ]),
            // 🔹 Expense
            voucherModel.aggregate([
                { $match: { ...voucherDateCriteria, type: VOUCHAR_TYPE.EXPENSE } },
                {
                    $group: {
                        _id: null,
                        totalExpense: { $sum: "$amount" }
                    }
                }
            ]),
            // 🔹 Inventory & Stock
            Promise.all([
                productModel.countDocuments(commonCriteria),
                stockModel.aggregate([
                    { $match: commonCriteria },
                    {
                        $group: {
                            _id: null,
                            stockQty: { $sum: "$qty" },
                            stockValue: { $sum: { $multiply: ["$qty", "$landingCost"] } }
                        }
                    }
                ])
            ]),
            // 🔹 Cash Flow
            accountModel.aggregate([
                { $match: commonCriteria },
                {
                    $group: {
                        _id: null,
                        cashInHand: {
                            $sum: {
                                $cond: [{ $eq: ["$type", ACCOUNT_TYPE.CASH] }, "$currentBalance", 0]
                            }
                        },
                        bankAccountsBalance: {
                            $sum: {
                                $cond: [{ $eq: ["$type", ACCOUNT_TYPE.BANK] }, "$currentBalance", 0]
                            }
                        }
                    }
                }
            ])
        ]);

        // console.log("Criteria Used:", { commonCriteria, dateCriteria, voucherDateCriteria, purchaseDateCriteria });
        // console.log("Raw Aggregation Data:", { salesData, purchaseData, salesReturnData, expenseData, inventoryData, cashFlowData });


        const s = salesData[0] || {};
        const p = purchaseData[0] || {};
        const sr = salesReturnData[0] || {};
        const ex = expenseData[0] || {};
        const [totalProducts, stockInfo] = inventoryData;
        const si = stockInfo[0] || {};
        const cf = cashFlowData[0] || {};

        const totalSales = s.totalSales || 0;
        const totalInvoice = s.totalInvoice || 0;
        const uniqueCustomersCount = (s.uniqueCustomers || []).length;
        const grossProfit = totalSales - (s.totalItemCost || 0);

        // 🔹 Profitability calculations
        const avgProfitMarginAmount = totalInvoice > 0 ? grossProfit / totalInvoice : 0;
        const avgProfitMarginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

        // 🔹 Customer & Billing Insights
        const avgCartValue = totalInvoice > 0 ? totalSales / totalInvoice : 0;
        const avgBillsCount = uniqueCustomersCount > 0 ? totalInvoice / uniqueCustomersCount : 0;

        // Get total paid from payment vouchers
        const [paymentData] = await voucherModel.aggregate([
            { $match: { ...voucherDateCriteria, type: VOUCHAR_TYPE.PAYMENT } },
            { $group: { _id: null, totalPaid: { $sum: "$amount" } } }
        ]);


        const result = {
            // Sales & Revenue
            totalSales: Number(totalSales.toFixed(2)),
            totalInvoice: totalInvoice,
            soldQty: s.soldQty || 0,
            totalCustomers: uniqueCustomersCount,
            toReceive: Number((s.toReceive || 0).toFixed(2)),
            totalSalesReturn: Number((sr.totalSalesReturn || 0).toFixed(2)),

            // Purchase & Supplier
            totalPurchase: Number((p.totalPurchase || 0).toFixed(2)),
            totalBills: p.totalBills || 0,
            purchaseQty: p.purchaseQty || 0,
            totalSuppliers: (p.uniqueSuppliers || []).length,
            toPay: Number((p.toPay || 0).toFixed(2)),
            totalPurchaseReturn: Number((p.totalPurchaseReturn || 0).toFixed(2)),

            // Expense & Cash Flow
            totalPaid: Number((paymentData?.totalPaid || 0).toFixed(2)),
            totalExpense: Number((ex.totalExpense || 0).toFixed(2)),
            cashInHand: Number((cf.cashInHand || 0).toFixed(2)),
            bankAccountsBalance: Number((cf.bankAccountsBalance || 0).toFixed(2)),

            // Inventory & Stock
            totalProducts: totalProducts,
            stockQty: si.stockQty || 0,
            stockValue: Number((si.stockValue || 0).toFixed(2)),

            // Profitability
            grossProfit: Number(grossProfit.toFixed(2)),
            avgProfitMarginAmount: Number(avgProfitMarginAmount.toFixed(2)),
            avgProfitMarginPercent: Number(avgProfitMarginPercent.toFixed(2)),

            // Customer & Billing Insights
            avgCartValue: Number(avgCartValue.toFixed(2)),
            avgBillsCount: Number(avgBillsCount.toFixed(2))
        };

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Dashboard Transaction Details"), result, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};


export const topCustomers = async (req, res) => {
    try {
        const { user } = req.headers;

        let { limit = 20, startDate, endDate, companyFilter, companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED, customerId: { $ne: null } };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosOrderModel.aggregate([
            { $match: criteria },
            {
                $group: {
                    _id: "$customerId",
                    noOfBill: { $sum: 1 },
                    salesValue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { salesValue: -1 } },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "contacts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    customerId: {
                        _id: "$_id",
                        name: {
                            $cond: {
                                if: { $or: [{ $ifNull: ["$customer.firstName", false] }, { $ifNull: ["$customer.lastName", false] }] },
                                then: { $trim: { input: { $concat: [{ $ifNull: ["$customer.firstName", ""] }, " ", { $ifNull: ["$customer.lastName", ""] }] } } },
                                else: "$customer.companyName"
                            }
                        }
                    },
                    noOfBill: 1,
                    salesValue: 1
                }
            }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Top Customers"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const categoryWiseCustomersCount = async (req, res) => {
    try {
        const { user } = req.headers;


        let { startDate, endDate, companyFilter, companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED, customerId: { $ne: null } };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosOrderModel.aggregate([
            { $match: criteria },
            {
                $group: {
                    _id: "$customerId",
                    noOfBill: { $sum: 1 }
                }
            },
            {
                $project: {
                    category: {
                        $switch: {
                            branches: [
                                { case: { $gte: ["$noOfBill", CUSTOMER_THRESHOLDS.VIP] }, then: CUSTOMER_CATEGORY_ENUM.VIP },
                                { case: { $gte: ["$noOfBill", CUSTOMER_THRESHOLDS.REGULAR] }, then: CUSTOMER_CATEGORY_ENUM.REGULAR },
                                { case: { $gte: ["$noOfBill", CUSTOMER_THRESHOLDS.RISK] }, then: CUSTOMER_CATEGORY_ENUM.RISK }
                            ],
                            default: CUSTOMER_CATEGORY_ENUM.LOST
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    allCategories: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    _id: 0,
                    data: {
                        $map: {
                            input: [
                                CUSTOMER_CATEGORY_ENUM.VIP,
                                CUSTOMER_CATEGORY_ENUM.REGULAR,
                                CUSTOMER_CATEGORY_ENUM.RISK,
                                CUSTOMER_CATEGORY_ENUM.LOST
                            ],
                            as: "cat",
                            in: {
                                $let: {
                                    vars: {
                                        match: {
                                            $filter: {
                                                input: "$allCategories",
                                                as: "item",
                                                cond: { $eq: ["$$item._id", "$$cat"] }
                                            }
                                        }
                                    },
                                    in: {
                                        $cond: {
                                            if: { $gt: [{ $size: "$$match" }, 0] },
                                            then: { category: "$$cat", count: { $arrayElemAt: ["$$match.count", 0] } },
                                            else: { category: "$$cat", count: 0 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { $unwind: "$data" },
            { $replaceRoot: { newRoot: "$data" } }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category Wise Customers Count"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const categoryWiseCustomers = async (req, res) => {
    try {
        const { user } = req.headers;

        const { error, value } = getCategoryWiseCustomersSchema.validate(req.query);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let { startDate, endDate, companyFilter, typeFilter = "all", customerTypeFilter, customerFilter, companyId } = value;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED, customerId: { $ne: null } };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);
        if (customerFilter) criteria.customerId = new mongoose.Types.ObjectId(customerFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const pipeline: any[] = [
            { $match: criteria },
            {
                $group: {
                    _id: "$customerId",
                    totalPurchaseValue: { $sum: "$totalAmount" },
                    noOfBill: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "contacts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: {
                        $cond: {
                            if: { $or: [{ $ifNull: ["$customer.firstName", false] }, { $ifNull: ["$customer.lastName", false] }] },
                            then: { $trim: { input: { $concat: [{ $ifNull: ["$customer.firstName", ""] }, " ", { $ifNull: ["$customer.lastName", ""] }] } } },
                            else: "$customer.companyName"
                        }
                    },
                    totalPurchaseValue: 1,
                    noOfBill: 1,
                    contactNo: "$customer.phoneNo.phoneNo",
                    customerType: "$customer.customerType",
                    category: {
                        $switch: {
                            branches: [
                                { case: { $gte: ["$noOfBill", CUSTOMER_THRESHOLDS.VIP] }, then: CUSTOMER_CATEGORY_ENUM.VIP },
                                { case: { $gte: ["$noOfBill", CUSTOMER_THRESHOLDS.REGULAR] }, then: CUSTOMER_CATEGORY_ENUM.REGULAR },
                                { case: { $gte: ["$noOfBill", CUSTOMER_THRESHOLDS.RISK] }, then: CUSTOMER_CATEGORY_ENUM.RISK }
                            ],
                            default: CUSTOMER_CATEGORY_ENUM.LOST
                        }
                    }
                }
            }
        ];

        // Apply categorization filter if not "all"
        if (typeFilter && typeFilter !== "all") {
            pipeline.push({ $match: { category: typeFilter } });
        }

        // Apply customerType filter
        if (customerTypeFilter) {
            pipeline.push({ $match: { customerType: customerTypeFilter } });
        }

        const data = await PosOrderModel.aggregate(pipeline);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category Wise Customers"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const bestSellingProducts = async (req, res) => {
    try {
        const { user } = req.headers;

        let { startDate, endDate, companyFilter, companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosOrderModel.aggregate([
            { $match: criteria },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product._id",
                    productName: { $first: { $ifNull: ["$product.name", "Uncategorized"] } },
                    uniqueOrders: { $addToSet: "$_id" },
                    totalSalesQty: { $sum: "$items.qty" },
                    totalSalesValue: { $sum: "$items.netAmount" },
                    totalCostValue: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$items.unitCost", 0] }] } }
                }
            },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    noOfBills: { $size: "$uniqueOrders" },
                    totalSalesQty: 1,
                    totalSalesValue: 1,
                    totalProfit: { $subtract: ["$totalSalesValue", "$totalCostValue"] }
                }
            },
            {
                $setWindowFields: {
                    output: {
                        grandTotalSales: {
                            $sum: "$totalSalesValue",
                            window: { documents: ["unbounded", "unbounded"] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    noOfBills: 1,
                    totalSalesQty: 1,
                    totalSalesValue: 1,
                    totalProfit: 1,
                    salesPercentage: {
                        $cond: {
                            if: { $eq: ["$grandTotalSales", 0] },
                            then: 0,
                            else: { $round: [{ $multiply: [{ $divide: ["$totalSalesValue", "$grandTotalSales"] }, 100] }, 2] }
                        }
                    }
                }
            },
            { $sort: { totalSalesQty: -1 } }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Best Selling Products"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const leastSellingProducts = async (req, res) => {
    try {
        const { user } = req.headers;

        let { startDate, endDate, companyFilter, companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosOrderModel.aggregate([
            { $match: criteria },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product._id",
                    productName: { $first: { $ifNull: ["$product.name", "Uncategorized"] } },
                    uniqueOrders: { $addToSet: "$_id" },
                    totalSalesQty: { $sum: "$items.qty" },
                    totalSalesValue: { $sum: "$items.netAmount" },
                    totalCostValue: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$items.unitCost", 0] }] } }
                }
            },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    noOfBills: { $size: "$uniqueOrders" },
                    totalSalesQty: 1,
                    totalSalesValue: 1,
                    totalProfit: { $subtract: ["$totalSalesValue", "$totalCostValue"] }
                }
            },
            {
                $setWindowFields: {
                    output: {
                        grandTotalSales: {
                            $sum: "$totalSalesValue",
                            window: { documents: ["unbounded", "unbounded"] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    noOfBills: 1,
                    totalSalesQty: 1,
                    totalSalesValue: 1,
                    totalProfit: 1,
                    salesPercentage: {
                        $cond: {
                            if: { $eq: ["$grandTotalSales", 0] },
                            then: 0,
                            else: { $round: [{ $multiply: [{ $divide: ["$totalSalesValue", "$grandTotalSales"] }, 100] }, 2] }
                        }
                    }
                }
            },
            { $sort: { totalSalesQty: 1 } }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Least Selling Products"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const topExpenses = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId, limit = 10 } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, voucherType: POS_VOUCHER_TYPE.EXPENSE };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosPaymentModel.aggregate([
            { $match: criteria },
            {
                $lookup: {
                    from: "accounts",
                    localField: "accountId",
                    foreignField: "_id",
                    as: "account"
                }
            },
            { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$accountId",
                    accountName: { $first: { $ifNull: ["$account.name", "Uncategorized Expense"] } },
                    totalAmount: { $sum: "$amount" },
                    expenseCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 1,
                    accountName: 1,
                    totalAmount: 1,
                    expenseCount: 1
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: Number(limit) }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Top Expenses"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const topCoupons = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId, limit = 10 } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        // We only care about completed orders that actually used a coupon
        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED, couponId: { $ne: null } };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosOrderModel.aggregate([
            { $match: criteria },
            {
                $lookup: {
                    from: "coupons",
                    localField: "couponId",
                    foreignField: "_id",
                    as: "coupon"
                }
            },
            { $unwind: { path: "$coupon", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$couponId",
                    name: { $first: { $ifNull: ["$coupon.name", "Unknown Coupon"] } },
                    totalDiscountGiven: { $sum: "$couponDiscount" },
                    usageCount: { $sum: 1 },
                    uniqueCustomers: { $addToSet: "$customerId" }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    totalDiscountGiven: 1,
                    usageCount: 1,
                    uniqueCustomersCount: { $size: "$uniqueCustomers" }
                }
            },
            { $sort: { usageCount: -1, totalDiscountGiven: -1 } },
            { $limit: Number(limit) }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Top Coupons"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const receivable = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, dueAmount: { $gt: 0 } };
        const invoiceCriteria: any = { isDeleted: false, balanceAmount: { $gt: 0 } };

        if (companyId) {
            const companyObjId = new mongoose.Types.ObjectId(companyId as string);
            criteria.companyId = companyObjId;
            invoiceCriteria.companyId = companyObjId;
        }
        if (companyFilter) {
            const companyFilterObjId = new mongoose.Types.ObjectId(companyFilter as string);
            criteria.companyId = companyFilterObjId;
            invoiceCriteria.companyId = companyFilterObjId;
        }

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");
        applyDateFilter(invoiceCriteria, startDate as string, endDate as string, "date");

        // Run aggregations in parallel to fetch arrays
        const [
            posOrders, invoiceData
        ] = await Promise.all([
            PosOrderModel.aggregate([
                { $match: criteria },
                {
                    $lookup: {
                        from: "contacts",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customer"
                    }
                },
                { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        customerName: { $concat: [{ $ifNull: ["$customer.firstName", "Walk-In"] }, " ", { $ifNull: ["$customer.lastName", ""] }] },
                        invoiceNo: "$orderNo",
                        pendingAmount: "$dueAmount",
                        date: "$createdAt",
                        type: "POS Order"
                    }
                }
            ]),
            InvoiceModel.aggregate([
                { $match: invoiceCriteria },
                {
                    $lookup: {
                        from: "contacts",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customer"
                    }
                },
                { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        customerName: { $concat: [{ $ifNull: ["$customer.firstName", "Walk-In"] }, " ", { $ifNull: ["$customer.lastName", ""] }] },
                        invoiceNo: "$documentNo",
                        pendingAmount: "$balanceAmount",
                        date: "$date",
                        type: "Invoice"
                    }
                }
            ])
        ]);

        const combined = [...posOrders, ...invoiceData];
        // Sort by date descending (latest first)
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const data = combined;

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Receivable Data"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const payable = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const supplierCriteria: any = { isDeleted: false, balanceAmount: { $gt: 0 } };

        if (companyId) {
            supplierCriteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        }
        if (companyFilter) {
            supplierCriteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);
        }

        applyDateFilter(supplierCriteria, startDate as string, endDate as string, "supplierBillDate");

        const data = await supplierBillModel.aggregate([
            { $match: supplierCriteria },
            {
                $lookup: {
                    from: "contacts",
                    localField: "supplierId",
                    foreignField: "_id",
                    as: "supplier"
                }
            },
            { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    supplierName: { $concat: [{ $ifNull: ["$supplier.firstName", "Unknown Supplier"] }, " ", { $ifNull: ["$supplier.lastName", ""] }] },
                    billNo: "$supplierBillNo",
                    pendingAmount: "$balanceAmount",
                    date: "$supplierBillDate"
                }
            },
            { $sort: { date: -1 } }
        ]);

        const result = data;

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Payable Data"), result, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const salesAndPurchaseGraph = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false };
        const statusCriteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED };

        if (companyId) {
            const companyObjId = new mongoose.Types.ObjectId(companyId as string);
            criteria.companyId = companyObjId;
            statusCriteria.companyId = companyObjId;
        }
        if (companyFilter) {
            const companyFilterObjId = new mongoose.Types.ObjectId(companyFilter as string);
            criteria.companyId = companyFilterObjId;
            statusCriteria.companyId = companyFilterObjId;
        }

        const dateFields = {
            posOrder: "createdAt",
            invoice: "date",
            returnPosOrder: "createdAt",
            salesCreditNote: "date",
            supplierBill: "supplierBillDate",
            debitNote: "date",
        };

        const posCriteria = { ...statusCriteria }; applyDateFilter(posCriteria, startDate as string, endDate as string, dateFields.posOrder);
        const invCriteria = { ...criteria }; applyDateFilter(invCriteria, startDate as string, endDate as string, dateFields.invoice);
        const rPosCriteria = { ...criteria, type: RETURN_POS_ORDER_TYPE.SALES_RETURN }; applyDateFilter(rPosCriteria, startDate as string, endDate as string, dateFields.returnPosOrder);
        const scnCriteria = { ...criteria }; applyDateFilter(scnCriteria, startDate as string, endDate as string, dateFields.salesCreditNote);
        const sbCriteria = { ...criteria }; applyDateFilter(sbCriteria, startDate as string, endDate as string, dateFields.supplierBill);
        const dnCriteria = { ...criteria }; applyDateFilter(dnCriteria, startDate as string, endDate as string, dateFields.debitNote);

        const groupByDateStr = (dateField) => ({
            $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` }
        });

        const [
            posSales, invSales,
            posReturns, scnReturns,
            supPurchases,
            dnReturns
        ] = await Promise.all([
            // 1. Sales
            PosOrderModel.aggregate([
                { $match: posCriteria },
                { $group: { _id: groupByDateStr(dateFields.posOrder), total: { $sum: "$totalAmount" } } }
            ]),
            InvoiceModel.aggregate([
                { $match: invCriteria },
                { $group: { _id: groupByDateStr(dateFields.invoice), total: { $sum: "$netAmount" } } }
            ]),
            // 2. Sales Returns
            returnPosOrderModel.aggregate([
                { $match: rPosCriteria },
                { $group: { _id: groupByDateStr(dateFields.returnPosOrder), total: { $sum: "$total" } } }
            ]),
            salesCreditNoteModel.aggregate([
                { $match: scnCriteria },
                { $group: { _id: groupByDateStr(dateFields.salesCreditNote), total: { $sum: "$netAmount" } } }
            ]),
            // 3. Purchases & Purchase Returns (from Supplier Bill)
            supplierBillModel.aggregate([
                { $match: sbCriteria },
                {
                    $group: {
                        _id: groupByDateStr(dateFields.supplierBill),
                        totalPurchase: { $sum: "$summary.netAmount" },
                        totalPurchaseReturn: { $sum: "$returnProductDetails.summary.netAmount" }
                    }
                }
            ]),
            // 4. Additional Purchase Returns (from Debit Note)
            debitNoteModel.aggregate([
                { $match: dnCriteria },
                { $group: { _id: groupByDateStr(dateFields.debitNote), total: { $sum: "$amount" } } }
            ])
        ]);

        const mergedData: Record<string, { sales: number, salesReturn: number, purchase: number, purchaseReturn: number }> = {};

        const addValue = (date: string, type: 'sales' | 'salesReturn' | 'purchase' | 'purchaseReturn', value: number) => {
            if (!date) return;
            if (!mergedData[date]) {
                mergedData[date] = { sales: 0, salesReturn: 0, purchase: 0, purchaseReturn: 0 };
            }
            mergedData[date][type] += (value || 0);
        };

        posSales.forEach(item => addValue(item._id, 'sales', item.total));
        invSales.forEach(item => addValue(item._id, 'sales', item.total));

        posReturns.forEach(item => addValue(item._id, 'salesReturn', item.total));
        scnReturns.forEach(item => addValue(item._id, 'salesReturn', item.total));

        supPurchases.forEach(item => {
            addValue(item._id, 'purchase', item.totalPurchase);
            addValue(item._id, 'purchaseReturn', item.totalPurchaseReturn);
        });

        dnReturns.forEach(item => addValue(item._id, 'purchaseReturn', item.total));

        // Fill in missing dates
        const getDatesInRange = (startDate: Date, endDate: Date) => {
            const date = new Date(startDate.getTime());
            const dates: string[] = [];
            while (date <= endDate) {
                dates.push(date.toISOString().split('T')[0]);
                date.setDate(date.getDate() + 1);
            }
            return dates;
        };

        let start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
        let end = endDate ? new Date(endDate as string) : new Date();

        // Reset time part for accurate daily iteration
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const allDates = getDatesInRange(start, end);

        allDates.forEach(date => {
            if (!mergedData[date]) {
                mergedData[date] = { sales: 0, salesReturn: 0, purchase: 0, purchaseReturn: 0 };
            }
        });

        const graphData = Object.keys(mergedData).map(date => ({
            date,
            ...mergedData[date]
        }));

        // Sort chronologically
        graphData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales and Purchase Graph"), graphData, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const transactionGraph = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        let { startDate, endDate, companyFilter, companyId, typeFilter } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        let start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
        let end = endDate ? new Date(endDate as string) : new Date();

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        criteria.createdAt = { $gte: start, $lte: end };

        let posVoucherTypes: string[] = [POS_VOUCHER_TYPE.SALES];
        let voucherTypes: string[] = [VOUCHAR_TYPE.RECEIPT];

        if (typeFilter && typeFilter.toLowerCase() === "purchase") {
            posVoucherTypes = [POS_VOUCHER_TYPE.PURCHASE, POS_VOUCHER_TYPE.EXPENSE];
            voucherTypes = [VOUCHAR_TYPE.PAYMENT, VOUCHAR_TYPE.EXPENSE];
        }

        const posCriteria = { ...criteria, voucherType: { $in: posVoucherTypes } };

        let vCriteria: any = { isDeleted: false, type: { $in: voucherTypes } };
        if (companyId) vCriteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) vCriteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);
        vCriteria.date = { $gte: start, $lte: end };

        const groupByDateStr = (dateField) => ({
            $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` }
        });

        const [posPayments, vouchers] = await Promise.all([
            PosPaymentModel.aggregate([
                { $match: posCriteria },
                {
                    $group: {
                        _id: { date: groupByDateStr("createdAt"), method: "$paymentMode" },
                        total: { $sum: "$amount" }
                    }
                }
            ]),
            voucherModel.aggregate([
                { $match: vCriteria },
                {
                    $lookup: {
                        from: "accounts",
                        localField: "bankAccountId",
                        foreignField: "_id",
                        as: "account"
                    }
                },
                { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            date: groupByDateStr("date"),
                            method: {
                                $cond: {
                                    if: { $eq: ["$account.type", ACCOUNT_TYPE.CASH] },
                                    then: PAYMENT_MODE.CASH,
                                    else: {
                                        $cond: {
                                            if: { $eq: ["$account.type", ACCOUNT_TYPE.BANK] },
                                            then: PAYMENT_MODE.BANK,
                                            else: "other"
                                        }
                                    }
                                }
                            }
                        },
                        total: { $sum: "$amount" }
                    }
                }
            ])
        ]);

        const mergedData: Record<string, any> = {};

        const getDatesInRange = (startDate: Date, endDate: Date) => {
            const date = new Date(startDate.getTime());
            const dates: string[] = [];
            while (date <= endDate) {
                dates.push(date.toISOString().split('T')[0]);
                date.setDate(date.getDate() + 1);
            }
            return dates;
        };

        const allDates = getDatesInRange(start, end);

        // Pre-fill empty dates
        allDates.forEach(date => {
            mergedData[date] = {
                cash: 0, bank: 0, upi: 0, card: 0, cheque: 0,
                other: 0
            };
        });

        const addValue = (date: string, method: string, value: number) => {
            if (!date || !method) return;
            const m = method.toLowerCase();

            if (!mergedData[date]) {
                mergedData[date] = {
                    cash: 0, bank: 0, upi: 0, card: 0, cheque: 0,
                    other: 0
                };
            }

            if (mergedData[date][m] !== undefined) {
                mergedData[date][m] += (value || 0);
            } else {
                mergedData[date]["other"] += (value || 0);
            }
        };

        posPayments.forEach(item => addValue(item._id.date, item._id.method, item.total));
        vouchers.forEach(item => addValue(item._id.date, item._id.method, item.total));

        const graphData = Object.keys(mergedData).map(date => ({
            date,
            ...mergedData[date]
        }));

        graphData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Transaction Graph"), graphData, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const getCategorySeles = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;

        let { startDate, endDate, companyFilter, companyId } = req.query;

        if (!companyId && user?.companyId?._id) {
            companyId = user.companyId._id;
        }

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED };

        if (companyId) criteria.companyId = new mongoose.Types.ObjectId(companyId as string);
        if (companyFilter) criteria.companyId = new mongoose.Types.ObjectId(companyFilter as string);

        applyDateFilter(criteria, startDate as string, endDate as string, "createdAt");

        const data = await PosOrderModel.aggregate([
            { $match: criteria },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.categoryId",
                    uniqueOrders: { $addToSet: "$_id" },
                    totalSalesQty: { $sum: "$items.qty" },
                    totalSalesValue: { $sum: "$items.netAmount" },
                    totalCostValue: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$items.unitCost", 0] }] } }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    categoryName: { $ifNull: ["$category.name", "Uncategorized"] },
                    noOfBills: { $size: "$uniqueOrders" },
                    totalSalesQty: 1,
                    totalSalesValue: 1,
                    totalProfit: { $subtract: ["$totalSalesValue", "$totalCostValue"] }
                }
            },
            {
                $setWindowFields: {
                    output: {
                        grandTotalSales: {
                            $sum: "$totalSalesValue",
                            window: { documents: ["unbounded", "unbounded"] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    categoryName: 1,
                    noOfBills: 1,
                    totalSalesQty: { $round: ["$totalSalesQty", 2] },
                    totalSalesValue: { $round: ["$totalSalesValue", 2] },
                    totalProfit: { $round: ["$totalProfit", 2] },
                    salesPercentage: {
                        $cond: {
                            if: { $eq: ["$grandTotalSales", 0] },
                            then: 0,
                            else: { $round: [{ $multiply: [{ $divide: ["$totalSalesValue", "$grandTotalSales"] }, 100] }, 2] }
                        }
                    }
                }
            },
            { $sort: { totalSalesQty: -1 } }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category Sales"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};