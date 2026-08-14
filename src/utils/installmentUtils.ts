import DateObjectModule from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
const DateObject = (DateObjectModule as any).default || DateObjectModule;

export function generateInstallmentCode(loanId: string | number, loanNumber: string | undefined, index: number, dueDate: string): string {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

export function calculateInstallmentDates(startDateIso: string, count: number, frequency: 'monthly'|'quarterly'|'yearly', calendarType: 'gregorian'|'jalali'): string[] {
    const dates: string[] = [];
    const stepMonths = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
    
    // We parse the ISO string (which is standard Gregorian) into a DateObject
    // But we set its calendar to the system's calendar, so adding months respects that calendar's lengths
    const d = new DateObject({ date: startDateIso, format: "YYYY-MM-DD" });
    if (calendarType === 'jalali') {
        d.setCalendar(persian);
        d.setLocale(persian_fa);
    }
    
    for (let i = 0; i < count; i++) {
        const current = new DateObject(d);
        if (i > 0) {
            current.add(i * stepMonths, "month");
        }
        // Convert back to ISO (Gregorian) string for storage
        // DateObject natively supports .toDate()
        const localIso = new Date(current.toDate().getTime() - current.toDate().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        dates.push(localIso);
    }
    return dates;
}
