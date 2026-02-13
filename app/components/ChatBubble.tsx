type ChatBubbleProps = {
  role: "assistant" | "user";
  text: string;
};

export default function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
