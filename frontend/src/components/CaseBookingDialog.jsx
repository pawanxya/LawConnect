import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Briefcase, AlertCircle } from "lucide-react";

export const CaseBookingDialog = ({
  open,
  onOpenChange,
  lawyerName,
  bookingId,
  onConfirm,
  isSubmitting,
}) => {
  const [caseTitle, setCaseTitle] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [errors, setErrors] = useState({});

  const handleValidate = () => {
    const newErrors = {};
    if (!caseTitle.trim()) {
      newErrors.caseTitle = "Case title is required";
    }
    if (!caseDescription.trim()) {
      newErrors.caseDescription = "Case description is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (handleValidate()) {
      onConfirm({
        caseTitle,
        caseDescription,
        bookingId,
      });
      setCaseTitle("");
      setCaseDescription("");
      setErrors({});
    }
  };

  const handleClose = () => {
    setCaseTitle("");
    setCaseDescription("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Book {lawyerName} for a Case
          </DialogTitle>
          <DialogDescription>
            After your consultation, you can now hire this lawyer for your legal case. Provide details about your case below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200 p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Next Steps</p>
              <p>After booking the lawyer for this case, you'll be able to:</p>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                <li>Share documents and evidence</li>
                <li>Add hearing dates and timeline</li>
                <li>Track case progress</li>
                <li>Communicate directly with your lawyer</li>
              </ul>
            </div>
          </Card>

          {/* Case Title */}
          <div className="space-y-2">
            <Label htmlFor="case-title" className="font-semibold">
              Case Title
            </Label>
            <Input
              id="case-title"
              placeholder="e.g., Property Dispute, Divorce Settlement, Contract Breach"
              value={caseTitle}
              onChange={(e) => {
                setCaseTitle(e.target.value);
                if (errors.caseTitle) setErrors({ ...errors, caseTitle: "" });
              }}
              className={errors.caseTitle ? "border-destructive" : ""}
            />
            {errors.caseTitle && (
              <p className="text-sm text-destructive">{errors.caseTitle}</p>
            )}
          </div>

          {/* Case Description */}
          <div className="space-y-2">
            <Label htmlFor="case-desc" className="font-semibold">
              Case Description
            </Label>
            <Textarea
              id="case-desc"
              placeholder="Provide detailed information about your case, including the background, parties involved, and what you're seeking from this legal action..."
              value={caseDescription}
              onChange={(e) => {
                setCaseDescription(e.target.value);
                if (errors.caseDescription)
                  setErrors({ ...errors, caseDescription: "" });
              }}
              className={`min-h-[120px] resize-none ${
                errors.caseDescription ? "border-destructive" : ""
              }`}
            />
            {errors.caseDescription && (
              <p className="text-sm text-destructive">
                {errors.caseDescription}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters, maximum 2000 characters
            </p>
          </div>

          {/* Summary */}
          <Card className="bg-muted/50 p-4 space-y-2 border-0">
            <div className="text-sm font-semibold mb-3">Booking Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lawyer:</span>
                <span className="font-medium">{lawyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Case:</span>
                <span className="font-medium">
                  {caseTitle || "Not entered yet"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Once approved, you can manage all case details from your dashboard.
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel - Keep Consultation Only
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Booking..." : "Book Lawyer for Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
