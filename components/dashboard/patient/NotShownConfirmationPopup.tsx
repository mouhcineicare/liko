import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface NotShownConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSingleSession: boolean;
}

export default function NotShownConfirmationPopup({
  isOpen,
  onClose,
  onConfirm,
  isSingleSession,
}: NotShownConfirmationPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Not Shown</DialogTitle>
          <DialogDescription>
            {isSingleSession
              ? "Please note that this is a single-session appointment. It will be marked as completed automatically, and a new appointment will be created for you. 50% of the payment budget for this appointment will be reduced from your account."
              : "Please note that 1 session will be deducted from your remaining sessions. 50% of the payment budget for this appointment will be reduced from your account."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Mark as Not Shown</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}