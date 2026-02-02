import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { moduleModel, permissionModel, userModel } from "../../database";
import { getData, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { editPermissionSchema, getPermissionSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const edit_permission_by_id = async (req, res) => {
  reqInfo(req);
  try {
    let { error, value } = editPermissionSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let { modules, userId } = value;
    let updatedRoleDetails: any = [];
    for (let roleDetails of modules) {
      let updateDataObj = {
        moduleId: new ObjectId(roleDetails._id),
        add: roleDetails.add,
        edit: roleDetails.edit,
        view: roleDetails.view,
        delete: roleDetails.delete,
        isActive: roleDetails.isActive,
      };

      let updateRoleDetails = await updateData(permissionModel, { userId: new ObjectId(userId), moduleId: new ObjectId(roleDetails._id) }, updateDataObj, { upsert: true, new: true });
      updatedRoleDetails.push(updateRoleDetails);
    }
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("role details"), updatedRoleDetails, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const get_permission_by_userId = async (req, res) => {
  reqInfo(req);
  let { user } = req.headers;
  try {
    let { error, value } = getPermissionSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let { userId, search } = value,
      match: any = {};

    let userData = await getFirstMatch(userModel, { _id: new ObjectId(userId), isDeleted: false }, {}, {});
    if (!userData) return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(new apiResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, responseMessage.getDataNotFound("user"), {}, {}));

    userId = user.userType === USER_TYPES.ADMIN ? user?._id : userId;

    let userPermissionData = await getData(permissionModel, { userId: new ObjectId(userId), isDeleted: false, isActive: true }, {}, {});
    if (!userPermissionData) return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(new apiResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, responseMessage.getDataNotFound("user permissions"), {}, {}));

    if (search) {
      match.$or = [{ tabName: { $regex: search, $options: "si" } }, { displayName: { $regex: search, $options: "si" } }, { tabUrl: { $regex: search, $options: "si" } }];
    }
    if (user.userType === USER_TYPES.ADMIN) {
      let moduleIds = [];
      for (let e of userPermissionData) {
        if (e.view === true || e.add === true || e.edit === true || e.delete === true) {
          moduleIds.push(new ObjectId(e.moduleId));
        }
      }
      match._id = { $in: moduleIds };
    }

    match.isActive = true;
    match.isDeleted = false;

    let moduleData = await moduleModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "modules",
          let: { tabId: "$parentId" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$tabId"] }] } } }],
          as: "modules",
        },
      },
      {
        $unwind: { path: "$modules", preserveNullAndEmptyArrays: true },
      },
    ]);
    let newUserPermissionData = [];
    moduleData?.forEach((item) => {
      let newObj = {
        parentTab: item.modules !== null ? item.modules : {},
        view: false,
        add: false,
        edit: false,
        delete: false,
      };

      let permission = userPermissionData?.find((item2) => item2.userId.toString() == userId.toString() && item2.moduleId.toString() == item._id.toString() && item.isActive == true);
      if (permission) {
        newObj.view = permission.view;
        newObj.add = permission.add;
        newObj.edit = permission.edit;
        newObj.delete = permission.delete;
      }
      newUserPermissionData.push({ ...item, ...newObj });
    });

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("user permissions"),
        newUserPermissionData.sort((a, b) => a.number - b.number),
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const get_permission_by_userId_child = async (req, res) => {
  reqInfo(req);
  let { user } = req.headers;
  try {
    let { error, value } = getPermissionSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let { userId, search } = value,
      match: any = {};

    let userPermissionData = await getData(permissionModel, { userId: new ObjectId(userId) }, {}, {});
    if (!userPermissionData) return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(new apiResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, responseMessage.getDataNotFound("user permissions"), {}, {}));

    if (search) {
      match.$or = [{ tabName: { $regex: search, $options: "si" } }, { displayName: { $regex: search, $options: "si" } }, { tabUrl: { $regex: search, $options: "si" } }];
    }

    if (user.userType != USER_TYPES.SUPER_ADMIN) {
      let moduleIds = [];
      for (let e of userPermissionData) {
        if (e.view === true || e.add === true || e.edit === true || e.delete === true) {
          moduleIds.push(new ObjectId(e.moduleId));
        }
      }
      match._id = { $in: moduleIds };
    }

    match.isActive = true;
    match.isDeleted = false;

    let moduleData = await moduleModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "modules",
          let: { tabId: "$parentId" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$tabId"] }] } } }],
          as: "parentTab",
        },
      },
      {
        $unwind: { path: "$parentTab", preserveNullAndEmptyArrays: true },
      },
      {
        $sort: { number: 1 },
      },
    ]);

    let parentModules: any[] = [];
    let childModulesByParent: any = {};

    moduleData?.forEach((item) => {
      if (item.parentId) {
        let parentIdStr = item.parentId.toString();
        if (!childModulesByParent[parentIdStr]) {
          childModulesByParent[parentIdStr] = [];
        }
        childModulesByParent[parentIdStr].push(item);
      } else {
        parentModules.push(item);
      }
    });

    let newUserPermissionData = [];

    parentModules?.forEach((item) => {
      let newObj: any = {
        parentTab: {},
        view: false,
        add: false,
        edit: false,
        delete: false,
      };

      let permission = userPermissionData?.find((item2) => item2.userId && item2.userId.toString() == userId.toString() && item2.moduleId && item2.moduleId.toString() == item._id.toString() && item.isActive == true);
      if (permission) {
        newObj.view = permission.view || false;
        newObj.add = permission.add || false;
        newObj.edit = permission.edit || false;
        newObj.delete = permission.delete || false;
      }

      let moduleItem = { ...item, ...newObj };

      let itemIdStr = item._id.toString();
      if (childModulesByParent[itemIdStr] && childModulesByParent[itemIdStr].length > 0) {
        let children = childModulesByParent[itemIdStr].map((child: any) => {
          let childPermission = userPermissionData?.find((item2) => item2.userId && item2.userId.toString() == userId.toString() && item2.moduleId && item2.moduleId.toString() == child._id.toString() && child.isActive == true);
          return {
            ...child,
            parentTab: item,
            view: childPermission?.view || false,
            add: childPermission?.add || false,
            edit: childPermission?.edit || false,
            delete: childPermission?.delete || false,
          };
        });
        moduleItem.children = children.sort((a: any, b: any) => a.number - b.number);
      }

      newUserPermissionData.push(moduleItem);
    });

    newUserPermissionData.sort((a, b) => a.number - b.number);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("user permissions"), newUserPermissionData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
