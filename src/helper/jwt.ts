import jwt from "jsonwebtoken";
import { findOneAndPopulate, getFirstMatch } from "./databaseServices";
import { userModel } from "../database/model";
import { apiResponse, HTTP_STATUS } from "../common";
import { responseMessage } from "./responseMessage";

const ObjectId = require("mongoose").Types.ObjectId;
const jwtSecretKey = process.env.JWT_TOKEN_SECRET;

export const adminJwt = async (req, res, next) => {
  let { authorization } = req.headers;
  try {
    if (!authorization) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage.tokenNotFound, {}, {}));

    const token = authorization.split(" ")[1];

    if (!token) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage.invalidToken, {}, {}));

    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecretKey);
    } catch (error) {
      if (error?.name == "TokenExpiredError") return res.status(HTTP_STATUS.TOKEN_EXPIRED).json(new apiResponse(HTTP_STATUS.TOKEN_EXPIRED, responseMessage?.tokenExpire, {}, {}));
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));
    }

    const user = await getFirstMatch(userModel, { _id: new ObjectId(decoded?._id), isDeleted: false }, {}, {});

    if (!user) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage.invalidToken, {}, {}));

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
      if (error?.name == "TokenExpiredError") return res.status(HTTP_STATUS.TOKEN_EXPIRED).json(new apiResponse(HTTP_STATUS.TOKEN_EXPIRED, responseMessage?.tokenExpire, {}, {}));
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.invalidToken, {}, {}));
    }

    let user = await getFirstMatch(userModel, { _id: new ObjectId(decoded?._id), isDeleted: false }, {}, {});

    if (user?.companyId) {
      const populateModel = [{ path: "companyId", select: "name" }];
      user = await findOneAndPopulate(userModel, { _id: new ObjectId(user?._id), isDeleted: false }, {}, {}, populateModel);
    }

    if (user?.role) {
      const populateModel = [{ path: "role", select: "name" }];
      user = await findOneAndPopulate(userModel, { _id: new ObjectId(user?._id), isDeleted: false }, {}, {}, populateModel);
    }

    if (!user) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage.invalidToken, {}, {}));

    if (user?.isActive === false) return res.status(HTTP_STATUS.UNAUTHORIZED).json(new apiResponse(HTTP_STATUS.UNAUTHORIZED, responseMessage?.accountBlock, {}, {}));

    req.headers.user = user;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
