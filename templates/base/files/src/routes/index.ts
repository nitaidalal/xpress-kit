import { Router } from 'express';

// @slot:ROUTE_IMPORTS

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, message: 'API v1' });
});

// @slot:ROUTES

export default router;
