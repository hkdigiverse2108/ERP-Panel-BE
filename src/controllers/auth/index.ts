import { apiResponse, generateHash, generateToken, getOtpExpireTime, getUniqueOtp, HTTP_STATUS, LOGIN_SOURCES, USER_TYPES } from "../../common";
import { companyModel, roleModel, userModel } from "../../database";
import { checkIdExist, createOne, emailVerificationMail, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { forgotPasswordSchema, loginSchema, registerSchema, resendOtpSchema, resetPasswordSchema, updatePasswordSchema, verifyOtpSchema } from "../../validation";

import bcryptjs from "bcryptjs";
import { createLoginLogEntry } from "../loginLog";

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

    value.password = await generateHash(value.password);

    let response = await createOne(userModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    const token = await generateToken(
      {
        _id: response?._id,
        status: "Register",
        generatedOn: new Date().getTime(),
      },
      { expiresIn: "24h" },
    );

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

    const isSourceSuperAdminPanel = value?.loginSource === LOGIN_SOURCES.SUPER_ADMIN_PANEL;
    const isSourceAdminPanel = value?.loginSource === LOGIN_SOURCES.ADMIN_PANEL;
    const isSourceWebsite = value?.loginSource === LOGIN_SOURCES.WEBSITE;

    const isTypeSuperAdmin = response?.userType === USER_TYPES.SUPER_ADMIN;
    const isTypeAdmin = response?.userType === USER_TYPES.ADMIN;
    const isTypeEmployee = response.userType === USER_TYPES.EMPLOYEE;
    const isTypeUser = response.userType === USER_TYPES.USER;

    if (isSourceSuperAdminPanel && !isTypeSuperAdmin) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (isSourceAdminPanel && !isTypeAdmin && !isTypeEmployee) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (isSourceWebsite && !isTypeUser) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (response.isActive === false) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    // OTP Generation For Super Admin
    if (isSourceSuperAdminPanel && isTypeSuperAdmin) {
      const otp = await getUniqueOtp();

      if (response?.email) {
        emailVerificationMail(response, otp);
      }

      const otpExpireTime = getOtpExpireTime();

      await userModel.findOneAndUpdate({ _id: response?._id }, { otp, otpExpireTime }, { new: true });
    }

    if (isSourceAdminPanel && (isTypeAdmin || isTypeEmployee)) {
      const company = await getFirstMatch(companyModel, { _id: response?.companyId }, {}, {});
      if (!company) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));
      }

      if (company?.isActive === false) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.companyPlanExpired, {}, {}));
      }
    }
    const token = await generateToken(
      {
        _id: response?._id,
        status: "Login",
        generatedOn: new Date().getTime(),
      },
      { expiresIn: "24h" },
    );

    const { password, otp, ...rest } = response;

    response = {
      ...rest,
      token,
    };

    if (!isTypeSuperAdmin) {
      createLoginLogEntry(req, response, "LOGIN", `${response?.companyId?.name || "Company"} Logged In`);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, isSourceSuperAdminPanel && isTypeSuperAdmin ? responseMessage?.otpSendSuccess : responseMessage?.loginSuccess, response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const forgotPassword = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let response = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("User"), {}, {}));

    if (response?.isActive === false) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    const otp = await getUniqueOtp();
    const otpExpireTime = getOtpExpireTime();

    if (response?.email) {
      emailVerificationMail(response, otp);
    }

    await updateData(userModel, { _id: response?._id }, { otp, otpExpireTime }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.otpSendSuccess, {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const updatePassword = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = updatePasswordSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (value.newPassword !== value.confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Password do not match."), {}, {}));
    }

    let response = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("User"), {}, {}));

    if (response?.isActive === false) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    const hashPassword = await generateHash(value?.newPassword);

    await updateData(userModel, { _id: response?._id }, { password: hashPassword, otp: null, otpExpireTime: null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.resetPasswordSuccess, {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const resetPassword = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (value.newPassword !== value.confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Password do not match."), {}, {}));
    }

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

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("User"), {}, {}));

    if (response.isActive === false) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    if (value?.oldPassword === value?.newPassword) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.passwordSameError, {}, {}));

    const comparePassword = await bcryptjs.compare(value?.oldPassword, response?.password);
    if (!comparePassword) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.oldPasswordError, {}, {}));

    // ========================  Check For Login Sources ========================
    if (value.loginSource === LOGIN_SOURCES.SUPER_ADMIN_PANEL && response.userType !== USER_TYPES.SUPER_ADMIN) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (value.loginSource === LOGIN_SOURCES.ADMIN_PANEL && response.userType !== USER_TYPES.ADMIN) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    if (value.loginSource === LOGIN_SOURCES.WEBSITE && response.userType !== USER_TYPES.USER) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidUserPasswordEmail, {}, {}));

    const hashedPassword = await generateHash(value?.newPassword);

    response = await updateData(userModel, { _id: response?._id }, { password: hashedPassword }, {});
    const { password, ...rest } = response;

    response = {
      ...rest,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.resetPasswordSuccess, response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const verifyOtp = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let response = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("User"), {}, {}));

    if (Number(response?.otp) !== Number(value?.otp)) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidOTP, {}, {}));

    if (response?.otpExpireTime < new Date()) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.expireOTP, {}, {}));

    response = await updateData(userModel, { _id: response?._id }, { otp: null, otpExpireTime: null }, {});
    const { password, otp, otpExpireTime, ...rest } = response;

    response = rest;

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.OTPVerified, {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const resendOtp = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = resendOtpSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let response = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("User"), {}, {}));

    if (response?.isActive === false) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accountBlock, {}, {}));

    const otp = await getUniqueOtp();
    const otpExpireTime = getOtpExpireTime();

    if (response?.email) {
      emailVerificationMail(response, otp);
    }

    response = await updateData(userModel, { _id: response?._id }, { otp, otpExpireTime }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.resendOtpSuccess, {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
