<script setup lang="ts">
import Nav from './mod/nav/Nav.vue';
import Content from './mod/content/Content.vue';
import { musicPlayer, musicPlayerSize } from './mod/playing/playing';
import Playing from './mod/playing/Playing.vue';
import TopBar from './mod/topBar/TopBar.vue';
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { playList, playListOpen, historyOpen } from './mod/playingList/playingList';
import { notifications } from './mod/notification/notification';
import { popUpComponents } from './mod/popUp/popUp';
import { toggleDesktopLyrics } from './storage/lyricsStorage';

const electron = window.electron;
const AsyncPlayingList = defineAsyncComponent(() => import('./mod/playingList/PlayingList.vue'));
const AsyncHistoryList = defineAsyncComponent(() => import('./mod/playingList/HistoryList.vue'));
const AsyncNotification = defineAsyncComponent(() => import('./mod/notification/Notification.vue'));
const AsyncPopUp = defineAsyncComponent(() => import('./mod/popUp/PopUp.vue'));

const hasLoadedPlayListPanel = ref(false);
const hasLoadedHistoryPanel = ref(false);
const hasLoadedNotificationLayer = ref(false);
const hasLoadedPopUpLayer = ref(false);

const notificationCount = computed(() => Object.keys(notifications).length);
const popUpCount = computed(() => popUpComponents.length);

watch(playListOpen, (isOpen) => {
    if (isOpen) {
        hasLoadedPlayListPanel.value = true;
    }
}, { immediate: true });

watch(historyOpen, (isOpen) => {
    if (isOpen) {
        hasLoadedHistoryPanel.value = true;
    }
}, { immediate: true });

watch(notificationCount, (count) => {
    if (count > 0) {
        hasLoadedNotificationLayer.value = true;
    }
}, { immediate: true });

watch(popUpCount, (count) => {
    if (count > 0) {
        hasLoadedPopUpLayer.value = true;
    }
}, { immediate: true });

// ============ SYSTEM MEDIA CONTROLS (SMTC) ============
// Update MediaSession metadata when current music changes
watch(() => musicPlayer.currentMusic, (music) => {
    if (!('mediaSession' in navigator) || !music) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: music.musicName || 'BMusic',
        artist: music.musicAuthor || '',
        artwork: music.iconUrl ? [{ src: music.iconUrl, sizes: '512x512', type: 'image/jpeg' }] : []
    });
}, { immediate: true });

// Sync playback state
watch(() => musicPlayer.playing, (playing) => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
});

// Register action handlers
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => musicPlayer.requestPlay());
    navigator.mediaSession.setActionHandler('pause', () => musicPlayer.requestPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playList.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playList.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
            musicPlayer.requestCurrentTime(details.seekTime * 1000);
        }
    });
}

onMounted(() => {
    // Apply saved theme
    const bright = localStorage.getItem('bmusic-bright') || 'light';
    const accent = localStorage.getItem('bmusic-accent') || 'orange';
    document.documentElement.setAttribute('data-theme', `${bright}-${accent}`);

    // Auto-register saved shortcuts on app startup
    if (electron?.ipcRenderer) {
        try {
            const saved = localStorage.getItem('bmusic-shortcuts');
            if (saved) {
                const shortcuts = JSON.parse(saved) as { id: string; keys: string }[];
                const mapped = shortcuts.filter(s => s.keys).map(s => ({ id: s.id, keys: s.keys }));
                if (mapped.length > 0) {
                    electron.ipcRenderer.invoke('settings__registerShortcuts', mapped);
                }
            }
        } catch (e) {
            console.warn('[Shortcuts] Failed to auto-register:', e);
        }

        // Listen for shortcut triggers from main process
        electron.ipcRenderer.on('settings__shortcutTriggered', (_event: any, id: string) => {
            switch (id) {
                case 'play-pause':
                    if (musicPlayer.playing) musicPlayer.requestPause();
                    else musicPlayer.requestPlay();
                    break;
                case 'prev':
                    playList.prev();
                    break;
                case 'next':
                    playList.next();
                    break;
                case 'vol-up':
                    musicPlayer.requestVolume(Math.min(1, musicPlayer.volume + 0.1));
                    break;
                case 'vol-down':
                    musicPlayer.requestVolume(Math.max(0, musicPlayer.volume - 0.1));
                    break;
                case 'lyrics-toggle':
                    toggleDesktopLyrics();
                    break;
            }
        });
    }
});

</script>

<template>
  <div class="main">
    <!-- 闊充箰椤甸潰 -->
    <div class="main-box">
      <Nav class="nav"></Nav>
      <Content class="content"></Content>
      <TopBar v-if="musicPlayerSize == 'bottom'" />
    </div>
    <!-- 涓嬫柟鎾斁鍣ㄤ富浣?-->
    <Playing v-if="musicPlayer.currentMusic" class="main-music-player" />
    <!-- 鍙充晶鎾斁鍒楄〃 -->
    <AsyncPlayingList v-if="hasLoadedPlayListPanel" />
    <!-- 鍙充晶鎾斁鍘嗗彶 -->
    <AsyncHistoryList v-if="hasLoadedHistoryPanel" />

    <!-- 寮瑰嚭缁勪欢 -->
    <AsyncPopUp v-if="hasLoadedPopUpLayer" />

    <!-- 娑堟伅寮瑰嚭妗?-->
    <AsyncNotification v-if="hasLoadedNotificationLayer" />

  </div>
</template>

<style scoped>
.content {
  flex: 1;
  width: 0;
}

.nav,
.content {
  display: flex;
  flex-direction: column;
}

.main {
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--color-window-bg);
}

.main-box {
  display: flex;
  flex-direction: row;
  height: 100vh;
  align-items: stretch;
}

.main:has(.main-music-player) .main-box {
  height: calc(100vh - var(--button-player-height));
}
</style>
