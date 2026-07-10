import express from "express";
import { HTTP_STATUS, USER_TYPES, apiResponse } from "../common";
import { patchHeadBranchesForAllCompanies } from "../helper/migration";
import { reqInfo, getFirstMatch, updateData, getData } from "../helper";
import { moduleModel, permissionModel, userModel } from "../database";

const router = express.Router();

router.post("/patch-head-branches", async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    // console.log("user===>", user);
    // Security: Only super admins should run this
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && process.env.NODE_ENV !== "development") {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, "Access Denied", {}, {}));
    }

    const result = await patchHeadBranchesForAllCompanies(user?._id || null);

    if (result.success) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, result.message, {}, {}));
    } else {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, result.message, {}, {}));
    }
  } catch (error: any) {
    console.error("Migration Route Error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, {}, {}));
  }
});

router.post("/seed-messenger-module", async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && process.env.NODE_ENV !== "development") {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, "Access Denied", {}, {}));
    }

    const settingsParent = await getFirstMatch(moduleModel, { tabName: "settings", isDeleted: false }, {}, {});
    if (!settingsParent) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Settings parent module not found. Ensure Settings module exists first.", {}, {}));
    }

    const existing = await getFirstMatch(moduleModel, { tabName: "messenger", isDeleted: false }, {}, {});
    if (existing) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Messenger module already seeded", existing, {}));
    }

    const moduleData = {
      tabName: "messenger",
      displayName: "Messenger",
      tabUrl: "/settings/messenger",
      parentId: settingsParent._id,
      number: 0,
      hasView: true,
      hasAdd: true,
      hasEdit: true,
      hasDelete: false,
      default: false,
      isActive: true,
      isDeleted: false,
    };

    const response = await moduleModel.create(moduleData);

    const superAdmins = await getData(userModel, { userType: USER_TYPES.SUPER_ADMIN, isDeleted: false }, { _id: 1 }, {});
    for (const admin of superAdmins) {
      await updateData(
        permissionModel,
        { userId: admin._id, moduleId: response._id },
        { moduleId: response._id, userId: admin._id, view: true, add: true, edit: true, delete: false },
        { upsert: true },
      );
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Messenger module seeded successfully", response, {}));
  } catch (error: any) {
    console.error("Seed Messenger Module Error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, {}, {}));
  }
});

router.post("/seed-whatsapp-module", async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && process.env.NODE_ENV !== "development") {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, "Access Denied", {}, {}));
    }

    const settingsParent = await getFirstMatch(moduleModel, { tabName: "settings", isDeleted: false }, {}, {});
    if (!settingsParent) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Settings parent module not found.", {}, {}));
    }

    const existing = await getFirstMatch(moduleModel, { tabName: "whatsapp", isDeleted: false }, {}, {});
    if (existing) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "WhatsApp module already seeded", existing, {}));
    }

    const moduleData = {
      tabName: "whatsapp",
      displayName: "WhatsApp",
      tabUrl: "/settings/whatsapp",
      parentId: settingsParent._id,
      number: 0,
      hasView: true, hasAdd: true, hasEdit: true, hasDelete: false,
      default: false, isActive: true, isDeleted: false,
    };

    const response = await moduleModel.create(moduleData);

    const superAdmins = await getData(userModel, { userType: USER_TYPES.SUPER_ADMIN, isDeleted: false }, { _id: 1 }, {});
    for (const admin of superAdmins) {
      await updateData(
        permissionModel,
        { userId: admin._id, moduleId: response._id },
        { moduleId: response._id, userId: admin._id, view: true, add: true, edit: true, delete: false },
        { upsert: true },
      );
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "WhatsApp module seeded successfully", response, {}));
  } catch (error: any) {
    console.error("Seed WhatsApp Module Error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, {}, {}));
  }
});

export default router;
