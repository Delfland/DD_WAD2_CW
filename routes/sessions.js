
// routes/sessions.js
import { Router } from 'express';
import { SessionModel } from '../models/sessionModel.js';

const router = Router();

router.post('/', async (req, res) => {
  const session = await SessionModel.create({ ...req.body, bookedCount: 0 });
  res.status(201).json({ session });
});

router.get('/by-course/:courseId', async (req, res) => {
  const sessions = await SessionModel.listByCourse(req.params.courseId);
  res.json({ sessions });
});

export default router;
``
