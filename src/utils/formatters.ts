export const formatCurrency = (
  value: number | null | undefined,
  currency: string = 'IDR'
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDateTime = (
  value: string | Date | null | undefined,
  locale: string = 'id-ID',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString(
    locale,
    options ?? {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );
};

export const formatDateOnly = (
  value: string | Date | null | undefined,
  locale: string = 'id-ID',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString(
    locale,
    options ?? {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }
  );
};
