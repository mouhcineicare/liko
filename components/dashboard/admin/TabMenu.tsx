import { Spin } from "antd";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

interface TabOption {
  value: string;
  label: string;
}

interface TabMenuProps {
  options: TabOption[];
  activeTab: string;
  onTabChange: (value: string) => void;
  isLoading?: boolean;
}

export default function TabMenu({ 
  options, 
  activeTab, 
  onTabChange, 
  isLoading = false 
}: TabMenuProps) {
  // Find the active tab label
  const activeTabLabel = options.find(opt => opt.value === activeTab)?.label;

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between" disabled={isLoading}>
            <span className="flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              {isLoading ? (
                <Spin size="small" className="mr-2" />
              ) : (
                activeTabLabel
              )}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full" align="start">
          {isLoading ? (
            <div className="flex justify-center p-2">
              <Spin size="small" />
            </div>
          ) : (
            options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onTabChange(option.value)}
                className={
                  activeTab === option.value
                    ? "bg-blue-50 text-blue-600"
                    : ""
                }
              >
                {option.label}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}