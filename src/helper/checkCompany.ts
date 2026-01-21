import { USER_ROLES } from "../common";
import { companyModel } from "../database";
import { getFirstMatch } from "./databaseServices";
import { responseMessage } from "./responseMessage";

export const checkCompany = async (userRole, user, value) => {
  if (!userRole) return false;

  let companyId = null;
  if (userRole !== USER_ROLES.SUPER_ADMIN) {
    companyId = user?.companyId?._id;
  } else {
    companyId = value.companyId;
  }
  if (!companyId) throw new Error(responseMessage?.fieldIsRequired("Company Id"));

  const isExist = await getFirstMatch(companyModel, { _id: companyId, isDeleted: false }, {}, {});
  if (!isExist) {
    throw new Error(responseMessage.getDataNotFound("Company"));
  }

  return companyId;
};
