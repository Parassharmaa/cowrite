import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";

const openAccessibilityPermission = async () => {
  return invoke("prompt_accessibility_permissions_command");
};

const checkIfAccessibilityIsEnabled = async () => {
  return invoke("query_accessibility_permissions_command");
};

const MainPanel = () => {
  const [isPermission, setIsPermission] = useState(true);

  const [appVersion, setAppVersion] = useState("");

  const getAppVersion = async () => {
    const version = await getVersion();
    setAppVersion(version);
  };

  const checkPermission = async () => {
    const isPermission = (await checkIfAccessibilityIsEnabled()) as boolean;

    setIsPermission(isPermission);
  };

  useEffect(() => {
    getAppVersion();
    checkPermission();
  }, []);

  return (
    <div>
      <div className="rounded-lg text-gray-300 bg-slate-700 h-[100vh]">
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

          <p className="text-center">
            Press <kbd className="bg-slate-900 text-white px-2 py-1">cmd+g</kbd>{" "}
            {isPermission ? "✅" : "❌"} to fix grammar and formatting mistakes
            in your text anywhere.
            <br />
            <br />
            Use <kbd className="bg-slate-900 text-white px-2 py-1">
              cmd+u
            </kbd>{" "}
            for advanced rephrasing.
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
};

export default MainPanel;
