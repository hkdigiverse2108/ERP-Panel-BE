import mongoose from "mongoose";
import { apiResponse, CUSTOMER_CATEGORY_ENUM, HTTP_STATUS, POS_ORDER_STATUS, VOUCHAR_TYPE, ACCOUNT_TYPE } from "../../common";
import { accountModel, PosOrderModel, productModel, returnPosOrderModel, stockModel, supplierBillModel, voucherModel } from "../../database";
import { applyDateFilter, responseMessage } from "../../helper";
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

