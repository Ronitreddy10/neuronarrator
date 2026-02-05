import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Users } from "lucide-react";
import { RELATION_OPTIONS, type RelationType } from "@/lib/faceDatabase";

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, relation: RelationType) => Promise<boolean>;
  isProcessing?: boolean;
}

export const AddPersonModal = ({
  isOpen,
  onClose,
  onSave,
  isProcessing = false
}: AddPersonModalProps) => {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<RelationType>("Acquaintance");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError("Please enter a name");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const success = await onSave(trimmedName, relation);
      if (success) {
        setName("");
        setRelation("Acquaintance");
        onClose();
      } else {
        setError("Failed to save face. Please try again.");
      }
    } catch (err) {
      setError("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setRelation("Acquaintance");
    setError("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-surface/95 backdrop-blur-xl border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5 text-ios-blue" />
            Who is this?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter a name and relationship for the person in front of the camera.
            They will be recognized and announced with context next time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-foreground">
              Name
            </Label>
            <Input
              id="name"
              placeholder="Enter person's name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              autoFocus
              className="bg-background/50 border-glass-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Relationship Dropdown */}
          <div className="grid gap-2">
            <Label htmlFor="relation" className="text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Relationship
            </Label>
            <Select
              value={relation}
              onValueChange={(value) => setRelation(value as RelationType)}
              disabled={isSaving}
            >
              <SelectTrigger 
                id="relation"
                className="bg-background/50 border-glass-border text-foreground"
              >
                <SelectValue placeholder="Select relationship..." />
              </SelectTrigger>
              <SelectContent className="bg-surface border-glass-border z-[100]">
                {RELATION_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option} 
                    value={option}
                    className="text-foreground hover:bg-accent focus:bg-accent"
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-ios-red">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="border-glass-border text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="bg-ios-blue hover:bg-ios-blue/90 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Face"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
