import express from "express";
import { HTTP_STATUS, apiResponse } from "../common";
import { patchHeadBranchesForAllCompanies } from "../helper/migration";
import { reqInfo } from "../helper";

const router = express.Router();

router.post("/patch-head-branches", async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    // Security: Only super admins should run this
    if (user?.userType !== "super_admin" && process.env.NODE_ENV !== "development") {
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

export default router;
