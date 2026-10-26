<script setup lang="ts">
import { computed, onMounted, ref, Ref, watch } from 'vue';
import { type MusicPlayerLink } from '../musicPlayers';
import { usePlayerLifecycle } from '../usePlayerLifecycle';
import { EmoMusicData, paresEmoMusicData } from './emoMusic';
import { song_url_v1, SoundQualityType, lyric } from "./emoApi";

const props = defineProps<{
    musicPlayerLink: MusicPlayerLink,
}>();

type ParseYrc = typeof import('@lrc-player/parse').parseYrc;
type ParsedLyrics = ReturnType<ParseYrc>;
type ColorThiefCtor = typeof import('colorthief').default;

let parseYrcPromise: Promise<ParseYrc> | undefined;
let colorThiefPromise: Promise<ColorThiefCtor> | undefined;

function loadParseYrc() {
    parseYrcPromise ??= import('@lrc-player/parse').then((module) => module.parseYrc);
    return parseYrcPromise;
}

function loadColorThief() {
    colorThiefPromise ??= import('colorthief').then((module) => module.default);
    return colorThiefPromise;
}

const the_song = ref<string>('');
const musicPlayerLink = props.musicPlayerLink;
const musicData: Ref<EmoMusicData> = computed(() => paresEmoMusicData(musicPlayerLink.currentMusicData));
const lifecycle = usePlayerLifecycle();

// Add failsafe timeout for song loading
const loadTimeout = lifecycle.setManagedTimeout(() => {
    console.error('[EmoMusicPlayer] Timeout loading song URL');
    musicPlayerLink.updateLoading(false);
    musicPlayerLink.updatePlaying(false);
}, 3000);

song_url_v1({ id: musicData.value.id, level: SoundQualityType.standard }).then((res) => {
    lifecycle.clearManagedTimeout(loadTimeout);
    if (lifecycle.isDestroyed()) {
        return;
    }
    if (res?.body?.data?.[0]?.url) {
        musicPlayerLink.updateDuration(res.body.data[0].time);
        the_song.value = res.body.data[0].url;
    } else {
        musicPlayerLink.updateLoading(false);
        musicPlayerLink.updatePlaying(false);
    }
}).catch((err) => {
    lifecycle.clearManagedTimeout(loadTimeout);
    if (lifecycle.isDestroyed()) {
        return;
    }
    console.error('[EmoMusicPlayer] Failed to load song URL', err);
    musicPlayerLink.updateLoading(false);
    musicPlayerLink.updatePlaying(false);
});

const playing = ref(true);
const the_url = ref<HTMLImageElement | null>(null);
const audio = ref<HTMLAudioElement | null>(null);

musicPlayerLink.updateContrMaxDisplay({
    type: 'fixed',
    progressShow: 'top',
    isShwoNusicName: false,
    extraClass: 'emo-music-player-max-extra',
});

// 播放
const offRequestPlay = musicPlayerLink.onRequestPlay(() => {
    playing.value = true;
    audio.value?.play();
});

// 暂停
const offRequestPause = musicPlayerLink.onRequestPause(() => {
    playing.value = false;
    audio.value?.pause();
});

// 设置音量
const offRequestVolume = musicPlayerLink.onRequestVolume((volume: number) => {
    if (!audio.value) {
        return;
    }
    audio.value.volume = volume;
});

// 播放当前位置
const offRequestCurrentTime = musicPlayerLink.onRequestCurrentTime((currentTime: number) => {
    if (!audio.value) {
        return;
    }
    audio.value.currentTime = currentTime / 1000;
});

const c1 = ref("");
const c2 = ref("");

const currentTime = ref(0);
const onAudioTimeUpdate = () => {
    if (!audio.value) {
        return;
    }
    currentTime.value = audio.value.currentTime;
    musicPlayerLink.updateCurrentTime(audio.value.currentTime * 1000);
};

const onAudioEnded = () => {
    musicPlayerLink.updatePlaying(false);
    musicPlayerLink.updateEnded(true);
    playing.value = false;
};

const onAudioPlay = () => {
    musicPlayerLink.updatePlaying(true);
    musicPlayerLink.updateEnded(false);
    playing.value = true;
};

const onAudioPause = () => {
    musicPlayerLink.updatePlaying(false);
    playing.value = false;
};

const onAudioVolumeChange = () => {
    if (!audio.value) {
        return;
    }
    musicPlayerLink.updateVolume(audio.value.volume);
};

const onAudioCanPlay = () => {
    musicPlayerLink.updateLoading(false);
    if (playing.value) {
        audio.value?.play();
    }
};

