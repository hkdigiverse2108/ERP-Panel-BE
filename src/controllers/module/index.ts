import { countData, createOne, getData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, updateMany } from "../../helper";
import { apiResponse, HTTP_STATUS } from "../../common";
import { moduleModel, permissionModel, userModel } from "../../database";
import { addModuleSchema, editModuleSchema, deleteModuleSchema, getModuleSchema, getModuleByIdSchema, bulkEditModuleSchema, getUsersPermissionsByModuleIdSchema } from "../../validation";

const ObjectId = require('mongoose').Types.ObjectId

export const add_module = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value: body } = addModuleSchema.validate(req.body);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let isExist = await getFirstMatch(moduleModel, { tabName: body.tabName, isDeleted: false }, {}, {});
        if (isExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.dataAlreadyExist("name"), {}, {}));

        if (body.number) {
            if (!body.parentId) {
                let isNumberExist = await getFirstMatch(moduleModel, { number: body.number, isDeleted: false }, {}, {});
                if (isNumberExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.dataAlreadyExist("tab number"), {}, {}));
            } else {
                let isNumberExist = await getFirstMatch(moduleModel, { number: body.number, parentId: new ObjectId(body.parentId), isDeleted: false }, {}, {});
                if (isNumberExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.dataAlreadyExist("tab number"), {}, {}));
            }
        }

        const response = await createOne(moduleModel, body);
        if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.addDataError, {}, {}));

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("module"), response, {}));
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const edit_module_by_id = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value: body } = editModuleSchema.validate(req.body);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let isExist = await getFirstMatch(moduleModel, { _id: new ObjectId(body.moduleId), isDeleted: false }, {}, {});
        if (!isExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.getDataNotFound("module"), {}, {}));

        if (body.number) {
            if (!body.parentId) {
                let isNumberExist = await getFirstMatch(moduleModel, { number: body.number, isDeleted: false, _id: { $ne: new ObjectId(body.moduleId) } }, {}, {});
                if (isNumberExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.dataAlreadyExist("module number"), {}, {}));
            } else {
                let isNumberExist = await getFirstMatch(moduleModel, { number: body.number, parentId: new ObjectId(body.parentId), isDeleted: false, _id: { $ne: new ObjectId(body.moduleId) } }, {}, {});
                if (isNumberExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.dataAlreadyExist("tab number"), {}, {}));
            }
        }

        const response = await updateData(moduleModel, { _id: new ObjectId(body.moduleId) }, body, {});
        if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("module"), {}, {}));

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.updateDataSuccess("module"), response, {}));
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const delete_module_by_id = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = deleteModuleSchema.validate({ id: req.params.id });
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const response = await updateData(moduleModel, { _id: new ObjectId(value.id), isDeleted: false }, { isDeleted: true }, {})
        if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.getDataNotFound("module"), {}, {}))
        await updateMany(permissionModel, { moduleId: new ObjectId(value.id), isDeleted: false }, { isDeleted: true }, {})

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("module"), response, {}))
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const get_all_module = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = getModuleSchema.validate(req.query);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let { page, limit, search, activeFilter } = value;
        let criteria: any = { isDeleted: false };

        if (search) {
            criteria.$or = [
                { tabName: { $regex: search, $options: 'si' } },
                { displayName: { $regex: search, $options: 'si' } },
            ];
        }

        if (activeFilter !== undefined) {
            criteria.isActive = activeFilter;
        }

        const options: any = {
            sort: { number: 1 },
            populate: [
                {
                    path: "parentId",
                    model: "module"
                }
            ],
        };

        if (page && limit) {
            options.skip = (parseInt(page) - 1) * parseInt(limit);
            options.limit = parseInt(limit);
        }

        const response = await getDataWithSorting(moduleModel, criteria, {}, options);
        const totalData = await countData(moduleModel, criteria);

        const totalPages = page && limit ? Math.ceil(totalData / parseInt(limit)) || 1 : 1;

        const stateObj = {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            totalPages,
        };

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess('module'), {
            module_data: response,
            totalData,
            state: stateObj
        }, {}));
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const get_by_id_module = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = getModuleByIdSchema.validate({ id: req.params.id });
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const response = await getFirstMatch(moduleModel, { _id: new ObjectId(value.id), isDeleted: false }, {}, {})
        if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("module"), {}, {}))

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("module"), response, {}))
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const bulk_edit_permissions_by_module = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = bulkEditModuleSchema.validate(req.body);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let { moduleId, users } = value;

        let updatedPermissions: any = [];
        for (let user of users) {
            const setData = {
                moduleId: new ObjectId(moduleId),
                userId: new ObjectId(user._id),
                add: user.permissions?.add || false,
                edit: user.permissions?.edit || false,
                view: user.permissions?.view || false,
                delete: user.permissions?.delete || false,
            };

            const updated = await updateData(
                permissionModel,
                { userId: new ObjectId(user._id), moduleId: new ObjectId(moduleId) },
                setData,
                { upsert: true }
            );
            updatedPermissions.push(updated);
        }
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("bulk user permissions"), updatedPermissions, {}))
    } catch (error) {
        console.log(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}

export const get_users_permissions_by_moduleId = async (req, res) => {
    reqInfo(req)
    try {
        let { error, value } = getUsersPermissionsByModuleIdSchema.validate(req.query);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        let { moduleId, search } = value;

        const module = await getFirstMatch(moduleModel, { _id: new ObjectId(moduleId), isDeleted: false }, {}, {})
        if (!module) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound('module'), {}, {}))

        let match: any = { isDeleted: false, isActive: true };
        if (search) {
            match.$or = [
                { fullName: { $regex: search, $options: 'si' } },
                { email: { $regex: search, $options: 'si' } },
            ];
        }
        
        const users = await getData(userModel, match, { password: 0 }, {})
        const userIds = users.map((u: any) => u._id)

        const perms = await getData(
            permissionModel,
            { moduleId: new ObjectId(moduleId), userId: { $in: userIds }, isDeleted: false },
            {},
            {}
        )

        const userIdToPerm: Record<string, any> = {}
        for (const p of perms) userIdToPerm[String(p.userId)] = p

        const payload = users.map((u: any) => {
            const p = userIdToPerm[String(u._id)]
            const view = Boolean(module.hasView && p?.view)
            const add = Boolean(module.hasAdd && p?.add)
            const edit = Boolean(module.hasEdit && p?.edit)
            const deleteFlag = Boolean(module.hasDelete && p?.delete)
            const hasAccess = view || add || edit || deleteFlag
            return {
                _id: u._id,
                fullName: u.fullName,
                email: u.email,
                role: u.role,
                permissions: {
                    view,
                    add,
                    edit,
                    delete: deleteFlag,
                    hasAccess,
                }
            }
        })

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess('users permissions for module'), payload, {}))
    } catch (error) {
        console.log(error)
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error))
    }
}