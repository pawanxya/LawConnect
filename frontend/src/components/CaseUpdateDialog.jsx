import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
function CaseUpdateDialog({ caseId, caseTitle, onUpdate, disabled }) {
  const [updateText, setUpdateText] = useState("");
  const [open, setOpen] = useState(false);
  const handleSubmit = () => {
    if (!updateText.trim()) {
      toast.error("Please enter an update");
      return;
    }
    onUpdate(caseId, updateText);
    toast.success("Case progress updated successfully");
    setUpdateText("");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          Update Progress
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Case Progress</DialogTitle>
          <DialogDescription>
            Add a progress update for: {caseTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="update">Progress Update</Label>
            <Textarea
              id="update"
              placeholder="Enter case progress update..."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export { CaseUpdateDialog };
