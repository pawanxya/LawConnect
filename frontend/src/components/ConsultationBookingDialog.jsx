import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatSlot, formatDate, isDatePast, formatTime12Hour, addMinutesToTime } from "@/lib/slotUtils";
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const ConsultationBookingDialog = ({
  open,
  onOpenChange,
  lawyerName,
  slots = [],
  onConfirm,
  isSubmitting,
}) => {
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [customTime, setCustomTime] = useState("10:00");
  const [bookingNotes, setBookingNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedSlotId("");
      setCustomTime("10:00");
      setBookingNotes("");
    }
  }, [open]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped = {};
    slots
      .filter((slot) => !slot.isBooked && slot.date && !isDatePast(slot.date))
      .forEach((slot) => {
        if (!grouped[slot.date]) {
          grouped[slot.date] = [];
        }
        grouped[slot.date].push(slot);
      });
    return grouped;
  }, [slots]);

  const selectedDateStr = useMemo(() => {
    return selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  }, [selectedDate]);

  const sortedDates = useMemo(() => {
    return Object.keys(slotsByDate).sort();
  }, [slotsByDate]);

  const selectedDateSlots = selectedDateStr ? slotsByDate[selectedDateStr] || [] : [];

  const handleConfirm = () => {
    if (!selectedDate) return;
    
    if (selectedSlotId) {
      onConfirm({ slotId: selectedSlotId, notes: bookingNotes });
    } else {
      onConfirm({
        date: selectedDateStr,
        timeSlot: `${customTime} - ${formatTime12Hour(addMinutesToTime(customTime, 60))}`,
        notes: bookingNotes,
      });
    }
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedSlotId("");
    setBookingNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Consultation with {lawyerName}</DialogTitle>
          <DialogDescription>
            Select a date and time slot for your consultation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <label className="text-sm font-semibold">1. Select Date</label>
            </div>
            
            {sortedDates.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-primary/5 p-2 rounded-lg border border-primary/10 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-primary" />
                  <p className="text-[10px] text-primary font-medium">Lawyer has no predefined slots. Please pick a date below:</p>
                </div>
                
                <div className="border-2 border-primary/20 rounded-2xl p-3 bg-primary/5 shadow-sm flex justify-center w-full overflow-hidden">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    className="w-full"
                    initialFocus
                  />
                </div>
                
                {selectedDate && (
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground border-none px-6 py-1.5 shadow-md shadow-primary/20 animate-in fade-in zoom-in-95">
                      Selected: {format(selectedDate, "PPP")}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {sortedDates.map((date) => (
                  <Button
                    key={date}
                    type="button"
                    variant={selectedDateStr === date ? "default" : "outline"}
                    className={cn(
                      "text-xs h-auto py-2 flex flex-col items-center transition-all",
                      selectedDateStr === date && "ring-2 ring-primary ring-offset-1"
                    )}
                    onClick={() => {
                      setSelectedDate(new Date(date + "T12:00:00"));
                      setSelectedSlotId("");
                    }}
                  >
                    <span>{formatDate(date)}</span>
                    <span className="text-[10px] opacity-70">
                      {slotsByDate[date].length} slots
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Slot/Time Selection */}
          {selectedDate && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <label className="text-sm font-semibold">2. Select Time</label>
              </div>
              
              {selectedDateSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {selectedDateSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={selectedSlotId === slot.id ? "default" : "outline"}
                      className={cn(
                        "text-sm h-auto py-3 flex flex-col items-center gap-1",
                        selectedSlotId === slot.id && "ring-2 ring-primary ring-offset-1"
                      )}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <span className="font-semibold">{formatSlot(slot.startTime, slot.endTime)}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 border rounded-xl bg-muted/20 border-dashed">
                  <p className="text-xs text-muted-foreground text-center">Pick your preferred time (Lawyer will approve):</p>
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="max-w-[150px] mx-auto text-center font-bold text-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Notes (Optional)</label>
            <Input
              placeholder="Briefly mention your legal concern..."
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              maxLength={160}
              className="text-sm border-muted-foreground/20"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={handleClose} className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || (selectedDateSlots.length > 0 && !selectedSlotId) || isSubmitting}
            className="rounded-lg px-8"
          >
            {isSubmitting ? "Booking..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
