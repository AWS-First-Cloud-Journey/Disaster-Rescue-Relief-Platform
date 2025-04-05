import express from 'express';
import requestersRoutes from './requesters.routes.mjs';

const router = express.Router();

// Mount requesters routes at /requesters path
router.use('/requesters', requestersRoutes);

export default router;