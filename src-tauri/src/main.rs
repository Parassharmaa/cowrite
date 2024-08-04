#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use get_selected_text;
use macos_accessibility_client;
use reqwest::Client;
use serde_json::json;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayMenu};
use tokio;

async fn paraphrase(
    window: tauri::Window,
    _app_handle: tauri::AppHandle,
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
fn log_fe_command(log: &str) -> String {
    println!("FE: {}", log);
    String::from("done")
}

#[tauri::command]
#[cfg(target_os = "macos")]
fn query_accessibility_permissions_command() -> bool {
    let trusted = macos_accessibility_client::accessibility::application_is_trusted();
    return trusted;
}

#[tauri::command]
#[cfg(target_os = "macos")]
fn prompt_accessibility_permissions_command() -> bool {
    let trusted = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();

    return trusted;
}

#[tauri::command]
fn paraphrase_command(window: tauri::Window, app_handle: tauri::AppHandle) -> String {
    let text = get_selected_text::get_selected_text().unwrap_or(String::from(""));

    println!("Selected Text: {}", text);

    if text.is_empty() {
        return String::from("");
    }

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(paraphrase(window, app_handle, &text)).unwrap();
    String::from("done")
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit CoWrite");

    let tray_menu = SystemTrayMenu::new().add_item(quit);

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
        .setup(|app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            Ok(())
        })
        .on_system_tray_event(|app, event| match event {
            tauri::SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                }
            }
            tauri::SystemTrayEvent::RightClick { .. } => {
                println!("system tray received a right click");
            }
            tauri::SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            paraphrase_command,
            log_fe_command,
            prompt_accessibility_permissions_command,
            query_accessibility_permissions_command
        ])
        .build(tauri::generate_context!())
        .expect("Error while building tauri application")
        .run(|__app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        })
}
