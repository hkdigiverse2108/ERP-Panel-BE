import { apiResponse, generateHash, generateToken, HTTP_STATUS, LOGIN_SOURCES, USER_TYPES } from "../../common";
import { moduleModel, permissionModel, roleModel, userModel } from "../../database";
import { checkIdExist, createOne, findAllAndPopulateWithSorting, getData, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { loginSchema, registerSchema, resetPasswordSchema } from "../../validation";

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
console.log("adminJwt 223");

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

    // let criteria: any = {
    //   isActive: true,
    //   isDeleted: false,
    // };

    // let populateModel = [
    //   { path: "parentId", model: "module" }
    // ];

    // let moduleData = await findAllAndPopulateWithSorting(
    //   moduleModel,
    //   criteria,
    //   {},
    //   { sort: { number: 1 } },
    //   populateModel
    // );

    // let userPermissionData = await getData(permissionModel, { userId: response?._id }, {}, {});

    // let parentModules: any[] = [];
    // let childModulesByParent: any = {};

    // moduleData?.forEach(item => {
    //   // Check if parentId exists (either as ObjectId or populated object)
    //   if (item.parentId) {
    //     // Get parentId string - handle both populated object and ObjectId
    //     let parentIdStr = item.parentId._id ? item.parentId._id.toString() : item.parentId.toString();
    //     if (!childModulesByParent[parentIdStr]) {
    //       childModulesByParent[parentIdStr] = [];
    //     }
    //     childModulesByParent[parentIdStr].push(item);
    //   } else {
    //     parentModules.push(item);
    //   }
    // });

    // let newUserPermissionData: any = [];

    // parentModules?.forEach(item => {
    //   let newObj: any = {
    //     parentTab: {},
    //     view: false,
    //     add: false,
    //     edit: false,
    //     delete: false,
    //   };

    //   let permission = userPermissionData?.find(item2 => item2.userId && item2.userId.toString() == response?._id.toString() && item2.moduleId && item2.moduleId.toString() == item._id.toString() && item.isActive == true);
    //   if (permission) {
    //     newObj.view = permission.view || false;
    //     newObj.add = permission.add || false;
    //     newObj.edit = permission.edit || false;
    //     newObj.delete = permission.delete || false;
    //   }

    //   let moduleItem = { ...item, ...newObj };

    //   let itemIdStr = item._id.toString();
    //   if (childModulesByParent[itemIdStr] && childModulesByParent[itemIdStr].length > 0) {
    //     let children = childModulesByParent[itemIdStr].map((child: any) => {
    //       let childPermission = userPermissionData?.find(item2 => item2.userId && item2.userId.toString() == response?._id.toString() && item2.moduleId && item2.moduleId.toString() == child._id.toString() && child.isActive == true);
    //       return {
    //         ...child,
    //         parentTab: item,
    //         view: childPermission?.view || false,
    //         add: childPermission?.add || false,
    //         edit: childPermission?.edit || false,
    //         delete: childPermission?.delete || false,
    //       };
    //     });
    //     moduleItem.children = children.sort((a: any, b: any) => a.number - b.number);
    //   }

    //   newUserPermissionData.push(moduleItem);
    // });

    // newUserPermissionData.sort((a, b) => a.number - b.number);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.loginSuccess, response, {}));
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