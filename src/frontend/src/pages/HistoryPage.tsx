import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Printer,
  Receipt,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Bill } from "../backend.d";
import { useGetBillHistory } from "../hooks/useQueries";

// Convert IC nanosecond timestamp to JS Date
function billDate(ts: bigint): Date {
  return new Date(Number(ts / BigInt(1_000_000)));
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDate(ts: bigint): string {
  return billDate(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface CalendarProps {
  year: number;
  month: number; // 0-indexed
  billsByDate: Map<string, Bill[]>;
  selectedDateKey: string | null;
  onSelectDate: (key: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function BillCalendar({
  year,
  month,
  billsByDate,
  selectedDateKey,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarProps) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build grid: leading empty cells + days
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          data-ocid="calendar.pagination_prev"
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-sm">
          {MONTHS[month]} {year}
        </h3>
        <button
          type="button"
          data-ocid="calendar.pagination_next"
          onClick={onNextMonth}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) {
            // biome-ignore lint/suspicious/noArrayIndexKey: grid positioning
            return <div key={`empty-${i}`} />;
          }
          const cellDate = new Date(year, month, day);
          const key = toDateKey(cellDate);
          const hasBills = billsByDate.has(key);
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const isSelected = selectedDateKey === key;

          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: grid positioning
              key={`day-${i}`}
              type="button"
              data-ocid="calendar.toggle"
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={[
                "relative flex flex-col items-center justify-center h-9 w-full rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold"
                  : isToday
                    ? "border border-primary text-primary font-semibold hover:bg-primary/10"
                    : hasBills
                      ? "hover:bg-muted font-medium"
                      : "hover:bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <span>{day}</span>
              {hasBills && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { data: bills = [], isLoading } = useGetBillHistory();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const sortedBills = useMemo(
    () => [...bills].sort((a, b) => Number(b.createdAt - a.createdAt)),
    [bills],
  );

  // Group bills by date key
  const billsByDate = useMemo(() => {
    const map = new Map<string, Bill[]>();
    for (const bill of bills) {
      const key = toDateKey(billDate(bill.createdAt));
      const arr = map.get(key) ?? [];
      arr.push(bill);
      map.set(key, arr);
    }
    return map;
  }, [bills]);

  // Filtered bills
  const displayedBills = useMemo(() => {
    if (!selectedDateKey) return sortedBills;
    return sortedBills.filter(
      (b) => toDateKey(billDate(b.createdAt)) === selectedDateKey,
    );
  }, [sortedBills, selectedDateKey]);

  // Revenue for selected date
  const selectedRevenue = useMemo(() => {
    if (!selectedDateKey) return null;
    const dayBills = billsByDate.get(selectedDateKey) ?? [];
    return dayBills.reduce((s, b) => s + b.totalAmount, 0);
  }, [selectedDateKey, billsByDate]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
  };

  // Parse selected date for display
  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return null;
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, m, d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [selectedDateKey]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card shrink-0">
        <History className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Bill History</h2>
        <Badge variant="secondary">{bills.length} bills</Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Calendar */}
        <div className="w-72 shrink-0 border-r border-border bg-background p-4 overflow-y-auto">
          <BillCalendar
            year={calYear}
            month={calMonth}
            billsByDate={billsByDate}
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />

          {/* Selected date summary */}
          <AnimatePresence>
            {selectedDateKey && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Selected
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {selectedDateLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid="calendar.close_button"
                    onClick={() => setSelectedDateKey(null)}
                    className="text-muted-foreground hover:text-foreground mt-0.5"
                    aria-label="Clear date filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bills</span>
                  <span className="font-bold">{displayedBills.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-bold text-primary">
                    ₹{(selectedRevenue ?? 0).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Bills button */}
          {selectedDateKey && (
            <Button
              type="button"
              data-ocid="history.all_bills.button"
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => setSelectedDateKey(null)}
            >
              Show All Bills
            </Button>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span>Date has bills</span>
          </div>
        </div>

        {/* Right: Bill list */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filter bar */}
          <div className="px-5 py-2.5 border-b border-border bg-background flex items-center gap-2 shrink-0">
            {selectedDateKey ? (
              <>
                <Badge className="bg-primary/15 text-primary border-primary/30">
                  {selectedDateLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {displayedBills.length} bill
                  {displayedBills.length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  data-ocid="history.filter.toggle"
                  onClick={() => setSelectedDateKey(null)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filter
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                All {bills.length} bills · click a date to filter
              </span>
            )}
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div
                data-ocid="history.loading_state"
                className="flex items-center justify-center h-40"
              >
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : displayedBills.length === 0 ? (
              <div
                data-ocid="history.empty_state"
                className="flex flex-col items-center justify-center h-60 text-muted-foreground"
              >
                <Receipt className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">
                  {selectedDateKey ? "No bills on this date" : "No bills yet"}
                </p>
                <p className="text-sm">
                  {selectedDateKey
                    ? "Try selecting a different date"
                    : "Saved bills will appear here"}
                </p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <AnimatePresence initial={false}>
                  {displayedBills.map((bill, idx) => (
                    <motion.div
                      key={bill.id}
                      data-ocid={`history.item.${idx + 1}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-card border border-border rounded-lg p-4 hover:shadow-card transition-shadow cursor-pointer"
                      onClick={() => setSelectedBill(bill)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            Bill #{bill.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(bill.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-lg">
                            ₹{bill.totalAmount.toFixed(2)}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {bill.items.length} item
                            {bill.items.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {bill.items.slice(0, 3).map((item) => (
                          <span
                            key={item.barcode}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                          >
                            {item.productName}
                          </span>
                        ))}
                        {bill.items.length > 3 && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            +{bill.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Bill Detail Dialog */}
      <Dialog
        open={!!selectedBill}
        onOpenChange={(open) => !open && setSelectedBill(null)}
      >
        <DialogContent data-ocid="history.bill.dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Bill #{selectedBill?.id.slice(-8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {formatDate(selectedBill.createdAt)}
              </p>
              <Separator />
              <div className="space-y-2">
                {selectedBill.items.map((item) => (
                  <div
                    key={item.barcode}
                    className="flex justify-between text-sm"
                  >
                    <span className="font-medium">
                      {item.productName}{" "}
                      <span className="text-muted-foreground text-xs">
                        ×{String(item.quantity)}
                      </span>
                    </span>
                    <span className="font-semibold">
                      ₹{item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">
                  ₹{selectedBill.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              data-ocid="history.bill.close_button"
              variant="outline"
              onClick={() => setSelectedBill(null)}
            >
              Close
            </Button>
            <Button
              data-ocid="history.bill.print_button"
              onClick={() => window.print()}
              className="bg-primary hover:bg-primary/90"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
