// import { HTTP_STATUS } from "../../common";
// import { apiResponse } from "../../common/utils";
// import { stockAdjustmentModel } from "../../database/model";
// import { countData, getDataWithSorting, reqInfo } from "../../helper";

// export const getAllStockAdjustments = async (req, res) => {
//   reqInfo(req);
//   try {
//     const { user } = req.headers;
//     let { page = 1, limit = 10, startDate, endDate } = req.query;

//     page = Number(page);
//     limit = Number(limit);

//     let criteria: any = {
//       isDeleted: false,
//       companyId: user.companyId,
//     };

//     if (startDate && endDate) {
//       criteria.createdAt = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       };
//     }

//     const options = {
//       sort: { createdAt: -1 },
//       skip: (page - 1) * limit,
//       limit,
//     };

//     const data = await getDataWithSorting(
//       stockAdjustmentModel,
//       criteria,
//       {},
//       options
//     );

//     const totalData = await countData(stockAdjustmentModel, criteria);
//     const totalPages = Math.ceil(totalData / limit) || 1;

//     return res.status(HTTP_STATUS.OK).json(
//       new apiResponse(
//         HTTP_STATUS.OK,
//         "Stock adjustment list fetched",
//         {
//           data,
//           totalData,
//           state: {
//             page,
//             limit,
//         
//       
//           },
//         },
//         {}
//       )
//     );
//   } catch (error) {
//     console.error(error);
//     return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
//       new apiResponse(
//         HTTP_STATUS.INTERNAL_SERVER_ERROR,
//         "Internal server error",
//         {},
//         error
//       )
//     );
//   }
// };


// export const getStockAdjustmentById = async (req, res) => {
//   reqInfo(req);
//   try {
//     const { error, value } = getStockAdjustmentSchema.validate(req.params);
//     if (error)
//       return res
//         .status(HTTP_STATUS.BAD_REQUEST)
//         .json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

//     const response = await getFirstMatch(
//       stockAdjustmentModel,
//       { _id: value.id, isDeleted: false },
//       {},
//       {}
//     );

//     if (!response)
//       return res
//         .status(HTTP_STATUS.NOT_FOUND)
//         .json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Stock adjustment not found", {}, {}));

//     return res
//       .status(HTTP_STATUS.OK)
//       .json(new apiResponse(HTTP_STATUS.OK, "Stock adjustment fetched", response, {}));
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
//       .json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
//   }
// };


// export const deleteStockAdjustment = async (req, res) => {
//   reqInfo(req);
//   try {
//     const { user } = req.headers;
//     const { id } = req.params;

//     const isExist = await getFirstMatch(
//       stockAdjustmentModel,
//       { _id: id, isDeleted: false },
//       {},
//       {}
//     );

//     if (!isExist)
//       return res
//         .status(HTTP_STATUS.NOT_FOUND)
//         .json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Stock adjustment not found", {}, {}));

//     const response = await updateData(
//       stockAdjustmentModel,
//       { _id: id },
//       { isDeleted: true, updatedBy: user?._id || null },
//       {}
//     );

//     return res
//       .status(HTTP_STATUS.OK)
//       .json(new apiResponse(HTTP_STATUS.OK, "Stock adjustment deleted", response, {}));
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
//       .json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
//   }
// };