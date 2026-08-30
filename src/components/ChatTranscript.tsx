/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { TranscriptMessage } from '../types';
import { Bot, User, Sparkles, CloudRain, Trash2, CheckCircle2, Zap } from 'lucide-react';

interface ChatTranscriptProps {
  messages: TranscriptMessage[];
  onClear: () => void;
  isThinking?: boolean;
}

export function ChatTranscript({ messages, onClear, isThinking = false }: ChatTranscriptProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isThinking]);

  return (
    <div
      id="home-ai-transcript-container"
      className="w-full rounded-2xl bg-[#121212]/90 border border-stone-800 backdrop-blur-md flex flex-col h-[360px] sm:h-[400px] overflow-hidden shadow-xl"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950/60">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-stone-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300 font-mono">
            Activity Log
          </h3>
          <span className="text-xs font-mono text-stone-500">
            ({messages.length})
          </span>
        </div>
        {messages.length > 0 && (
          <button
            id="clear-transcript-btn"
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Clear Chat Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Clear</span>
          </button>
        )}
      </div>

      {/* Messages List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
            <Sparkles className="w-8 h-8 text-stone-600 mb-2" />
            <p className="text-sm font-medium text-stone-300">No interaction logs yet</p>
            <p className="text-xs text-stone-500 max-w-xs mt-1">
              Hold the Push-to-Talk button above or pick a sample command to interact with your smart home.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isSystem
                        ? 'bg-stone-800 text-stone-200 border border-stone-700'
                        : 'bg-stone-900 text-stone-300 border border-stone-800'
                    }`}
                  >
                    {isSystem ? <CloudRain className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-800 text-stone-100 border border-stone-700 rounded-tr-sm shadow-md'
                      : isSystem
                      ? 'bg-stone-900/90 text-stone-200 border border-stone-700 rounded-tl-sm'
                      : 'bg-stone-950/90 text-stone-300 border border-stone-800 rounded-tl-sm'
                  }`}
                >
                  {/* Sender label and timestamp */}
                  <div className="flex items-center justify-between gap-3 mb-1 text-[11px]">
                    <span
                      className={`font-semibold font-mono ${
                        isUser
                          ? 'text-stone-200'
                          : isSystem
                          ? 'text-stone-300'
                          : 'text-stone-400'
                      }`}
                    >
                      {isUser ? 'You' : isSystem ? 'KeepSafe Automation' : 'KeepSafe AI'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">{msg.timestamp}</span>
                  </div>

                  {/* Message body */}
                  <p className="whitespace-pre-wrap font-normal">{msg.text}</p>

                  {/* Device updates badge if applicable */}
                  {msg.deviceUpdates && Object.keys(msg.deviceUpdates).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-800 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                      <span className="font-mono text-stone-500">Applied:</span>
                      {Object.entries(msg.deviceUpdates).map(([room, updates]) => (
                        <span
                          key={room}
                          className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 font-mono text-[10px] text-stone-300"
                        >
                          {room}: {Object.keys(updates as object).join(', ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.type === 'preference' && (
                    <div className="mt-2 pt-1.5 border-t border-stone-800 flex items-center gap-1 text-[11px] text-stone-300">
                      <Zap className="w-3.5 h-3.5 text-stone-300" />
                      <span>Automation rule saved to Preferences</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-stone-800 text-stone-200 border border-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            );
          })
        )}

        {/* Lightweight AI Thinking / Processing Indicator Bubble */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex gap-2.5 justify-start items-center"
          >
            <div className="w-7 h-7 rounded-full bg-stone-900 text-stone-300 border border-stone-800 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-stone-950/90 border border-stone-800 rounded-tl-sm flex items-center gap-2">
              <span className="text-[11px] font-mono text-stone-400 font-medium">KeepSafe AI</span>
              <div className="flex items-center gap-1 ml-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
