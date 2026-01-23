import { HTTP_STATUS, LOGIN_SOURCES, USER_TYPES } from "../../common";
import { apiResponse, generateHash, generateToken } from "../../common/utils";
import { roleModel } from "../../database/model/role";
import { userModel } from "../../database/model/user";
import { checkIdExist, createOne, getFirstMatch, reqInfo, responseMessage } from "../../helper";
import { loginSchema, registerSchema } from "../../validation/auth";
import bcryptjs from "bcryptjs";

export const register = async (req, res) => {
  reqInfo(req);

  try {
    let { error, value } = registerSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!(await checkIdExist(roleModel, value?.role, "Role", res))) return;

    const phoneNo = value?.phoneNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    let existingUser = null;

    if (orCondition.length) {
      existingUser = await getFirstMatch(userModel, { $or: orCondition, isDeleted: false }, {}, {});

      if (existingUser) {
        if (existingUser?.email === value?.email) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Email"), {}, {}));
        if (Number(existingUser?.phoneNo?.phoneNo) === Number(phoneNo)) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Phone number"), {}, {}));
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("User"), {}, {}));
      }
    }

    existingUser = await getFirstMatch(userModel, { "phoneNo.phoneNo": phoneNo, isDeleted: false }, {}, {});
    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Phone Number"), {}, {}));

    value.password = await generateHash(value.password);

    let response = await createOne(userModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    const token = await generateToken({ _id: response?._id, status: "Register", generatedOn: new Date().getTime() }, { expiresIn: "24h" });

    const { password, ...rest } = response?._doc || {};
    response = {
      ...rest,
      token,
    };

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.signupSuccess, response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const login = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let response = await getFirstMatch(
      userModel,
      { email: value?.email, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "role", select: "name" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    const comparePassword = await bcryptjs.compare(value?.password, response?.password);

    if (!comparePassword) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    // ========================  Check For Login Sources ========================
    if (value.loginSource === LOGIN_SOURCES.SUPER_ADMIN_PANEL && response.userType !== USER_TYPES.SUPER_ADMIN) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (value.loginSource === LOGIN_SOURCES.ADMIN_PANEL && response.userType !== USER_TYPES.ADMIN) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (value.loginSource === LOGIN_SOURCES.WEBSITE && response.userType !== USER_TYPES.USER) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (response.isActive === false) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    const token = await generateToken({ _id: response?._id, status: "Login", generatedOn: new Date().getTime() }, { expiresIn: "24h" });

    const { password, ...rest } = response;

    response = {
      ...rest,
      token,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.loginSuccess, response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
