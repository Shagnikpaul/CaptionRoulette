import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitReport } from '@/api/reports';
import { parseApiError } from '@/api/errors';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ReportDialogProps {
  targetType: 'POST' | 'CAPTION';
  targetId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReportDialog({
  targetType,
  targetId,
  isOpen,
  onOpenChange,
  onSuccess,
}: ReportDialogProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Log in to report', { description: 'Please sign in to report content.' });
      onOpenChange(false);
      navigate('/login');
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      setErrorMsg('Reason is required.');
      return;
    }
    if (trimmed.length > 255) {
      setErrorMsg('Reason cannot exceed 255 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitReport(targetType, targetId, trimmed);
      toast.success('Report submitted successfully', {
        description: 'Thank you for keeping Caption Roulette safe and fun!',
      });
      setReason('');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        setErrorMsg("You've already reported this.");
      } else if (status === 400) {
        const parsed = parseApiError(err);
        setErrorMsg(parsed.message || 'Validation error occurred.');
      } else {
        const parsed = parseApiError(err);
        setErrorMsg(parsed.message || 'An error occurred while submitting the report.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setErrorMsg(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-black/90 border border-white/10 text-white rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            Report {targetType === 'POST' ? 'Post' : 'Caption'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Please tell us why you are reporting this content. Our moderation team will review it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-reason" className="text-xs font-semibold text-white/70">
              Reason (required, max 255 characters)
            </label>
            <Textarea
              id="report-reason"
              placeholder="Provide detail about why this violates rules (e.g. offensive language, spam, inappropriate image)..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              rows={4}
              maxLength={255}
              disabled={isSubmitting}
              className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none"
            />
            <div className="flex justify-between items-center text-[10px] font-semibold text-white/30 tabular-nums min-h-[1.5rem]">
              <span className="text-red-400 font-medium">{errorMsg}</span>
              <span>{reason.length} / 255</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim() || reason.length > 255}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
