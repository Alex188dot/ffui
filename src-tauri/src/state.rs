use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub running: Mutex<bool>,
    pub cancel_requested: Mutex<bool>,
    pub current_pid: Mutex<Option<u32>>,
}
