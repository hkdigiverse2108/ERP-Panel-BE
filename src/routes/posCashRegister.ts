import { Router } from "express";
import { posCashRegisterController } from "../controllers";
import { adminJwt } from "../helper";

const router = Router();

router.post("/add", adminJwt, posCashRegisterController.addPosCashRegister);
router.put("/edit", adminJwt, posCashRegisterController.editPosCashRegister);
router.get("/all", adminJwt, posCashRegisterController.getAllPosCashRegister);
router.get("/details", adminJwt, posCashRegisterController.getCashRegisterDetails);
router.get("/dropdown", adminJwt, posCashRegisterController.posCashRegisterDropDown);
router.get("/:id", adminJwt, posCashRegisterController.getOnePosCashRegister);
router.delete("/:id", adminJwt, posCashRegisterController.deletePosCashRegister);

export const posCashRegisterRouter = router;
