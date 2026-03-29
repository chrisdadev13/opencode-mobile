import { Ionicons } from "@expo/vector-icons";
import type {
  QuestionAnswer,
  QuestionRequest,
} from "@opencode-ai/sdk/v2/client";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "./use-colors";

export function QuestionCard({
  question,
  onReply,
  onReject,
}: {
  question: QuestionRequest;
  onReply: (answers: QuestionAnswer[]) => void;
  onReject: () => void;
}) {
  const colors = useColors();
  const [selections, setSelections] = useState<string[][]>(
    question.questions.map(() => []),
  );
  const [customTexts, setCustomTexts] = useState<string[]>(
    question.questions.map(() => ""),
  );

  const toggleOption = (qIdx: number, label: string) => {
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
  };

  const hasAnswer =
    selections.some((s) => s.length > 0) ||
    customTexts.some((t) => t.trim().length > 0);

  const handleSubmit = () => {
    if (!hasAnswer) return;
    const answers: QuestionAnswer[] = selections.map((sel, i) => {
      const custom = customTexts[i]?.trim();
      if (custom) return [custom];
      return sel;
    });
    onReply(answers);
  };

  return (
    <View
      className="mx-4 mb-4 rounded-xl px-4 py-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {question.questions.map((q, qIdx) => (
        <View
          key={qIdx}
          style={{
            marginBottom: qIdx < question.questions.length - 1 ? 16 : 0,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {q.header}
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
            {q.question}
          </Text>

          {/* Options */}
          <View style={{ gap: 6 }}>
            {q.options.map((opt) => {
              const selected = selections[qIdx]?.includes(opt.label);
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => toggleOption(qIdx, opt.label)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected
                      ? colors.surfaceSecondary
                      : "transparent",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: q.multiple ? 4 : 9,
                      borderWidth: 2,
                      borderColor: selected ? colors.accent : colors.muted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.accent}
                      />
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
                      {opt.label}
                    </Text>
                    {opt.description ? (
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 11,
                          color: colors.muted,
                          marginTop: 1,
                        }}
                      >
                        {opt.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Custom input */}
          {q.custom !== false && (
            <TextInput
              placeholder="Or type a custom answer..."
              placeholderTextColor={colors.muted}
              value={customTexts[qIdx]}
              onChangeText={(text) => {
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
              }}
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
            />
          )}
        </View>
      ))}

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={onReject}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: colors.muted,
            }}
          >
            Skip
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!hasAnswer}
          style={{
            flex: 2,
            height: 38,
            borderRadius: 8,
            backgroundColor: hasAnswer
              ? colors.accent
              : colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
            opacity: hasAnswer ? 1 : 0.4,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 13,
              fontWeight: "600",
              color: hasAnswer ? colors.background : colors.muted,
            }}
          >
            Submit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
