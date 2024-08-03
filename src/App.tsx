import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/api/globalShortcut";
import { Command } from "@tauri-apps/api/shell";

const getHighlightedText = async () => {
  const script = `
    tell application "System Events"
        keystroke "c" using {command down}
    end tell

    delay 0.2

    set highlightedText to the clipboard
    return highlightedText
  `;

  const command = new Command("osascript", ["-e", script]);

  command.on("error", (error) => {
    console.error("error", error);
  });

  command.on("close", (data) => {
    console.log(`Command exited with code ${data.code}`);
  });

  command.stderr.on("data", (data) => {
    console.log("Error", data);
  });

  const child = await command.execute();

  return child.stdout.trim();
};

const writeText = async (text: string) => {
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
    console.log(`Command exited with code ${error.code}`);
  });

  command.stderr.on("data", (data) => {
    console.log("Error", data);
  });

  await command.execute();
};

import "./App.css";

function App() {
  const paraphrase = async (text = null) => {
    if (text) {
      invoke("paraphrase_command", { text });
    }
  };

  const paraphraseRef = useRef<any>(null);

  const registerShortcut = async () => {
    await register("CommandOrControl+G", async () => {
      const text = await getHighlightedText();
      if (!text) return;
      paraphraseRef.current(text);
    });
  };

  useEffect(() => {
    const rustyPipe = appWindow.listen("paraphrased-response", (event) => {
      if (!event.payload) return;

      let payload = (event.payload as string).replace(/"/g, '\\"');
      writeText(payload);
    });

    return () => {
      rustyPipe.then((dispose) => dispose());
    };
  }, []);

  useEffect(() => {
    registerShortcut();

    return () => {
      unregister("CommandOrControl+G");
    };
  }, []);

  useEffect(() => {
    paraphraseRef.current = paraphrase;
  }, [paraphrase]);

  return (
    <div className="container">
      <h1>CoWrite!</h1>

      <p>
        Press <kbd>cmd+G </kbd>
        to fix grammar and formatting mistakes in your text anywhere.
      </p>
    </div>
  );
}

export default App;
