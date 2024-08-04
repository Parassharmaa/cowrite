import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/api/globalShortcut";
import { Command } from "@tauri-apps/api/shell";
import { getVersion } from "@tauri-apps/api/app";

const openAccessibilityPermission = async () => {
  return invoke("prompt_accessibility_permissions_command");
};

const log = (text: string) => {
  invoke("log_fe_command", { log: text });
};

const checkIfAccessibilityIsEnabled = async () => {
  return invoke("query_accessibility_permissions_command");
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

import "./App.css";

function App() {
  const paraphrase = async (text = null) => {
    if (text) {
      invoke("paraphrase_command", { text });
    }
  };

  const paraphraseRef = useRef<any>(null);

  const [isPermission, setIsPermission] = useState(true);

  const [appVersion, setAppVersion] = useState("");

  const getAppVersion = async () => {
    const version = await getVersion();
    setAppVersion(version);
  };

  const [keyRegistered, setKeyRegistered] = useState(false);

  const registerShortcut = async () => {
    try {
      await register("CommandOrControl+G", () => {
        invoke("paraphrase_command");
      });
      setKeyRegistered(true);
    } catch (error) {
      setKeyRegistered(true);
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

  const checkPermission = async () => {
    const isPermission = (await checkIfAccessibilityIsEnabled()) as boolean;

    setIsPermission(isPermission);
  };

  useEffect(() => {
    getAppVersion();
    checkPermission();
    registerShortcut();

    return () => {
      unregister("CommandOrControl+G");
    };
  }, []);

  useEffect(() => {
    paraphraseRef.current = paraphrase;
  }, [paraphrase]);

  return (
    <div>
      <div className="rounded-xl text-gray-300 bg-slate-700 h-[100vh]">
        <div className="h-8 w-full" data-tauri-drag-region />
        <div className="p-4 flex flex-col items-center gap-4 justify-center">
          <h2 className="text-3xl">
            CoWrite{"  "}
            <span
              style={{
                fontSize: 14,
                fontWeight: "normal",
              }}
            >
              v{appVersion}
            </span>
          </h2>

          <p>
            Press <kbd className="bg-slate-900 text-white px-2 py-1">cmd+g</kbd>{" "}
            {keyRegistered && isPermission ? "✅" : "❌"} to fix grammar and
            formatting mistakes in your text anywhere.
          </p>

          {!isPermission && (
            <div className="flex flex-col gap-2">
              <button
                className="bg-slate-900 rounded-2xl text-white px-4 py-2 shadow-md"
                onClick={async () => {
                  openAccessibilityPermission();
                }}
              >
                Grant Permission
              </button>
              <p
                style={{
                  fontSize: 12,
                }}
              >
                Please Re-open the app after granting the permission
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
