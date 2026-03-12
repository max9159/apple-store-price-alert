import { getStatePaths, readLatestRunArtifact } from "./state.ts";
import { formatTelegramSendError, sendTelegramMessage, validateTelegramConfig } from "./telegram.ts";

async function main(): Promise<void> {
  const paths = getStatePaths();
  const latestArtifact = await readLatestRunArtifact(paths.latestJsonFile);

  if (!latestArtifact.shouldNotify) {
    process.stdout.write("Telegram skipped because latest report has shouldNotify=false.\n");
    return;
  }

  const config = validateTelegramConfig(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);

  try {
    await sendTelegramMessage({
      token: config.token,
      chatId: config.chatId,
      text: latestArtifact.telegramMessage,
    });
    process.stdout.write("Telegram message sent.\n");
  } catch (error) {
    throw new Error(formatTelegramSendError(error));
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
