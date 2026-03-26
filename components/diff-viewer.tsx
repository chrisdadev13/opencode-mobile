import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type DiffViewerProps = {
  content: string;
  filename: string;
};

function parseDiff(raw: string) {
  const lines = raw.split("\n");
  const result: {
    type: "hunk" | "add" | "del" | "ctx" | "header";
    text: string;
    oldNum?: number;
    newNum?: number;
  }[] = [];

  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (
      line.startsWith("Index:") ||
      line.startsWith("===") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      result.push({ type: "header", text: line });
    } else if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      if (match) {
        oldLine = parseInt(match[1]!, 10);
        newLine = parseInt(match[2]!, 10);
        result.push({ type: "hunk", text: line });
      }
    } else if (line.startsWith("+")) {
      result.push({ type: "add", text: line.slice(1), newNum: newLine });
      newLine++;
    } else if (line.startsWith("-")) {
      result.push({ type: "del", text: line.slice(1), oldNum: oldLine });
      oldLine++;
    } else if (line.startsWith("\\")) {
      // "\ No newline at end of file"
      continue;
    } else {
      const ctx = line.startsWith(" ") ? line.slice(1) : line;
      result.push({ type: "ctx", text: ctx, oldNum: oldLine, newNum: newLine });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(
  parsed: ReturnType<typeof parseDiff>,
  filename: string,
  dark: boolean
) {
  const t = dark
    ? {
        bg: "#0d1117",
        text: "#e6edf3",
        border: "#30363d",
        hunkBg: "#161b22",
        hunkText: "#8b949e",
        addBg: "rgba(46,160,67,0.15)",
        addGutter: "rgba(46,160,67,0.3)",
        addHighlight: "rgba(46,160,67,0.4)",
        addText: "#3fb950",
        delBg: "rgba(248,81,73,0.15)",
        delGutter: "rgba(248,81,73,0.3)",
        delHighlight: "rgba(248,81,73,0.4)",
        delText: "#f85149",
        lineNum: "#484f58",
        headerBg: "#161b22",
        headerText: "#e6edf3",
        ctxText: "#e6edf3",
      }
    : {
        bg: "#F8F8F8",
        text: "#1f2328",
        border: "#d1d9e0",
        hunkBg: "#ddf4ff",
        hunkText: "#656d76",
        addBg: "#dafbe1",
        addGutter: "#aceebb",
        addHighlight: "#abf2bc",
        addText: "#116329",
        delBg: "#ffebe9",
        delGutter: "#ffcecb",
        delHighlight: "#ff8182",
        delText: "#82071e",
        lineNum: "#636c76",
        headerBg: "#f6f8fa",
        headerText: "#1f2328",
        ctxText: "#1f2328",
      };

  const rows = parsed
    .map((l) => {
      if (l.type === "header") return "";
      if (l.type === "hunk") {
        return `<tr class="hunk"><td colspan="3">${escapeHtml(l.text)}</td></tr>`;
      }
      const old = l.type === "del" || l.type === "ctx" ? l.oldNum ?? "" : "";
      const neu = l.type === "add" || l.type === "ctx" ? l.newNum ?? "" : "";
      const cls = l.type;
      const sign =
        l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
      return `<tr class="${cls}"><td class="ln">${old}</td><td class="ln">${neu}</td><td class="code"><span class="sign">${sign}</span>${escapeHtml(l.text)}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:${t.bg}; font-family:-apple-system,BlinkMacSystemFont,'SF Mono',Menlo,monospace; font-size:12px; color:${t.text}; -webkit-text-size-adjust:none; }
.file-header { background:${t.headerBg}; color:${t.headerText}; padding:8px 12px; font-size:13px; font-weight:600; border-bottom:1px solid ${t.border}; position:sticky; top:0; z-index:1; }
table { width:100%; border-collapse:collapse; }
tr.hunk td { background:${t.hunkBg}; color:${t.hunkText}; padding:4px 12px; font-size:11px; border-top:1px solid ${t.border}; border-bottom:1px solid ${t.border}; }
td.ln { width:1px; min-width:40px; padding:0 8px; text-align:right; color:${t.lineNum}; user-select:none; -webkit-user-select:none; vertical-align:top; font-size:11px; line-height:20px; }
td.code { padding:0 12px; white-space:pre-wrap; word-break:break-all; line-height:20px; }
.sign { display:inline-block; width:12px; user-select:none; -webkit-user-select:none; }
tr.add { background:${t.addBg}; }
tr.add td.ln { background:${t.addGutter}; color:${t.addText}; }
tr.add td.code { color:${t.addText}; }
tr.del { background:${t.delBg}; }
tr.del td.ln { background:${t.delGutter}; color:${t.delText}; }
tr.del td.code { color:${t.delText}; }
tr.ctx td.code { color:${t.ctxText}; }
</style>
</head>
<body>
<div class="file-header">${escapeHtml(filename)}</div>
<table>${rows}</table>
</body>
</html>`;
}

export function DiffViewer({ content, filename }: DiffViewerProps) {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  const html = useMemo(() => {
    const parsed = parseDiff(content);
    return buildHtml(parsed, filename, dark);
  }, [content, filename, dark]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: "transparent", opacity: 0.99 }}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        originWhitelist={["*"]}
        overScrollMode="always"
      />
    </View>
  );
}
