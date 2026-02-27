import { apiResponse, HTTP_STATUS } from "../common";
import { stockModel, productModel } from "../database";
import { getFirstMatch } from "./databaseServices";
import { responseMessage } from "./responseMessage";

export const checkStockQty = async (items: any[], companyId: string, res: any, oldItems: any[] = []) => {
  try {
    for (const item of items) {
      if (!item.productId) continue;

      const oldItem = oldItems.find((oi) => (oi.productId?._id || oi.productId)?.toString() === (item.productId?._id || item.productId)?.toString());
      const oldQty = oldItem ? oldItem.qty || 0 : 0;
      const currentRequestedQty = item.qty || 0;

      const netChange = currentRequestedQty - oldQty;

      if (netChange <= 0) continue;

      const stock = await getFirstMatch(stockModel, { productId: item.productId, companyId, isDeleted: false }, {}, {});

      if (!stock || stock.qty < netChange) {
        const product = await getFirstMatch(productModel, { _id: item.productId }, { name: 1 }, {});
        const productName = product ? product.name : "Product";
        const availableQty = stock ? stock.qty : 0;

        res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.insufficientStock(productName, availableQty, netChange), {}, {}));
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Stock Check Error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
    return false;
  }
};
