import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

type Segment = {
  text: string;
  bold: boolean;
};

function parseBoldSegments(input: string): Segment[] {
  if (!input) return [{ text: "", bold: false }];

  const segments: Segment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text: input, bold: false }];
}

interface MarkdownTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
}

export function MarkdownText({ text, style, boldStyle }: MarkdownTextProps) {
  const segments = parseBoldSegments(text);

  return (
    <Text style={style}>
      {segments.map((segment, idx) => (
        <Text key={`${idx}-${segment.text}`} style={segment.bold ? boldStyle : undefined}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

