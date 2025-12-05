"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { parseMarkdown } from "@/utils/chatbot/markdown";
import type { Message } from "@/utils/chatbot/types";
import { cn } from "@/lib/utils";

type ChatbotMessagesProps = {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  focusedImage: string | null;
  onImageFocus: (image: string | null) => void;
};

export function ChatbotMessages({
  messages,
  messagesEndRef,
  messagesContainerRef,
  onScroll,
  focusedImage,
  onImageFocus,
}: ChatbotMessagesProps) {
  return (
    <>
      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm">AI</span>
              </div>
            )}
            <div
              className={cn(
                "rounded-lg px-4 py-2 max-w-[80%]",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.image && (
                <div className="mb-2">
                  <img
                    src={message.image}
                    alt="Attached"
                    className="max-w-full max-h-48 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onImageFocus(message.image!)}
                  />
                </div>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {parseMarkdown(message.content)}
              </div>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-sm text-primary-foreground">U</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Focus Dialog */}
      <Dialog open={!!focusedImage} onOpenChange={() => onImageFocus(null)}>
        <DialogContent className="max-w-[95vw] w-fit max-h-[95vh]">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {focusedImage && (
            <img
              src={focusedImage}
              alt="Focused"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

