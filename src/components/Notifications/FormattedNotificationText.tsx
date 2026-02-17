import { Fragment } from "react";

type FormattedElement = "div" | "p" | "span";

interface FormattedNotificationTextProps {
  text: string;
  className?: string;
  as?: FormattedElement;
}

const BOLD_SEGMENT_REGEX = /^\*\*[^*\n]+?\*\*$/;
const BOLD_SPLIT_REGEX = /(\*\*[^*\n]+?\*\*)/g;

export const FormattedNotificationText = ({
  text,
  className,
  as = "span",
}: FormattedNotificationTextProps) => {
  const Component = as;
  const segments = String(text || "").split(BOLD_SPLIT_REGEX);

  return (
    <Component className={className}>
      {segments.map((segment, index) => {
        if (!segment) return null;

        if (BOLD_SEGMENT_REGEX.test(segment)) {
          return <strong key={index}>{segment.slice(2, -2)}</strong>;
        }

        return <Fragment key={index}>{segment}</Fragment>;
      })}
    </Component>
  );
};

