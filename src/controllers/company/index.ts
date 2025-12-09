import mongoose from "mongoose";
import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { companyModel } from "../../database/model";
import {
  createOne,
  getData,
  getFirstMatch,
  reqInfo,
  responseMessage,
  updateData,
} from "../../helper";
import { addCompanySchema, editCompanySchema } from "../../validation";

export const addCompany = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = addCompanySchema.validate(req.body);

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0].message,
            {},
            {}
          )
        );

    let existingCompany = await getFirstMatch(
      companyModel,
      { email: value?.email, isDeleted: false },
      {},
      {}
    );

    if (existingCompany)
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          new apiResponse(
            HTTP_STATUS.CONFLICT,
            responseMessage.dataAlreadyExist("Email"),
            {},
            {}
          )
        );

    existingCompany = await getFirstMatch(
      companyModel,
      { phoneNumber: value?.phoneNumber, isDeleted: false },
      {},
      {}
    );

    if (existingCompany)
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          new apiResponse(
            HTTP_STATUS.CONFLICT,
            responseMessage.dataAlreadyExist("Phone Number"),
            {},
            {}
          )
        );

    const response = await createOne(companyModel, value);
    if (response)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.addDataSuccess("Company"),
            response,
            {}
          )
        );
  } catch (error) {
    console.error("error : ", error);
  }
};

export const getCompanyList = async (req, res) => {
  reqInfo(req);
  try {
    let companyList = await getData(
      companyModel,
      {
        isDeleted: false,
      },
      {},
      {}
    );

    if (companyList)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.getDataSuccess("Company list"),
            companyList,
            {}
          )
        );
  } catch (error) {
    console.error("error : ", error);
  }
};

export const deleteCompany = async (req, res) => {
  reqInfo(req);
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage.getDataNotFound("Company details"),
            [],
            {}
          )
        );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage.invalidId("comapny Id"),
            {},
            {}
          )
        );
    }

    const existingCompany = await getFirstMatch(
      companyModel,
      { isDeleted: false, _id: id },
      {},
      {}
    );


    if(!existingCompany){
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company details"), {}, {}));
    }

    let companyDetails = await updateData(
      companyModel,
      { _id: id },
      {
        isDeleted: true,
      },
      {}
    );

    if (companyDetails)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.deleteDataSuccess("Company"),
            companyDetails,
            {}
          )
        );
  } catch (error) {
    console.error("error : ", error);
  }
};

export const updateCompanyDetails = async (req, res) => {
  reqInfo(req);
  try {
    const objCompany = req.body;
    const { error, value } = editCompanySchema.validate(objCompany);

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0].message,
            {},
            {}
          )
        );

    if (
      !mongoose.Types.ObjectId.isValid(value.companyId || objCompany.companyId)
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage.invalidId("comapny Id"),
            {},
            {}
          )
        );
    }

    const updateRecord = await updateData(
      companyModel,
      { _id: value.companyId },
      value,
      {}
    );

    if (updateRecord)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.updateDataSuccess("company details"),
            updateRecord,
            {}
          )
        );
  } catch (error) {
    console.error("error : ", error);
  }
};
