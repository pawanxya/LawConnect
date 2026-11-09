import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDays, MapPin, Calendar as CalendarIcon } from "lucide-react";

export function CaseHearingDialog({ caseId, onAddHearing, disabled }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    title: "Regular Hearing",
    location: "",
    notes: ""
  });

  const handleSubmit = async () => {
    if (!formData.date || !formData.title || !formData.location) {
      return;
    }
    
    try {
      setLoading(true);
      await onAddHearing(caseId, formData);
      setOpen(false);
      setFormData({ date: "", title: "Regular Hearing", location: "", notes: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Set Hearing Date
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Next Hearing</DialogTitle>
          <DialogDescription>
            Enter the hearing details. This will be visible to the client immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">Hearing Date</label>
            {!formData.date ? (
              <div className="border rounded-xl p-1 bg-muted/20">
                <CalendarUI
                  mode="single"
                  selected={undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setFormData({ ...formData, date: `${y}-${m}-${d}` });
                    }
                  }}
                  className="rounded-md border-none"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">
                    {format(new Date(formData.date), "PPPP")}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFormData({...formData, date: ""})}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Change Date
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hearing Title / Type</label>
            <Input 
              placeholder="e.g. First Hearing, Evidence, Argument" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Court / Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9"
                placeholder="e.g. District Court, Room 302" 
                value={formData.location} 
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea 
              placeholder="Any instructions for the client..." 
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.date || !formData.location}>
            {loading ? "Scheduling..." : "Schedule Hearing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
