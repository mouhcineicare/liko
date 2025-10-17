"use client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  label 
}: RichTextEditorProps) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[200px] font-mono text-sm"
        rows={10}
      />
    </div>
  );
}