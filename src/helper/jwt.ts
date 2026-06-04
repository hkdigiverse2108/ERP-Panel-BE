import jwt from "jsonwebtoken";
import { findOneAndPopulate, updateData, redisGet, redisSet } from "./databaseServices";
import { companyModel, userModel } from "../database";
import { apiResponse, HTTP_STATUS, USER_TYPES } from "../common";
import { responseMessage } from "./responseMessage";

const ObjectId = require("mongoose").Types.ObjectId;
const jwtSecretKey = process.env.JWT_TOKEN_SECRET;

const commonPopulate = [
  { path: "companyId", select: "name isActive planEndDate" },
  { path: "role", select: "name" },
  { path: "branchId", select: "name isHeadBranch" }
];

export const superAdminJwt = async (req, res, next) => {
  let { authorization } = req.headers;
  try {
    if (!authorization) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.tokenNotFound, {}, {}));

    const token = authorization.split(" ")[1];
    if (!token) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));

    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecretKey);
    } catch (error) {
      if (error?.name == "TokenExpiredError") return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.tokenExpire, {}, {}));
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));
    }

    const cacheKey = `user:auth:${decoded?._id}`;
    let user: any = await redisGet(cacheKey);
    
    if (!user) {
      user = await findOneAndPopulate(userModel, { _id: new ObjectId(decoded?._id), isDeleted: false }, {}, {}, commonPopulate);
      if (user) {
        await redisSet(cacheKey, user, 3600);
      }
    }

    if (!user) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));

    if (user?.isActive === false) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.accountBlock, {}, {}));

    if (user.userType !== USER_TYPES.SUPER_ADMIN) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.accessDenied, {}, {}));

    req.headers.user = user;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const adminJwt = async (req, res, next) => {
  let { authorization } = req.headers;
  try {
    if (!authorization) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.tokenNotFound, {}, {}));

    const token = authorization.split(" ")[1];
    if (!token) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));

    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecretKey);
    } catch (error) {
      if (error?.name == "TokenExpiredError") return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.tokenExpire, {}, {}));
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));
    }

    const cacheKey = `user:auth:${decoded?._id}`;
    let user: any = await redisGet(cacheKey);

    if (!user) {
      user = await findOneAndPopulate(userModel, { _id: new ObjectId(decoded?._id), isDeleted: false }, {}, {}, commonPopulate);
      if (user) {
        await redisSet(cacheKey, user, 3600);
      }
    }

    if (!user) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));

    if (user?.userType !== USER_TYPES.SUPER_ADMIN && user?.companyId) {
      const company = user.companyId;

      if (company?.isActive !== false && company?.planEndDate < new Date()) {
        await updateData(companyModel, { _id: new ObjectId(company?._id) }, { isActive: false }, {});
        company.isActive = false;
      }
      if (company?.isActive === false) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.companyPlanExpired, {}, {}));
    }

    if (user?.isActive === false) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.accountBlock, {}, {}));

    req.headers.user = user;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const userJwt = async (req, res, next) => {
  let { authorization } = req.headers;
  try {
    if (!authorization) return next();

    const token = authorization?.split(" ")[1];

    if (!token) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.tokenNotFound, {}, {}));

    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecretKey);
    } catch (error) {
      if (error?.name == "TokenExpiredError") return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.tokenExpire, {}, {}));
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));
    }

    const cacheKey = `user:auth:${decoded?._id}`;
    let user: any = await redisGet(cacheKey);

    if (!user) {
      user = await findOneAndPopulate(userModel, { _id: new ObjectId(decoded?._id), isDeleted: false }, {}, {}, commonPopulate);
      if (user) {
        await redisSet(cacheKey, user, 3600);
      }
    }

    if (!user) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));

    if (user?.isActive === false) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.accountBlock, {}, {}));

    req.headers.user = user;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