onMounted(() => {
    lifecycle.addCleanup(offRequestPlay);
    lifecycle.addCleanup(offRequestPause);
    lifecycle.addCleanup(offRequestVolume);
    lifecycle.addCleanup(offRequestCurrentTime);

    const audioElement = audio.value;
    if (!audioElement) {
        return;
    }

    audioElement.addEventListener('timeupdate', onAudioTimeUpdate);
    audioElement.addEventListener('ended', onAudioEnded);
    audioElement.addEventListener('play', onAudioPlay);
    audioElement.addEventListener('pause', onAudioPause);
    audioElement.addEventListener('volumechange', onAudioVolumeChange);
    audioElement.addEventListener('canplay', onAudioCanPlay);

    lifecycle.addCleanup(() => {
        audioElement.removeEventListener('timeupdate', onAudioTimeUpdate);
        audioElement.removeEventListener('ended', onAudioEnded);
        audioElement.removeEventListener('play', onAudioPlay);
        audioElement.removeEventListener('pause', onAudioPause);
        audioElement.removeEventListener('volumechange', onAudioVolumeChange);
        audioElement.removeEventListener('canplay', onAudioCanPlay);
    });

    lifecycle.addCleanup(() => {
        audioElement.pause();
        audioElement.src = '';
    });

    audioElement.volume = musicPlayerLink.volume;
    scrollToCurrentLyric();
});

// 实现背景色的渐变，必须等待图片加载完毕再调用，否则可能死循环或抛出异常锁死主线程
const onImageLoad = async () => {
    try {
        const imageElement = the_url.value;
        if (!imageElement) return;

        const ColorThief = await loadColorThief();
        if (lifecycle.isDestroyed() || the_url.value !== imageElement) {
            return;
        }

        const colorThief = new ColorThief();
        const colors = colorThief.getPalette(imageElement, 2);
        if (colors && colors.length >= 2) {
            const [c11, c22] = colors.map((c) => `rgb(${c[0]},${c[1]},${c[2]})`);
            c1.value = c11;
            c2.value = c22;
        }
    } catch (e) {
        console.error('[EmoMusicPlayer] Failed to extract palette', e);
    }
};

// 左下框的宽度
musicPlayerLink.updateButtomWidth("5.5rem");


//-----------------------------------歌词-----------------------------------
// 获取歌词
const parsedLyrics = ref<ParsedLyrics>([]);

const lyricTimeout = lifecycle.setManagedTimeout(() => {
    console.error('[EmoMusicPlayer] Timeout loading lyrics');
}, 3000);

lyric({ id: musicData.value.id }).then(async (res) => {
    lifecycle.clearManagedTimeout(lyricTimeout);
    if (lifecycle.isDestroyed()) {
        return;
    }
    if (res?.body?.lrc?.lyric) {
        const parseYrc = await loadParseYrc();
        if (lifecycle.isDestroyed()) {
            return;
        }
        parsedLyrics.value = parseYrc(res.body.lrc.lyric);
    }
}).catch((err) => {
    lifecycle.clearManagedTimeout(lyricTimeout);
    if (lifecycle.isDestroyed()) {
        return;
    }
    console.error('[EmoMusicPlayer] Failed to load lyrics', err);
});

