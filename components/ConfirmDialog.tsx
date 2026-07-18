"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "destructive" | "default";
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirm Action",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className={`flex items-center gap-2 ${variant === "destructive" ? "text-red-600" : "text-blue-600"}`}>
            {variant === "destructive" ? <AlertTriangle size={18} /> : <Check size={18} />}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            icon={X}
            text={cancelText}
            style={{ flex: 1 }}
          />
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            icon={variant === "destructive" ? AlertTriangle : Check}
            text={confirmText}
            style={{ flex: 1 }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
