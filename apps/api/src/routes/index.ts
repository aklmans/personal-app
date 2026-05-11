import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blogRouter from "./blog";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/blog", blogRouter);
router.use("/notifications", notificationsRouter);

export default router;
