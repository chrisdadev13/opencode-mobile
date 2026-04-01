import { Ionicons } from "@expo/vector-icons";
import type {
  QuestionAnswer,
  QuestionRequest,
} from "@opencode-ai/sdk/v2/client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

// ── Context ────────────────────────────────────────────────────────

interface QuestionContextValue {
  question: QuestionRequest;
  selections: string[][];
  customTexts: string[];
  toggleOption: (qIdx: number, label: string) => void;
  setCustomText: (qIdx: number, text: string) => void;
  hasAnswer: boolean;
}

const QuestionContext = createContext<QuestionContextValue | null>(null);

export const useQuestion = () => {
  const context = useContext(QuestionContext);
  if (!context) {
    throw new Error("Question sub-components must be used within <Question>");
  }
  return context;
};

// ── Question (root) ────────────────────────────────────────────────

export type QuestionProps = ViewProps & {
  question: QuestionRequest;
  onSubmit: (answers: QuestionAnswer[]) => void;
  onReject: () => void;
};

export function Question({
  question,
  onSubmit,
  onReject,
  children,
  className,
  ...props
}: QuestionProps) {
  const colors = useColors();
  const [selections, setSelections] = useState<string[][]>(
    question.questions.map(() => []),
  );
  const [customTexts, setCustomTexts] = useState<string[]>(
    question.questions.map(() => ""),
  );

  const toggleOption = useCallback(
    (qIdx: number, label: string) => {
      setSelections((prev) => {
        const updated = [...prev];
        const current = updated[qIdx]!;
        const isMultiple = question.questions[qIdx]?.multiple ?? false;

        if (isMultiple) {
          updated[qIdx] = current.includes(label)
            ? current.filter((l) => l !== label)
            : [...current, label];
        } else {
          updated[qIdx] = [label];
        }
        return updated;
      });
      setCustomTexts((prev) => {
        const updated = [...prev];
        updated[qIdx] = "";
        return updated;
      });
    },
    [question.questions],
  );

  const setCustomText = useCallback((qIdx: number, text: string) => {
    setCustomTexts((prev) => {
      const updated = [...prev];
      updated[qIdx] = text;
      return updated;
    });
    if (text.trim()) {
      setSelections((prev) => {
        const updated = [...prev];
        updated[qIdx] = [];
        return updated;
      });
    }
  }, []);

  const hasAnswer =
    selections.some((s) => s.length > 0) ||
    customTexts.some((t) => t.trim().length > 0);

  const contextValue = useMemo(
    () => ({
      question,
      selections,
      customTexts,
      toggleOption,
      setCustomText,
      hasAnswer,
    }),
    [question, selections, customTexts, toggleOption, setCustomText, hasAnswer],
  );

  return (
    <QuestionContext.Provider value={contextValue}>
      <View
        className={`mx-4 mb-4 px-4 py-3 ${className ?? ""}`}
        style={{
          backgroundColor: colors.surface,
          borderLeftWidth: 3,
          borderLeftColor: colors.pink,
        }}
        {...props}
      >
        {children ?? (
          <>
            {question.questions.map((q, qIdx) => (
              <View
                key={qIdx}
                style={{
                  marginBottom:
                    qIdx < question.questions.length - 1 ? 16 : 0,
                }}
              >
                <QuestionBody
                  header={q.header}
                  text={q.question}
                />
                <QuestionOptions qIdx={qIdx}>
                  {q.options.map((opt) => (
                    <QuestionOption
                      key={opt.label}
                      qIdx={qIdx}
                      label={opt.label}
                      description={opt.description}
                      multiple={q.multiple}
                    />
                  ))}
                </QuestionOptions>
                {q.custom !== false && (
                  <QuestionCustomInput qIdx={qIdx} />
                )}
              </View>
            ))}
            <QuestionActions>
              <QuestionAction
                label="Skip"
                variant="outline"
                onPress={onReject}
              />
              <QuestionAction
                label="Submit"
                variant="primary"
                onPress={() => {
                  if (!hasAnswer) return;
                  const answers: QuestionAnswer[] = selections.map((sel, i) => {
                    const custom = customTexts[i]?.trim();
                    if (custom) return [custom];
                    return sel;
                  });
                  onSubmit(answers);
                }}
              />
            </QuestionActions>
          </>
        )}
      </View>
    </QuestionContext.Provider>
  );
}

