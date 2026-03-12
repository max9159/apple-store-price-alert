import { toErrorMessage } from "./utils.ts";

export function splitTelegramMessage(text: string, maxLength = 3900): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const blocks = text.split("\n\n");
  let currentChunk = "";

  for (const block of blocks) {
    const candidate = currentChunk ? `${currentChunk}\n\n${block}` : block;
    if (candidate.length <= maxLength) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    if (block.length <= maxLength) {
      currentChunk = block;
      continue;
    }

    let remaining = block;
    while (remaining.length > maxLength) {
      const slice = remaining.slice(0, maxLength);
      const splitAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
      const cutIndex = splitAt > Math.floor(maxLength / 2) ? splitAt : maxLength;
      chunks.push(remaining.slice(0, cutIndex).trimEnd());
      remaining = remaining.slice(cutIndex).trimStart();
    }

    currentChunk = remaining;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function sendTelegramMessage(options: {
  token: string;
  chatId: string;
  text: string;
}): Promise<void> {
  const messages = splitTelegramMessage(options.text);

  for (const message of messages) {
    const response = await fetch(`https://api.telegram.org/bot${options.token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: options.chatId,
        disable_web_page_preview: true,
        parse_mode: "HTML",
        text: message,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API error ${response.status}: ${body}`);
    }
  }
}

export function validateTelegramConfig(token: string | undefined, chatId: string | undefined): {
  token: string;
  chatId: string;
} {
  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
  }

  return {
    token,
    chatId,
  };
}

export function formatTelegramSendError(error: unknown): string {
  return toErrorMessage(error);
}

