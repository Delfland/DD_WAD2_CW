
// routes/bookings.js
import { Router } from 'express';
import { bookCourse, bookSession, cancelBooking } from '../controllers/bookingController.js';

const router = Router();

router.post('/course', bookCourse);
router.post('/session', bookSession);
router.delete('/:bookingId', cancelBooking);

export default router;
