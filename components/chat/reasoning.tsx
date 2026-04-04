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

export type ReasoningProps = ViewProps & {
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

  useEffect(() => {
    if (isStreaming && !isOpen && !isExplicitlyClosed) {
      setIsOpen(true);
    }
  }, [isStreaming, isOpen, setIsOpen, isExplicitlyClosed]);

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

export type ReasoningTriggerProps = ViewProps;

export const ReasoningTrigger = memo(function ReasoningTrigger(
  props: ReasoningTriggerProps,
) {
  const { isStreaming, isOpen, duration } = useReasoning();
  const colors = useColors();

  return (
    <CollapsibleTrigger>
      <View className="flex-row items-center mb-1" style={{ gap: 6 }} {...props}>
        {isStreaming ? (
          <Shimmer
            style={{
              fontFamily: Fonts.mono,
              fontSize: 13,
              fontStyle: "italic",
              fontWeight: "600",
              color: colors.accent,
            }}
          >
            Thinking:
          </Shimmer>
        ) : (
          <Text
            style={{
              fontFamily: Fonts.mono,
              fontSize: 13,
              fontStyle: "italic",
              fontWeight: "600",
              color: colors.accent,
            }}
          >
            Thinking:
          </Text>
        )}
        {duration !== undefined && (
          <Text
            style={{
              fontFamily: Fonts.mono,
              fontSize: 11,
              color: colors.muted,
            }}
          >
            {duration}s
          </Text>
        )}
        <Ionicons
          name={isOpen ? "chevron-down" : "chevron-forward"}
          size={12}
          color={colors.muted}
        />
      </View>
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
        className="ml-1 pl-2"
        style={{ borderLeftWidth: 2, borderLeftColor: colors.muted }}
        {...props}
      >
        {children ?? (
          <Text
            style={{
              fontFamily: Fonts.mono,
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