Question.displayName = "Question";

// ── QuestionBody ───────────────────────────────────────────────────

export type QuestionBodyProps = ViewProps & {
  header: string;
  text: string;
};

export function QuestionBody({ header, text, ...props }: QuestionBodyProps) {
  const colors = useColors();

  return (
    <View {...props}>
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 4,
        }}
      >
        {header}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 13,
          color: colors.muted,
          marginBottom: 10,
          lineHeight: 19,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

QuestionBody.displayName = "QuestionBody";

// ── QuestionOptions ────────────────────────────────────────────────

export type QuestionOptionsProps = ViewProps & {
  qIdx: number;
};

export function QuestionOptions({
  children,
  ...props
}: QuestionOptionsProps) {
  return (
    <View style={{ gap: 6 }} {...props}>
      {children}
    </View>
  );
}

QuestionOptions.displayName = "QuestionOptions";

// ── QuestionOption ─────────────────────────────────────────────────

export type QuestionOptionProps = ViewProps & {
  qIdx: number;
  label: string;
  description?: string;
  multiple?: boolean;
};

export function QuestionOption({
  qIdx,
  label,
  description,
  multiple = false,
  ...props
}: QuestionOptionProps) {
  const { selections, toggleOption } = useQuestion();
  const colors = useColors();
  const selected = selections[qIdx]?.includes(label);

  return (
    <Pressable
      onPress={() => toggleOption(qIdx, label)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.surfaceSecondary : "transparent",
        gap: 8,
      }}
      {...props}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: multiple ? 4 : 9,
          borderWidth: 2,
          borderColor: selected ? colors.accent : colors.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <Ionicons name="checkmark" size={12} color={colors.accent} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            fontWeight: "500",
            color: colors.text,
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 11,
              color: colors.muted,
              marginTop: 1,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

QuestionOption.displayName = "QuestionOption";

// ── QuestionCustomInput ────────────────────────────────────────────

export type QuestionCustomInputProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  qIdx: number;
};

export function QuestionCustomInput({
  qIdx,
  placeholder = "Or type a custom answer...",
  ...props
}: QuestionCustomInputProps) {
  const { customTexts, setCustomText } = useQuestion();
  const colors = useColors();

  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      value={customTexts[qIdx]}
      onChangeText={(text) => setCustomText(qIdx, text)}
      style={{
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontFamily: Fonts.sans,
        fontSize: 13,
        color: colors.text,
      }}
      {...props}
    />
  );
}

QuestionCustomInput.displayName = "QuestionCustomInput";

// ── QuestionActions ────────────────────────────────────────────────

export type QuestionActionsProps = ViewProps;

export function QuestionActions({
  children,
  ...props
}: QuestionActionsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }} {...props}>
      {children}
    </View>
  );
}

QuestionActions.displayName = "QuestionActions";

// ── QuestionAction ─────────────────────────────────────────────────

export type QuestionActionProps = ViewProps & {
  label: string;
  variant?: "outline" | "primary";
  onPress: () => void;
  disabled?: boolean;
};

export function QuestionAction({
  label,
  variant = "primary",
  onPress,
  disabled = false,
  ...props
}: QuestionActionProps) {
  const { hasAnswer } = useQuestion();
  const colors = useColors();

  const isPrimary = variant === "primary";
  const isDisabled = isPrimary ? !hasAnswer || disabled : disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={{
        flex: isPrimary ? 2 : 1,
        height: 38,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        opacity: isDisabled ? 0.4 : 1,
        ...(isPrimary
          ? {
              backgroundColor: hasAnswer
                ? colors.accent
                : colors.surfaceSecondary,
            }
          : {
              borderWidth: 1,
              borderColor: colors.border,
            }),
      }}
      {...props}
    >
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 13,
          fontWeight: "600",
          color: isPrimary
            ? hasAnswer
              ? colors.background
              : colors.muted
            : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

QuestionAction.displayName = "QuestionAction";
