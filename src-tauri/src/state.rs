use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub running: Mutex<bool>,
}
