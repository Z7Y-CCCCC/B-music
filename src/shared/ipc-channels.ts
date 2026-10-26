// Shared IPC channel name constants — used by both main and renderer processes.
// Centralising these prevents typo-induced bugs and enables compile-time checks.

// ── Bilibili API ──
export const IPC_BILIBILI_GET_PRELOAD_PLAYER = 'ipcBilibiliApi__getPreloadJsFilePath_BilibiliMusicPlayer' as const;
export const IPC_BILIBILI_GET_PRELOAD_SEARCH = 'ipcBilibiliApi__getPreloadJsFilePath_BilibiliMusicSearch' as const;
export const IPC_BILIBILI_GET_USER_INFO = 'ipcBilibiliApi__getUserInfo' as const;
export const IPC_BILIBILI_GET_FAVORITE_LIST = 'ipcBilibiliApi__getFavoriteList' as const;
export const IPC_BILIBILI_GET_FAVORITE_DETAIL = 'ipcBilibiliApi__getFavoriteDetail' as const;

// ── Playlist API ──
export const IPC_PLAYLIST_GET = 'ipcPlayListsApi__getPlaylist' as const;
export const IPC_PLAYLIST_SET_INDEX = 'ipcPlayListsApi__setPlaylistIndex' as const;
export const IPC_PLAYLIST_RENAME = 'ipcPlayListsApi__renamePlaylist' as const;
export const IPC_PLAYLIST_SAVE_DATA = 'ipcPlayListsApi__savePlaylistData' as const;
export const IPC_PLAYLIST_READ_DATA = 'ipcPlayListsApi__readPlaylistData' as const;
export const IPC_PLAYLIST_DELETE = 'ipcPlayListsApi__deletePlaylist' as const;
export const IPC_PLAYLIST_READ_ICON = 'ipcPlayListsApi__readPlaylistIconUrl' as const;
export const IPC_PLAYLIST_SAVE_ICON = 'ipcPlayListsApi__savePlaylistIcon' as const;

// ── Netease Cloud Music API ──
export const IPC_NETEASE_LOGIN = 'NeteaseCloudMusic_login' as const;
export const IPC_NETEASE_SEARCH = 'NeteaseCloudMusic_search' as const;
export const IPC_NETEASE_SONG_URL = 'NeteaseCloudMusic_song_url_v1' as const;
export const IPC_NETEASE_LYRIC = 'NeteaseCloudMusic_lyric' as const;
export const IPC_NETEASE_CLOUD_SEARCH = 'NeteaseCloudMusic_cloudSearch' as const;
export const IPC_NETEASE_PERSONALIZED = 'NeteaseCloudMusic_personalized' as const;
export const IPC_NETEASE_RECOMMEND = 'NeteaseCloudMusic_recommend_songs' as const;
export const IPC_NETEASE_TOP_PLAYLIST = 'NeteaseCloudMusic_top_playlist' as const;
export const IPC_NETEASE_PLAYLIST_DETAIL = 'NeteaseCloudMusic_playlist_detail' as const;
export const IPC_NETEASE_USER_ACCOUNT = 'NeteaseCloudMusic_user_account' as const;
export const IPC_NETEASE_USER_LIKELIST = 'NeteaseCloudMusic_user_likelist' as const;
export const IPC_NETEASE_USER_PLAYLIST = 'NeteaseCloudMusic_user_playlist' as const;
export const IPC_NETEASE_SONG_DETAIL = 'NeteaseCloudMusic_song_detail' as const;

// ── Account Settings ──
export const IPC_CHECK_BILIBILI_LOGIN = 'check-bilibili-login' as const;
export const IPC_GET_BILIBILI_PROFILE = 'get-bilibili-profile' as const;
export const IPC_LOGOUT_BILIBILI = 'logout-bilibili' as const;
export const IPC_CHECK_NETEASE_LOGIN = 'check-netease-login' as const;
export const IPC_GET_NETEASE_PROFILE = 'get-netease-profile' as const;
export const IPC_LOGOUT_NETEASE = 'logout-netease' as const;
export const IPC_GET_ACCOUNTS = 'get-bmusic-accounts' as const;
export const IPC_GET_ACTIVE_ACCOUNT = 'get-active-bmusic-account' as const;
export const IPC_CREATE_ACCOUNT = 'create-bmusic-account' as const;
export const IPC_DELETE_ACCOUNT = 'delete-bmusic-account' as const;
export const IPC_SWITCH_ACCOUNT = 'switch-bmusic-account' as const;

// ── System Settings ──
export const IPC_SETTINGS_GET_CLOSE_ACTION = 'settings__getCloseAction' as const;
export const IPC_SETTINGS_SET_CLOSE_ACTION = 'settings__setCloseAction' as const;
export const IPC_SETTINGS_GET_AUTO_STARTUP = 'settings__getAutoStartup' as const;
export const IPC_SETTINGS_SET_AUTO_STARTUP = 'settings__setAutoStartup' as const;
export const IPC_SETTINGS_SET_HW_ACCEL = 'settings__setHardwareAcceleration' as const;
export const IPC_SETTINGS_GET_CACHE_SIZE = 'settings__getCacheSize' as const;
export const IPC_SETTINGS_CLEAR_CACHE = 'settings__clearCache' as const;
export const IPC_SETTINGS_GET_DATA_PATH = 'settings__getDataPath' as const;
export const IPC_SETTINGS_OPEN_DATA_PATH = 'settings__openDataPath' as const;
export const IPC_SETTINGS_GET_APP_VERSION = 'settings__getAppVersion' as const;
export const IPC_SETTINGS_GET_ELECTRON_VERSION = 'settings__getElectronVersion' as const;
export const IPC_SETTINGS_REGISTER_SHORTCUTS = 'settings__registerShortcuts' as const;
export const IPC_SETTINGS_UNREGISTER_SHORTCUTS = 'settings__unregisterAllShortcuts' as const;
export const IPC_SETTINGS_WINDOW_CLOSE = 'settings__windowClose' as const;
export const IPC_SETTINGS_WINDOW_SHOW = 'settings__windowShow' as const;
export const IPC_SETTINGS_RESTART_APP = 'settings__restartApp' as const;
export const IPC_SETTINGS_SHORTCUT_TRIGGERED = 'settings__shortcutTriggered' as const;

// ── Desktop Lyrics ──
export const IPC_LYRICS_SHOW = 'desktop-lyrics-show' as const;
export const IPC_LYRICS_HIDE = 'desktop-lyrics-hide' as const;
export const IPC_LYRICS_UPDATE_TEXT = 'desktop-lyrics-update-text' as const;
export const IPC_LYRICS_UPDATE_STYLE = 'desktop-lyrics-update-style' as const;
export const IPC_LYRICS_SET_LOCK = 'desktop-lyrics-set-lock' as const;
export const IPC_LYRICS_SET_TOPMOST = 'desktop-lyrics-set-topmost' as const;
export const IPC_LYRICS_LOCK = 'desktop-lyrics-lock' as const;
export const IPC_LYRICS_IS_OPEN = 'desktop-lyrics-is-open' as const;
export const IPC_LYRICS_ACTION = 'desktop-lyrics-action' as const;
export const IPC_LYRICS_PLAYING_STATE = 'desktop-lyrics-playing-state-sync' as const;
export const IPC_LYRICS_GET_BOUNDS = 'desktop-lyrics-get-bounds' as const;
export const IPC_LYRICS_SET_BOUNDS = 'desktop-lyrics-set-bounds' as const;
