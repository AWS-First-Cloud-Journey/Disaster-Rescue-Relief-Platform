import express from 'express';
import volunteersRoutes from './volunteers.routes.mjs';

const router = express.Router();

router.use('/volunteers', volunteersRoutes);

export default router;