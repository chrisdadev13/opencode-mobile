import { createContext, useContext, useMemo } from "react";
import { Pressable, type ViewProps } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useControllableState } from "@/hooks/use-controllable-state";

// ── Context ────────────────────────────────────────────────────────

interface CollapsibleContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export const useCollapsible = () => {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error(
      "Collapsible sub-components must be used within <Collapsible>",
    );
  }
  return context;
};

// ── Collapsible (root) ─────────────────────────────────────────────

export type CollapsibleProps = ViewProps & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen }),
    [isOpen, setIsOpen],
  );

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <Animated.View layout={LinearTransition.duration(200)} {...props}>
        {children}
      </Animated.View>
    </CollapsibleContext.Provider>
  );
}

// ── CollapsibleTrigger ─────────────────────────────────────────────

export type CollapsibleTriggerProps = ViewProps & {
  onPress?: () => void;
};

export function CollapsibleTrigger({
  onPress,
  children,
  ...props
}: CollapsibleTriggerProps) {
  const { isOpen, setIsOpen } = useCollapsible();

  return (
    <Pressable
      onPress={() => {
        setIsOpen(!isOpen);
        onPress?.();
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
}

// ── CollapsibleContent ─────────────────────────────────────────────

export type CollapsibleContentProps = ViewProps;

export function CollapsibleContent({
  children,
  ...props
}: CollapsibleContentProps) {
  const { isOpen } = useCollapsible();

  if (!isOpen) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

Collapsible.displayName = "Collapsible";
CollapsibleTrigger.displayName = "CollapsibleTrigger";
CollapsibleContent.displayName = "CollapsibleContent";
