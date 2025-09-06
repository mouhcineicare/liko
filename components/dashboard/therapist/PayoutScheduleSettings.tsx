"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type PayoutSchedule = 'manual' | 'weekly' | 'biweekly' | 'monthly';

interface PayoutScheduleSettingsProps {
  initialSchedule: PayoutSchedule;
  initialMinimumAmount: number;
  onSave: (schedule: PayoutSchedule, minimumAmount: number) => Promise<void>;
}

export function PayoutScheduleSettings({
  initialSchedule,
  initialMinimumAmount,
  onSave
}: PayoutScheduleSettingsProps) {
  const [schedule, setSchedule] = useState<PayoutSchedule>(initialSchedule);
  const [minimumAmount, setMinimumAmount] = useState<number>(initialMinimumAmount);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(schedule, minimumAmount);
      toast.success("Payout settings updated successfully");
    } catch (error) {
      toast.error("Failed to update payout settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Payout Schedule Settings</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="schedule">Payout Schedule</Label>
          <Select 
            value={schedule} 
            onValueChange={(value) => setSchedule(value as PayoutSchedule)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimumAmount">Minimum Payout Amount ($)</Label>
          <Input
            type="number"
            id="minimumAmount"
            value={minimumAmount}
            onChange={(e) => setMinimumAmount(Number(e.target.value))}
            min="0"
            step="0.01"
          />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}