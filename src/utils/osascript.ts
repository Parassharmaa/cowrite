import { Command } from "@tauri-apps/api/shell";
import { log } from "./log";

export const hideWindow = async () => {
  const script =
    'tell application "System Events" to keystroke "h" using {command down}';

  const command = new Command("osascript", ["-e", script]);

  command.on("error", (error) => {
    console.error("error", error);
  });

  command.on("close", (error) => {
    log(`Command exited with code ${error.code}`);
  });

  command.stderr.on("data", (data) => {
    log(`Error ${data}`);
  });

  command.stdout.on("data", (data) => {
    log(`stdout ${data}`);
  });

  await command.execute();

  return true;
};

export const writeText = async (text: string) => {
  const script = `
      set volume alert volume 0
      tell application "System Events"
          set the clipboard to "${text}"
          keystroke "v" using {command down}
          delay 0.2
      end tell
      set currentVol to alert volume of (get volume settings)
    `;

  const command = new Command("osascript", ["-e", script]);

  command.on("error", (error) => {
    console.error("error", error);
  });

  command.on("close", (error) => {
    log(`Command exited with code ${error.code}`);
  });

  command.stderr.on("data", (data) => {
    log(`Error ${data}`);
  });

  command.stdout.on("data", (data) => {
    log(`stdout ${data}`);
  });

  await command.execute();
};