function findCurrentLyricIndex(time: number) {
    const lyrics = parsedLyrics.value;
    if (lyrics.length === 0) {
        return -1;
    }

    let left = 0;
    let right = lyrics.length - 1;
    let answer = -1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (lyrics[mid].time <= time) {
            answer = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return answer;
}

const currentIndex = computed(() => findCurrentLyricIndex(currentTime.value));

// 滚动条和歌词高亮的适配
const scrollToCurrentLyric = () => {
    const currentLyricElement = document.querySelector('.li_son.color_or_fontsize');
    if (currentLyricElement) {
        const container = document.querySelector('.div_dad');
        if (container) {
            const containerHeight = container.clientHeight;
            const elementOffsetTop = (currentLyricElement as HTMLElement).offsetTop;
            container.scrollTo({
                top: elementOffsetTop - containerHeight / 1.75,
                behavior: 'smooth'
            });
        }
    }
};

// 歌词点击事件
const updateCurrentTime = (time: number) => {
    musicPlayerLink.updateCurrentTime(time * 1000);
    if (audio.value) {
        audio.value.currentTime = time;
    }
    // 立马滚动到当前歌词
    scrollToCurrentLyric();
};

watch(currentIndex, (idx) => {
    scrollToCurrentLyric();
    // Send to desktop lyrics overlay
    if (idx >= 0 && idx < parsedLyrics.value.length) {
        const text = parsedLyrics.value[idx].text;
        window.electron?.ipcRenderer.invoke('desktop-lyrics-update-text', text);
    }
});

</script>
<template>
    <div class="all">
        <audio :src="the_song" ref="audio"></audio>
        <img class="main" :class="[{ playing: playing }, musicPlayerLink.musicPlayerSize]"
            :src="musicPlayerLink.currentMusic?.iconUrl" ref="the_url" @load="onImageLoad">
        </img>
        <div v-if="musicPlayerLink.musicPlayerSize == 'max'" class="max-paper">
            <div class="big-left">
                <div class="song_left">
                    <div>
                        <div class="song_name">
                            {{ musicPlayerLink.currentMusic?.musicName }}
                        </div>
                        <div class="song_infor">
                            <div>
                                专辑: {{ musicData.album }}
                            </div>
                            <div>
                                歌手: {{ musicPlayerLink.currentMusic?.musicAuthor }}
                            </div>
                        </div>
                    </div>
                    <div id="song-context" class="div_dad">
                        <ul class="ul_dad">
                            <li v-for="text, index of parsedLyrics" class="li_son"
                                :class="{ 'color_or_fontsize': currentIndex == index }"
                                @click="updateCurrentTime(text.time)">
                                {{ text.text }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>
<style scoped>
.song_left {
    width: 60%;
}

.li_son.color_or_fontsize {
    color: white;
    font-size: 1.5rem;
    transition: color 0.3s, font-size 0.3s;
    white-space: normal;
    word-break: break-word;
    text-align: center;
}

.li_son {
    font-size: 1rem;
    transition: color 0.3s, font-size 0.3s;
    color: gray;
}

.li_son:hover {
    color: white;
    cursor: pointer;
}

.div_dad {
    overflow: scroll;
    height: 25rem;
    scrollbar-width: none;
    margin-top: 20px;
}

.ul_dad {
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    list-style: none;
    gap: 1rem;
}

.song_infor {
    font-weight: bold;
    display: flex;
    gap: 0.8rem;
    color: gray;
    margin-top: 0.7rem;
    font-size: 0.9rem;
    justify-content: center;
}

.song_name {
    color: rgb(236, 236, 236);
    font-size: 1.5rem;
    display: flex;
    justify-content: center;
}

.big-left {
    height: 100%;
    padding-left: 29rem;
    white-space: nowrap;
    display: flex;
    align-items: center
}

.all {
    width: 100%;
    height: 100%;
}

.main.max {
    width: 20rem;
    height: 20rem;
    left: 5rem;
    top: calc(50% - 10rem);
}

.main {
    border: 10px solid black;
    /* Add a black border */
    box-sizing: border-box;
    /* Ensure the border is included in the element's total width and height */
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    animation: rotate 15s linear infinite;
    animation-play-state: paused;
    position: absolute;
    left: 1.7rem;
    top: calc(50% - 2rem);
    transition: all 0.25s;
}



.main.playing {
    animation-play-state: running;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.max-paper {
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, v-bind("c1"), v-bind("c2"));
    ;
    /* display: flex;
    align-items: center;
    justify-content: center; */
}
</style>
<style>
.emo-music-player-max-extra {
    --color-primary-button-small: #ffffff7f;
    --color-primary-button-small-hover: #ffffffa6;

    /* 播放器左下角按钮颜色 */
    --color-music-player-user-button: var(--color-primary-button-small);
    --color-music-player-user-button-hover: var(--color-primary-button-small-hover);

    /* 播放器右下角按钮颜色 */
    --color-music-player-right-button: var(--color-primary-button-small);
    --color-music-player-right-button-hover: var(--color-primary-button-small-hover);

    /* 播放器暂停播放按钮颜色 */
    --color-contr-play-btn: #ffffff18;
    --color-contr-play-btn-hover: #ffffff3b;
    /* 中间文字颜色 */
    --color-contr-play-btn-text: #ffffff;
    /* 上一首和下一首按钮颜色 */
    --color-contr-prev-next-btn: var(--color-primary-button-small);
    --color-contr-prev-next-btn-hover: var(--color-primary-button-small-hover);
    /* 播放顺序按钮颜色 */
    --color-contr-play-mode-btn: var(--color-primary-button-small);
    --color-contr-play-mode-btn-hover: var(--color-primary-button-small-hover);
    /* 全部的喜欢按钮 */
    --color-pay-list-favorite-icon: var(--color-primary-button-small);
    --color-pay-list-favorite-icon-hover: var(--color-primary-button-small-hover);
    --color-pay-list-favorite-icon-liked: var(--color-primary);
    --color-pay-list-favorite-icon-liked-hover: var(--color-primary2);

    /* 进度条显示在上方时，右边显示的时间 */
    --color-music-player-right-time: var(--color-primary-button-small);
}
</style>
