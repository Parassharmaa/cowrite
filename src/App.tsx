import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow, WebviewWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/api/globalShortcut";

import "./App.css";
import { log } from "./utils/log";
import RephraseActionPanel from "./components/RephraseActionPanel";
import { selectCurrentParagraph, writeText } from "./utils/osascript";
import MainPanel from "./components/MainPanel";

function App() {
  const registerShortcut = async () => {
    try {
      await register("CommandOrControl+G", async () => {
        await selectCurrentParagraph();
        await new Promise((resolve) => setTimeout(resolve, 200));
        invoke("paraphrase_command");
      });

      await register("CommandOrControl+U", async () => {
        log("opening advance rephrase window");

        try {
          const window = new WebviewWindow("update-phrase-panel");

          const isVisible = await window.isVisible();

          if (isVisible) {
            await window.hide();
          } else {
            const selectedText = await invoke(
              "copy_selected_to_clipboard_command"
            );

            if (!selectedText) {
              return;
            }
            await window.show();
            await window.setFocus();
          }

          window.listen("tauri://blur", () => {
            window.hide();
          });
        } catch (error) {
          log(`${error}`);
        }
      });
    } catch (error) {
      log(`${error}`);
    }
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
      unregister("CommandOrControl+U");
    };
  }, []);

  // add event on window on blur to close window
  useEffect(() => {
    appWindow.listen("tauri://blur", () => {
      appWindow.hide();
    });
  }, []);

  if (appWindow.label === "main") {
    return <MainPanel />;
  }

  if (appWindow.label === "update-phrase-panel") {
    return <RephraseActionPanel />;
  }
}

export default App;
