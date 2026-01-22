import { USER_TYPES } from "../common";
import { companyModel } from "../database";
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
