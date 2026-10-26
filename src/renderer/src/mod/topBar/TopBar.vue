<!-- 标题栏 -->
<script lang="ts" setup>
import { LOGO_URL } from '@renderer/imageUrls';
import ImgDiv from '@renderer/components/ImgDiv.vue';
import SearcnSvg from '@renderer/components/svg/Search.vue';
import GearSvg from '@renderer/components/svg/Gear.vue';
import { ref, onBeforeUnmount, onMounted } from 'vue';
import { setContent } from '@renderer/mod/content/content';
import { SearchContents, Settings, BMusicAccountSettings } from '@renderer/mod/content/contentComponents';
import SyncSvg from '@renderer/components/svg/Sync.vue';
import CloudCheckSvg from '@renderer/components/svg/CloudCheck.vue';
import CloudSlashSvg from '@renderer/components/svg/CloudSlash.vue';
import ExclamationCrcleSvg from '@renderer/components/svg/ExclamationCrcle.vue';

import { getActiveBMusicAccount, onBMusicAccountChanged, type BMusicAccount } from '@renderer/ipcApi/ipcAccountSettings';

const searchValue = ref('');
const activeAccount = ref<BMusicAccount | null>(null);
const searchFocused = ref(false);

// Search history (最近10条)
const MAX_SEARCH_HISTORY = 10;
const searchHistory = ref<string[]>([]);
try {
    const saved = localStorage.getItem('bmusic-search-history');
    if (saved) searchHistory.value = JSON.parse(saved);
} catch { /* ignore */ }

function saveSearchHistory() {
    localStorage.setItem('bmusic-search-history', JSON.stringify(searchHistory.value));
}

async function loadActiveAccount() {
    activeAccount.value = await getActiveBMusicAccount() || null;
}

let unsubscribeAccountChanged: (() => void) | undefined;
const onWindowFocus = () => { void loadActiveAccount(); };

onMounted(() => {
    void loadActiveAccount();
    unsubscribeAccountChanged = onBMusicAccountChanged(() => {
        void loadActiveAccount();
    });
    window.addEventListener('focus', onWindowFocus);
});

onBeforeUnmount(() => {
    unsubscribeAccountChanged?.();
    window.removeEventListener('focus', onWindowFocus);
});

function search() {
    const keyword = searchValue.value.trim() || '音乐';
    // Add to history (remove duplicates, keep newest first)
    searchHistory.value = searchHistory.value.filter(h => h !== keyword);
    searchHistory.value.unshift(keyword);
    if (searchHistory.value.length > MAX_SEARCH_HISTORY) searchHistory.value.pop();
    saveSearchHistory();
    setContent(SearchContents, { keyword });
    searchFocused.value = false;
}

function selectHistory(keyword: string) {
    searchValue.value = keyword;
    search();
}

function clearHistory() {
    searchHistory.value = [];
    saveSearchHistory();
}

function onSearchFocus() {
    searchFocused.value = true;
}

function onSearchBlur() {
    // Delay to allow click events on dropdown
    setTimeout(() => { searchFocused.value = false; }, 200);
}

function openSettings() {
    setContent(Settings, {});
}

function openAccountSettings() {
    setContent(BMusicAccountSettings, {});
}
</script>
<template>
    <div class="top-bar">
        <div class="top-bar-title">
            <ImgDiv class="logo" :src="LOGO_URL"></ImgDiv>
            <div class="logo-title">Bmusic</div>
        </div>
        <div class="top-bar-btns">
            <!-- 搜索 -->
            <label class="search-box" for="top-bar-search-input">
                <input id="top-bar-search-input" class="search-input" type="text" placeholder="搜索" v-model="searchValue"
                    @keyup.enter="search" @focus="onSearchFocus" @blur="onSearchBlur" />
                <div class="search-icon" title="搜索" @click="search">
                    <SearcnSvg style="width: 100%; height: 100%;" />
                </div>
                <!-- 搜索历史下拉 -->
                <div class="search-history-dropdown" v-if="searchFocused && searchHistory.length > 0">
                    <div class="search-history-header">
                        <span>搜索历史</span>
                        <span class="search-history-clear" @mousedown.prevent="clearHistory">清空</span>
                    </div>
                    <div class="search-history-item" v-for="item of searchHistory" :key="item" @mousedown.prevent="selectHistory(item)">
                        {{ item }}
                    </div>
                </div>
            </label>
            <!-- 占空用 -->
            <div style="width: 0;flex: 1;"></div>
            <div class="right-button-grep">
                <!-- 同步 -->
                <div class="top-bar-button-and-text" title="同步">
                    <SyncSvg class="top-bar-button-icon" />
                    <CloudCheckSvg class="top-bar-button-icon" />
                    <CloudSlashSvg class="top-bar-button-icon" />
                    <ExclamationCrcleSvg class="top-bar-button-icon" />
                    <div class="top-bar-button-text">同步</div>
                </div>
                <!-- 账户 -->
                <div class="top-bar-avatar" title="多账号管理" @click="openAccountSettings">
                    <div class="avatar-circle">
                        {{ activeAccount ? activeAccount.name.charAt(0).toUpperCase() : 'B' }}
                    </div>
                </div>
                <!-- 设置 -->
                <div class="top-bar-button" title="设置" @click="openSettings">
                    <GearSvg class="top-bar-button-icon" />
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.right-button-grep {
    display: flex;
    align-items: center;
    gap: 0.2rem;
}

