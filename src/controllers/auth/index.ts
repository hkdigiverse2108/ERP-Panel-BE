import { HTTP_STATUS } from "../../common";
import { apiResponse, generateHash, generateToken, getUniqueOtp } from "../../common/utils";
import { userModel } from "../../database/model/user";
import { createOne, getFirstMatch, reqInfo, responseMessage } from "../../helper";
import { loginSchema, registerSchema } from "../../validation/auth";
import bcryptjs from "bcryptjs";

export const register = async (req, res) => {
  reqInfo(req);

  try {
    const { error, value } = registerSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let existingUser = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});

    if (existingUser?.isActive === true) return res.status(HTTP_STATUS.CONFLICT).json(HTTP_STATUS.CONFLICT, responseMessage.accountBlock, {}, {});

    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Email"), {}, {}));

    existingUser = await getFirstMatch(userModel, { phoneNumber: value?.phoneNumber, isDeleted: false }, {}, {});
    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Phone Number"), {}, {}));

    const payload = { ...value };

    payload.password = await generateHash(payload.password);

    let response = await createOne(userModel, payload);

    const token = await generateToken({ _id: response?._id, status: "Register", generatedOn: new Date().getTime() }, { expiresIn: "24h" });

    response = {
      ...response._doc,
      token,
    };

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage.signupSuccess, response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error);
  }
};

export const login = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let response = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));
    if (response.isActive === true) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    const comparePassword = await bcryptjs.compare(value?.password, response?.password);

    if (!comparePassword) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

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
