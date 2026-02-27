import { format, parseISO, isValid, isBefore, isAfter } from 'date-fns';

export const formatDate = (date: Date | string, formatStr = 'yyyyMMdd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) throw new Error('Invalid date');
  return format(d, formatStr);
};

export const isValidDate = (dateStr: string): boolean => {
  const d = parseISO(dateStr);
  return isValid(d);
};

export const isFutureDate = (dateStr: string): boolean => {
  return isAfter(parseISO(dateStr), new Date());
};

export const isBeforeDate = (date1: string, date2: string): boolean => {
  return isBefore(parseISO(date1), parseISO(date2));
};
