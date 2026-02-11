import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getBookSales, createBookSale, updateBookSale } from '../../controllers/bookSalesController';

export const bookSalesRouter = Router();

bookSalesRouter.use(authenticate);
bookSalesRouter.use(requireRole('super_admin', 'admin'));

bookSalesRouter.get('/', getBookSales);
bookSalesRouter.post('/', createBookSale);
bookSalesRouter.patch('/:id', updateBookSale);
