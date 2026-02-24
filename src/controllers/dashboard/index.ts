import mongoose from "mongoose";
import { apiResponse, HTTP_STATUS, POS_ORDER_STATUS } from "../../common";
import { PosOrderModel } from "../../database";
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