import { Router } from 'express';
import { financeRouter } from './finance';
import { booksRouter } from './books';
import { bookSalesRouter } from './bookSales';
import { payrollRouter } from './payroll';

export const v1Router = Router();

v1Router.use('/finance', financeRouter);
v1Router.use('/books', booksRouter);
v1Router.use('/book-sales', bookSalesRouter);
v1Router.use('/payroll', payrollRouter);
