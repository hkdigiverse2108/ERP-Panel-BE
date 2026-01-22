import { apiResponse, HTTP_STATUS } from "../../common";
import { moduleModel, permissionModel } from "../../database";
import { getData, reqInfo, responseMessage, updateData } from "../../helper";
import { editPermissionSchema, getPermissionSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId

export const edit_permission_by_id = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = editPermissionSchema.validate(req.body);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let { modules, roleId } = value;
        let updatedRoleDetails: any = [];
        for (let roleDetails of modules) {
            let updateDataObj = {
                moduleId: new ObjectId(roleDetails._id),
                add: roleDetails.add,
                edit: roleDetails.edit,
                view: roleDetails.view,
                delete: roleDetails.delete,
                isActive: roleDetails.isActive
            }

            let updateRoleDetails = await updateData(permissionModel, { roleId: new ObjectId(roleId), moduleId: new ObjectId(roleDetails._id) }, updateDataObj, { upsert: true, new: true });
            updatedRoleDetails.push(updateRoleDetails);
        }
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("role details"), updatedRoleDetails, {}))
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const get_permission_by_userId = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = getPermissionSchema.validate(req.query);
        console.log(error);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let { userId, search } = value, match: any = {};

        let userPermissionData = await getData(permissionModel, { userId: new ObjectId(userId) }, {}, {});
        if (!userPermissionData) return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(new apiResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, responseMessage.getDataNotFound("user permissions"), {}, {}));

        if (search) {
            match.$or = [
                { tabName: { $regex: search, $options: 'si' } },
                { displayName: { $regex: search, $options: 'si' } },
                { tabUrl: { $regex: search, $options: 'si' } },
            ];
        }

        match.isActive = true;

        let moduleData = await moduleModel.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "modules",
                    let: { tabId: '$parentId' },
                    pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$_id', '$$tabId'] },], }, } }],
                    as: "modules"
                }
            },
            {
                $unwind: { path: "$modules", preserveNullAndEmptyArrays: true }
            },
        ])
        let newUserPermissionData = [];
        moduleData?.forEach(item => {
            let newObj = {
                parentTab: item.modules !== null ? item.modules : {},
                view: false,
                add: false,
                edit: false,
                delete: false,
            };

            let permission = userPermissionData?.find(item2 => item2.userId.toString() == userId.toString() && item2.moduleId.toString() == item._id.toString() && item.isActive == true);
            if (permission) {
                newObj.view = permission.view;
                newObj.add = permission.add;
                newObj.edit = permission.edit;
                newObj.delete = permission.delete;
            }
            newUserPermissionData.push({ ...item, ...newObj });
        });

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("user permissions"), newUserPermissionData.sort((a, b) => a.number - b.number), {}));
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};