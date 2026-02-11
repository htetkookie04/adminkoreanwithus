import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  getPayroll,
  generatePayroll,
  updatePayroll,
  payPayroll
} from '../../controllers/payrollController';

export const payrollRouter = Router();

payrollRouter.use(authenticate);
payrollRouter.use(requireRole('super_admin', 'admin'));

payrollRouter.get('/', getPayroll);
payrollRouter.post('/generate', generatePayroll);
payrollRouter.patch('/:id', updatePayroll);
payrollRouter.post('/:id/pay', payPayroll);
