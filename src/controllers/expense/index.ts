import { apiResponse, HTTP_STATUS } from "../../common";
import { ExpenseModel } from "../../database";
import { checkBranch, checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, aggregateAndPopulate } from "../../helper";
import { addExpenseSchema, deleteExpenseSchema, editExpenseSchema, getExpenseSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addExpense = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addExpenseSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
    value.isSalary = false;
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(ExpenseModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Expense"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllExpense = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, startDate, endDate, companyFilter, branchFilter, typeFilter, activeFilter, avoidSalary } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let criteria: any = { isDeleted: false };

    // company filter
    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = new ObjectId(companyFilter);
    // branch filter
    if (branchId) criteria.branchId = branchId;
    if (branchFilter) criteria.branchId = new ObjectId(branchFilter);
    // type filter
    if (typeFilter) criteria.type = typeFilter;

    // active filter
    if (activeFilter) criteria.isActive = activeFilter === "true" ? true : false;

    // avoid salary filter
    if (avoidSalary === "true" || avoidSalary === true) {
      criteria.isSalary = false;
    }

    // search
    let searchCriteria: any = {};
    if (search) {
      searchCriteria.$or = [{ description: { $regex: search, $options: "i" } }, { type: { $regex: search, $options: "i" } }, { "partyId.fullName": { $regex: search, $options: "i" } }];
    }

    // date filter
    applyDateFilter(criteria, startDate as string, endDate as string);

    // aggregation pipeline
    let pipeline: any = [
      { $match: criteria },
      {
        $lookup: {
          from: "users",
          localField: "partyId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: "contacts",
          localField: "partyId",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      {
        $addFields: {
          partyId: {
            $let: {
              vars: {
                party: {
                  $cond: {
                    if: "$isSalary",
                    then: { $arrayElemAt: ["$userInfo", 0] },
                    else: { $arrayElemAt: ["$contactInfo", 0] },
                  },
                },
              },
              in: {
                _id: "$$party._id",
                fullName: {
                  $cond: {
                    if: "$isSalary",
                    then: "$$party.fullName",
                    else: {
                      $trim: {
                        input: {
                          // remove extra space between first name and last name
                          $concat: [{ $ifNull: ["$$party.firstName", ""] }, "", { $ifNull: ["$$party.lastName", ""] }],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ...(search ? [{ $match: searchCriteria }] : []),
      { $sort: { createdAt: -1 } },
      ...(page && limit ? [{ $skip: (page - 1) * limit }, { $limit: limit }] : []),
      {
        $project: {
          userInfo: 0,
          contactInfo: 0,
        },
      },
    ];

    // fetch data with aggregate and populate
    const response = await aggregateAndPopulate(ExpenseModel, pipeline, [
      { path: "companyId", select: "name" },
      { path: "branchId", select: "name" },
      { path: "createdBy", select: "fullName userType" },
    ]);

    // total count with aggregation to support search in populated fields
    let totalCountResult = await ExpenseModel.aggregate([
      { $match: criteria },
      {
        $lookup: {
          from: "users",
          localField: "partyId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: "contacts",
          localField: "partyId",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      {
        $addFields: {
          partyId: {
            $let: {
              vars: {
                party: {
                  $cond: {
                    if: "$isSalary",
                    then: { $arrayElemAt: ["$userInfo", 0] },
                    else: { $arrayElemAt: ["$contactInfo", 0] },
                  },
                },
              },
              in: {
                fullName: {
                  $cond: {
                    if: "$isSalary",
                    then: "$$party.fullName",
                    else: {
                      $trim: {
                        input: {
                          $concat: [{ $ifNull: ["$$party.firstName", ""] }, " ", { $ifNull: ["$$party.lastName", ""] }],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ...(search ? [{ $match: searchCriteria }] : []),
      { $count: "total" },
    ]);

    const totalData = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Expense"),
        {
          expense_data: response,
          totalData,
          state,
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getExpenseById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getExpenseSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      ExpenseModel,
      { _id: value.id, isDeleted: false, isSalary: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Expense"), {}, {}));
    }

    await ExpenseModel.populate(response, {
      path: "partyId",
      model: response.isSalary ? "user" : "contact",
      select: response.isSalary ? "fullName" : "firstName lastName companyName",
    });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Expense"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editExpenseById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = editExpenseSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    await checkCompany(user, value);
    await checkBranch(user, value);

    value.updatedBy = user?._id || null;

    const response = await updateData(ExpenseModel, { _id: new ObjectId(value.expenseId), isDeleted: false, isSalary: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Expense"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Expense"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteExpenseById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteExpenseSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const expense = await getFirstMatch(ExpenseModel, { _id: value.id, isDeleted: false, isSalary: false }, {}, {});

    if (!expense) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Expense"), {}, {}));
    }

    const response = await updateData(ExpenseModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Expense"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
