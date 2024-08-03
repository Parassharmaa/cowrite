#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde_json::json;
use tauri::{CustomMenuItem, Icon, Manager, SystemTray, SystemTrayMenu, SystemTrayMenuItem};
use tokio;

async fn paraphrase(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    text: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // make http request on https://src-worker.sleek.workers.dev/paraphrase get the streaming text

    let client = Client::new();

    let response = client
        .post("https://src-worker.sleek.workers.dev/paraphrase")
        .header("Content-Type", "application/json")
        .body(json!({ "text": text }).to_string())
        .send()
        .await?;

    let phrase = response.text().await?;

    println!("{}", phrase);

    window.emit("paraphrased-response", phrase)?;

    Ok(())
}

#[tauri::command]
fn paraphrase_command(window: tauri::Window, app_handle: tauri::AppHandle, text: &str) -> String {
    println!("{}", text);

    if text.is_empty() {
        return String::from("");
    }

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(paraphrase(window, app_handle, text)).unwrap();
    String::from("done")
}

fn main() {
    let hide = CustomMenuItem::new("toggle_visibility".to_string(), "Hide");

    let quit = CustomMenuItem::new("quit".to_string(), "Quit CoWrite");

    let tray_menu = SystemTrayMenu::new()
        .add_item(quit)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(hide);

    let tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }

            _ => {}
        })
        .system_tray(tray)
        .setup(|app| Ok(app.set_activation_policy(tauri::ActivationPolicy::Accessory)))
        .on_system_tray_event(|app, event| match event {
            tauri::SystemTrayEvent::LeftClick { .. } => {
                println!("system tray received a left click");
            }
            tauri::SystemTrayEvent::RightClick { .. } => {
                println!("system tray received a right click");
            }
            tauri::SystemTrayEvent::MenuItemClick { id, .. } => {
                let item_handle = app.tray_handle().get_item(&id);

                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "toggle_visibility" => {
                        let window = app.get_window("main").unwrap();
                        if window.is_visible().unwrap() {
                            window.hide().unwrap();
                            item_handle.set_title("Show").unwrap();
                        } else {
                            window.show().unwrap();
                            item_handle.set_title("Hide").unwrap();
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![paraphrase_command])
        .build(tauri::generate_context!())
        .expect("Error while building tauri application")
        .run(|__app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        })
}
