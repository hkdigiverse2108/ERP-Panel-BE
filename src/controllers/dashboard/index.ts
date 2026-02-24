import mongoose from "mongoose";
import { apiResponse, HTTP_STATUS, POS_ORDER_STATUS, POS_VOUCHER_TYPE, RETURN_POS_ORDER_TYPE } from "../../common";
import {
    PosOrderModel, PosPaymentModel, InvoiceModel, supplierBillModel,
    returnPosOrderModel, salesCreditNoteModel, debitNoteModel
} from "../../database";
import { applyDateFilter, responseMessage } from "../../helper";

export const transactionDetails = async (req, res) => {
    try {

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Dashboard Transaction Details"), {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const topCustomers = async (req, res) => {
    try {
        const { user } = req.headers;
        const companyId = user?.companyId?._id;
        const { limit = 20, startDate, endDate, companyFilter } = req.query;

        const criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.COMPLETED, customerId: { $ne: null } };

        if (companyId) criteria.companyId = companyId;
        if (companyFilter) criteria.companyId = companyFilter;

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

export const categoryWiseCustomers = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId } = req.query;

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
                $lookup: {
                    from: "categories",
                    localField: "product.categoryId",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$category._id",
                    categoryName: { $first: { $ifNull: ["$category.name", "Uncategorized"] } },
                    customers: { $addToSet: "$customerId" }
                }
            },
            {
                $project: {
                    _id: 1,
                    categoryName: 1,
                    noOfCustomers: { $size: "$customers" }
                }
            },
            { $sort: { noOfCustomers: -1 } }
        ]);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category Wise Customers"), data, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const bestSellingProducts = async (req, res) => {
    try {
        const { user } = req.headers;
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId } = req.query;

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
        const { startDate, endDate, companyFilter } = req.query;
        let { companyId } = req.query;

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
        let { companyId, limit = 10, page = 1 } = req.query;

        page = Number(page);
        limit = Number(limit);

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

        let combined = [...posOrders, ...invoiceData];
        // Sort by date descending (latest first)
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalData = combined.length;
        combined = combined.slice((page - 1) * limit, page * limit);

        const data = {
            receivableList: combined,
            totalData,
            state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 }
        };

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
        let { companyId, limit = 10, page = 1 } = req.query;

        page = Number(page);
        limit = Number(limit);

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
            { $sort: { date: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);

        const totalDataResult = await supplierBillModel.aggregate([
            { $match: supplierCriteria },
            { $count: "count" }
        ]);
        const totalData = totalDataResult.length > 0 ? totalDataResult[0].count : 0;

        const result = {
            payableList: data,
            totalData,
            state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 }
        };

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
