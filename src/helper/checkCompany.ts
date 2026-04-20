import { USER_TYPES } from "../common";
import { branchModel, companyModel } from "../database";
import { getFirstMatch } from "./databaseServices";
import { responseMessage } from "./responseMessage";

export const checkCompany = async (user, value) => {
  const userType = user?.userType;
  if (!userType) return false;

  let companyId = null;
  if (userType !== USER_TYPES.SUPER_ADMIN) {
    companyId = user?.companyId?._id;
  } else {
    companyId = value.companyId;
  }
  // if (!companyId) throw new Error(responseMessage?.fieldIsRequired("Company Id"));

  if (companyId) {
    const isExist = await getFirstMatch(companyModel, { _id: companyId, isDeleted: false }, {}, {});
    if (!isExist) {
      throw new Error(responseMessage?.getDataNotFound("Company"));
    }
  } else {
    companyId = null;
  }

  return companyId;
};

export const checkBranch = async (user: any, value: any) => {
  const userType = user?.userType;
  if (!userType) return null;

  let branchId = null;
  if (userType !== USER_TYPES.SUPER_ADMIN) {
    branchId = user?.branchId?._id || user?.branchId;
  } else {
    branchId = value.branchId;
  }

  if (branchId) {
    const isBranchExist = await getFirstMatch(branchModel, { _id: branchId, isDeleted: false }, {}, {});
    if (!isBranchExist) throw new Error(responseMessage?.getDataNotFound("Branch"));
  }

  return branchId;
};