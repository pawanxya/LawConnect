import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { submitReview } from "@/lib/dataService";
import { toast } from "sonner";

export function ReviewModal({ lawyerId, lawyerName, bookingId, caseId, onReviewSubmitted }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please write a comment.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await submitReview({ 
        lawyerId, 
        rating, 
        comment,
        bookingId,
        caseId
      });
      toast.success("Review submitted successfully!");
      setOpen(false);
      setRating(0);
      setComment("");
      if (onReviewSubmitted) onReviewSubmitted(data);
    } catch (error) {
      toast.error(error.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Leave a Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {lawyerName}</DialogTitle>
          <DialogDescription>
            Share your experience to help others find the right legal help.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Review</label>
            <Textarea
              placeholder="How was your consultation?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
