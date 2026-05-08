import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blogRouter from "./blog";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/blog", blogRouter);

export default router;
