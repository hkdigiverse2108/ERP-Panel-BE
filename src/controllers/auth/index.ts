import { apiResponse, HTTP_STATUS } from "../../common";
import { userModal } from "../../database/model/user";
import { getFirstMatch, reqInfo, responseMessage } from "../../helper";
import { RegisterSchema } from "../../validation";

export const Register = async (req, res) => {
  reqInfo(req);

  try {
    console.log(req);
    const { error, value } = RegisterSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, error?.details[0]?.message, {}, {}));
    }

    let isAlready: any = await getFirstMatch(
      userModal,
      {
        $or: [{ email: value?.email }],
      },
      {},
      {}
    );

    if (isAlready) {
      if (isAlready.email === value?.email) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.alreadyEmail, {}, {}));
      }
    }
  } catch (error) {}
};

export const Login = (req, res) => {
  try {
  } catch (error) {}
};
