import { Router } from "express";
import { posPaymentController } from "../controllers";

const posPaymentRouter = Router();

posPaymentRouter.post("/add", posPaymentController.addPosPayment);
posPaymentRouter.put("/edit", posPaymentController.editPosPayment);
posPaymentRouter.get("/all", posPaymentController.getAllPosPayment);
posPaymentRouter.get("/:id", posPaymentController.getOnePosPayment);
posPaymentRouter.delete("/:id", posPaymentController.deletePosPayment);

export { posPaymentRouter };
