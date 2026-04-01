import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text, View, type ViewProps } from "react-native";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  type CollapsibleProps,
} from "@/components/ui/collapsible";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Fonts } from "@/constants/theme";
import type { ReasoningPartType } from "./chat-utils";
import { Shimmer } from "./shimmer";
import { useColors } from "./use-colors";

// ── Context ────────────────────────────────────────────────────────

interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning sub-components must be used within <Reasoning>");
  }
  return context;
};

// ── Reasoning (root) ───────────────────────────────────────────────

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export type ReasoningProps = Omit<CollapsibleProps, "open" | "onOpenChange"> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

export const Reasoning = memo(function Reasoning({
  isStreaming = false,
  open,
  defaultOpen,
  onOpenChange,
  duration: durationProp,
  children,
  ...props
}: ReasoningProps) {
  const resolvedDefaultOpen = defaultOpen ?? isStreaming;
  const isExplicitlyClosed = defaultOpen === false;

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    prop: open,
    defaultProp: resolvedDefaultOpen,
    onChange: onOpenChange,
  });

  const [duration, setDuration] = useControllableState<number | undefined>({
    defaultProp: undefined,
    prop: durationProp,
  });

  const hasEverStreamedRef = useRef(isStreaming);
  const [hasAutoClosed, setHasAutoClosed] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // Track when streaming starts and compute duration
  useEffect(() => {
    if (isStreaming) {
      hasEverStreamedRef.current = true;
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
    } else if (startTimeRef.current !== null) {
      setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
      startTimeRef.current = null;
    }
  }, [isStreaming, setDuration]);

  // Auto-open when streaming starts
  useEffect(() => {
    if (isStreaming && !isOpen && !isExplicitlyClosed) {
      setIsOpen(true);
    }
  }, [isStreaming, isOpen, setIsOpen, isExplicitlyClosed]);

  // Auto-close when streaming ends (once only)
  useEffect(() => {
    if (
      hasEverStreamedRef.current &&
      !isStreaming &&
      isOpen &&
      !hasAutoClosed
    ) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasAutoClosed(true);
      }, AUTO_CLOSE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isOpen, setIsOpen, hasAutoClosed]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setIsOpen(newOpen);
    },
    [setIsOpen],
  );

  const contextValue = useMemo(
    () => ({ isStreaming, isOpen, setIsOpen, duration }),
    [isStreaming, isOpen, setIsOpen, duration],
  );

  return (
    <ReasoningContext.Provider value={contextValue}>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange} {...props}>
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
});

Reasoning.displayName = "Reasoning";

// ── ReasoningTrigger ───────────────────────────────────────────────

export type ReasoningTriggerProps = ViewProps & {
  children?: React.ReactNode;
};

export const ReasoningTrigger = memo(function ReasoningTrigger({
  children,
  ...props
}: ReasoningTriggerProps) {
  const { isStreaming, isOpen, duration } = useReasoning();
  const colors = useColors();

  const label = isStreaming
    ? undefined // will use Shimmer
    : duration !== undefined
      ? `${duration}s`
      : null;

  return (
    <CollapsibleTrigger>
      {children ?? (
        <View
          className="flex-row items-center mb-1"
          style={{ gap: 6 }}
          {...props}
        >
          <Ionicons name="bulb-outline" size={14} color={colors.muted} />
          {isStreaming ? (
            <Shimmer
              style={{
                fontFamily: Fonts.sans,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Thinking...
            </Shimmer>
          ) : (
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 13,
                fontWeight: "600",
                color: colors.muted,
              }}
            >
              Thinking
            </Text>
          )}
          {label && (
            <Text
              style={{
                fontFamily: Fonts.mono,
                fontSize: 11,
                color: colors.muted,
              }}
            >
              {label}
            </Text>
          )}
          <Ionicons
            name={isOpen ? "chevron-down" : "chevron-forward"}
            size={12}
            color={colors.muted}
          />
        </View>
      )}
    </CollapsibleTrigger>
  );
});

ReasoningTrigger.displayName = "ReasoningTrigger";

// ── ReasoningContent ───────────────────────────────────────────────

export type ReasoningContentProps = ViewProps & {
  text?: string;
};

export const ReasoningContent = memo(function ReasoningContent({
  text,
  children,
  ...props
}: ReasoningContentProps) {
  const colors = useColors();

  return (
    <CollapsibleContent>
      <View
        className="mt-1 ml-1 pl-2"
        style={{ borderLeftWidth: 2, borderLeftColor: colors.border }}
        {...props}
      >
        {children ?? (
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontStyle: "italic",
              color: colors.muted,
              lineHeight: 20,
            }}
            selectable
          >
            {text}
          </Text>
        )}
      </View>
    </CollapsibleContent>
  );
});

ReasoningContent.displayName = "ReasoningContent";

// ── Convenience: ReasoningPart ─────────────────────────────────────
// Drop-in replacement that renders from a ReasoningPartType

export type ReasoningPartProps = ViewProps & {
  part: ReasoningPartType;
};

export function ReasoningPart({ part, ...props }: ReasoningPartProps) {
  const duration =
    part.time?.end && part.time?.start
      ? Math.ceil((part.time.end - part.time.start) / 1000)
      : undefined;

  return (
    <Reasoning duration={duration} {...props}>
      <ReasoningTrigger />
      {part.text ? <ReasoningContent text={part.text} /> : null}
    </Reasoning>
  );
}

ReasoningPart.displayName = "ReasoningPart";
