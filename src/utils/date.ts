export function parseDate(dateInput?: Date | string): Date {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string') return new Date(dateInput);
  return dateInput;
}

export function getStartOfDay(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getEndOfDay(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getStartOfMonth(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getEndOfMonth(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function isSameDay(d1: Date | string, d2: Date | string): boolean {
  const a = parseDate(d1);
  const b = parseDate(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDateLabel(isoString: string): string {
  const date = parseDate(isoString);
  const now = new Date();

  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });

  if (isSameDay(date, now)) {
    return `Today, ${day} ${month}`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Yesterday, ${day} ${month}`;
  }

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  };
  return date.toLocaleDateString('en-IN', options);
}

export function formatTime(isoString: string): string {
  const date = parseDate(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function getDaysInMonthGrid(year: number, month: number, startOnSunday: boolean = true): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOffset = startOnSunday ? firstDay.getDay() : (firstDay.getDay() + 6) % 7;

  const totalDays = lastDay.getDate();
  const days: (Date | null)[] = [];

  for (let i = 0; i < startDayOffset; i++) {
    days.push(null);
  }

  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}