.top-bar-button-and-text:hover {
    color: var(--top-bar-button-hover-color);
    background-color: var(--top-bar-button-hover-bg-color);
}

.top-bar-button-and-text {
    position: relative;
    height: 2rem;
    cursor: pointer;
    color: var(--top-bar-button-color);
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0 0.5rem;
}

.top-bar-button-and-text .top-bar-button-icon {
    width: 1rem;
    height: 1rem;
}

.top-bar-button-and-text .top-bar-button-text {
    font-size: 0.8rem;
}


.top-bar-button .top-bar-button-icon {
    width: 50%;
    height: 50%;
    position: absolute;
    left: 25%;
    top: 25%;
}

.top-bar-button {
    position: relative;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    color: var(--top-bar-button-color);
    -webkit-app-region: no-drag;
}

.top-bar-button:hover {
    color: var(--top-bar-button-hover-color);
    background-color: var(--top-bar-button-hover-bg-color);
}

.top-bar-avatar {
    position: relative;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.2rem;
}
.top-bar-avatar .avatar-circle {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background-color: var(--color-primary, #ccc);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: bold;
    transition: transform 0.2s;
}
.top-bar-avatar:hover .avatar-circle {
    transform: scale(1.1);
}

.search-box:has(.search-input:focus) {
    border-color: var(--top-bar-search-box-border-color-focus);
}

.search-input {
    flex: 1;
    width: 0;
    background-color: transparent;
    border: none;
    outline: none;
    color: var(--top-bar-search-input-color);
    font-size: 0.8rem;
    height: 2rem;
}

.search-icon:hover {
    color: var(--top-bar-search-icon-hover-color);
}

.search-icon {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
    color: var(--top-bar-search-icon-color);
}

.search-box {
    display: flex;
    align-items: center;
    width: 20rem;
    height: 2rem;
    background-color: var(--top-bar-search-box-bg-color);
    border: 0.1rem solid var(--top-bar-search-box-border-color);
    border-radius: 0.5rem;
    margin-right: 1rem;
    cursor: text;
    -webkit-app-region: no-drag;
    padding: 0 0.5rem;
    position: relative;
}

.search-history-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--color-window-bg, #fff);
    border: 1px solid var(--top-bar-search-box-border-color);
    border-radius: 0.5rem;
    margin-top: 0.3rem;
    max-height: 15rem;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    scrollbar-width: thin;
}

.search-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    color: var(--color-nav-line-title, #999);
    border-bottom: 1px solid var(--top-bar-search-box-border-color);
}

.search-history-clear {
    cursor: pointer;
    color: var(--top-bar-search-icon-color, #999);
}

.search-history-clear:hover {
    color: var(--top-bar-search-icon-hover-color, #333);
}

.search-history-item {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--top-bar-search-input-color, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.search-history-item:hover {
    background-color: var(--color-nav-item-hover-bg, #f5f5f5);
}


.top-bar-btns {
    flex: 1;
    width: 0;
    margin-right: 9rem;
    margin-left: 1rem;
    display: flex;
    align-items: center;
}

.logo-title {
    font-size: 1rem;
    margin-left: 0.5rem;
    color: var(--top-bar-title-color);
    font-weight: bolder;
}

.logo {
    width: 1.5rem;
    height: 1.5rem;
    overflow: hidden;
    margin-left: 1.5rem;
    border-radius: 50%;
}

.top-bar-title {
    width: var(--left-vav-width);
    display: flex;
    align-items: center;
    font-size: 1.5rem;
    margin-top: 0.5rem;
}

.top-bar {
    position: fixed;
    display: flex;
    height: var(--top-bar-height);
    width: 100vw;
    left: 0;
    top: 0;
    -webkit-app-region: drag;
    /* background-color: rgba(183, 148, 218, 0.134); */
}
</style>
