import { invoke } from "@tauri-apps/api/tauri";

export const log = (text: string) => {
  invoke("log_fe_command", { log: text });
};
