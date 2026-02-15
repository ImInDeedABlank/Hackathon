type ChatBubbleProps = {
  role: "assistant" | "user";
  text: string;
  onClick?: () => void;
  clickLabel?: string;
};

export default function ChatBubble({ role, text, onClick, clickLabel }: ChatBubbleProps) {
  const isUser = role === "user";
  const bubbleClass = `max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
    isUser ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
  }`;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${bubbleClass} cursor-pointer text-start transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500`}
          aria-label={clickLabel ?? "Read message aloud"}
          title={clickLabel ?? "Read message aloud"}
        >
          {text}
        </button>
      ) : (
        <div className={bubbleClass}>{text}</div>
      )}
    </div>
  );
}
