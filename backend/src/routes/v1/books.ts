import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  getBooks,
  createBook,
  updateBook,
  deleteBook
} from '../../controllers/booksController';

export const booksRouter = Router();

booksRouter.use(authenticate);
booksRouter.use(requireRole('super_admin', 'admin'));

booksRouter.get('/', getBooks);
booksRouter.post('/', createBook);
booksRouter.patch('/:id', updateBook);
booksRouter.delete('/:id', deleteBook);
