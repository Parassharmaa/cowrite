import { invoke } from "@tauri-apps/api/tauri";
import { hideWindow } from "../utils/osascript";
import { useState, useEffect } from "react";

const paraphraseTypes = ["shorten", "professional", "friendly", "detailed"];

const ActionListItem = ({
  type,
  isSelected,
  onClick,
}: {
  type: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer my-1 capitalize hover:bg-slate-500 flex justify-normal gap-1 items-center ${
        isSelected ? "bg-slate-500" : ""
      }`}
    >
      <p className="py-1 px-2">{type}</p>
    </div>
  );
};

const RephraseActionPanel = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      setSelectedIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : paraphraseTypes.length - 1
      );
    } else if (e.key === "ArrowDown") {
      setSelectedIndex((prevIndex) =>
        prevIndex < paraphraseTypes.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === "Enter") {
      hideWindow();
      invoke("paraphrase_action_command", {
        action: paraphraseTypes[selectedIndex],
      });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex]);

  return (
    <div className="flex overflow-hidden rounded-lg h-[100vh] gap-1 flex-col bg-slate-700 py-2 text-white">
      <div>
        <div
          className="h-8 w-full absolute left-0 right-0 top-0"
          data-tauri-drag-region
        />
        <p className="text-base px-2 pb-2 font-medium border-b-slate-300 border-b-[1px]">
          Rephrase
        </p>
      </div>
      <div className="overflow-auto my-1">
        {paraphraseTypes.map((type, index) => (
          <ActionListItem
            key={index}
            type={type}
            isSelected={index === selectedIndex}
            onClick={() => {
              invoke("paraphrase_action_command", {
                action: type,
              });
              hideWindow();
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default RephraseActionPanel;
