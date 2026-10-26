<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import OverWatchLoading from '@renderer/components/OverWatchLoading.vue';
import { setContent } from '@renderer/mod/content/content';
import { PlayListContentsNoLoc } from '@renderer/mod/content/contentComponents';
import { playlist_detail } from '@renderer/mod/musicPlayers/emoMusicPlayer/emoApi';
import { paresEmoMusicDataToString } from '@renderer/mod/musicPlayers/emoMusicPlayer/emoMusic';
import type { MusicPlayListOnLoc } from '@renderer/storage/playListStorage';
import type { Music } from '@renderer/mod/playing/playing';

const loading = ref(true);
const playlists = ref<any[]>([]);

onMounted(async () => {
    // 移除之前的网易云推荐歌单请求，直接将加载状态设为 false
    loading.value = false;
});

async function openPlaylist(item: any) {
    loading.value = true;
    try {
        const res = await playlist_detail({ id: item.id });
        if (res.body.code === 200) {
            const playlistData = res.body.playlist;
            const songs = playlistData.tracks;
            const musicList: Music[] = songs.map((song: any) => ({
                iconUrl: song.al.picUrl,
                musicName: song.name,
                musicAuthor: song.ar.map((a: any) => a.name).join('/'),
                playerName: "EmoMusic",
                playerData: paresEmoMusicDataToString({ id: song.id, album: song.al.name }),
            }));

            const listData: MusicPlayListOnLoc = {
                name: playlistData.name,
                description: playlistData.description,
                iconUrl: playlistData.coverImgUrl,
                author: playlistData.creator?.nickname,
                authorIconUrl: playlistData.creator?.avatarUrl,
                list: musicList
            };
            setContent(PlayListContentsNoLoc, { musicPlayList: listData });
        }
    } catch (e) {
        console.error('Failed to load playlist detail', e);
    } finally {
        loading.value = false;
    }
}
</script>
<template>
    <div class="recommend">
        <OverWatchLoading :visible="loading" />
        <div v-if="!loading" class="playlist-grid">
            <h2 class="title">推荐歌单</h2>
            <div class="grid-container">
                <div v-for="item in playlists" :key="item.id" class="playlist-card" @click="openPlaylist(item)">
                    <div class="card-img-wrapper">
                        <img :src="item.picUrl" class="card-img" alt="cover" />
                        <div class="card-play-icon">▶️</div>
                    </div>
                    <div class="card-title">{{ item.name }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.recommend {
    height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: thin;
    padding: 1rem;
    position: relative;
}

.title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: var(--universal-search-item-text-color);
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1.5rem;
}

.playlist-card {
    cursor: pointer;
    transition: transform 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.playlist-card:hover {
    transform: scale(1.05);
}

.playlist-card:hover .card-play-icon {
    opacity: 1;
}

.card-img-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.card-play-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    background: rgba(0,0,0,0.3);
    opacity: 0;
    transition: opacity 0.2s;
    border-radius: 0.75rem;
}

.card-title {
    font-size: 0.9rem;
    color: var(--universal-search-item-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
}
</style>
