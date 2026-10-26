<!-- 闊充箰鍒楄〃琛ㄥ崟 -->
<script setup lang="ts">
import { musicKey, musicPlayer, type Music } from '@renderer/mod/playing/playing';
import PlaySvg from '@renderer/components/svg/Play.vue';
import PauseSvg from '@renderer/components/svg/Pause.vue';
import AddMusicCollectionSvg from '@renderer/components/svg/AddMusicCollection.vue';
import FavoriteButton from './FavoriteButton.vue';
import PlayerInfoTag from './PlayerInfoTag.vue';
import ImgDiv from './ImgDiv.vue';
import { computed, nextTick, onBeforeUnmount, h, reactive, ref, watch, type CSSProperties, type Component } from 'vue';
import { AddToPlayList } from '@renderer/mod/popUp/popUpComponents';
import { openPopUpComponent } from '@renderer/mod/popUp/popUp';
import { playList } from '@renderer/mod/playingList/playingList';
import { showContextMenu, type MenuItem } from '@renderer/utils/contextMenu';

type CustomButton = {
    icon: Component,
    title?: string,
    style?: false | null | string | CSSProperties,
    onClick?: (index: number) => void
}
const props = defineProps<{
    // 闊充箰鍒楄〃
    list: Music[],
    // replace current play list when playing from this list
    replacePlayList?: boolean,
    // extra action buttons per row
    customButtons?: CustomButton[],
    // enable drag sorting
    dragSort?: boolean,
    // callback after drag sorting changed
    onMusicOrderChange?: (newList: Music[]) => void,
}>();


// 鐐瑰嚮鎾斁鎸夐挳,鎾斁闊充箰
const currentPlayingMusicKey = computed(() => musicKey(musicPlayer.currentMusic));
const INITIAL_RENDER_COUNT = 200;
const RENDER_CHUNK_SIZE = 200;
const renderedCount = ref(0);
const loadMoreSentinel = ref<HTMLElement | null>(null);
let loadMoreObserver: IntersectionObserver | undefined;

const shouldProgressiveRender = computed(() => !props.dragSort && props.list.length > INITIAL_RENDER_COUNT);
const displayList = computed(() => {
    if (!shouldProgressiveRender.value) {
        return props.list;
    }
    return props.list.slice(0, renderedCount.value);
});
const hasMoreRows = computed(() => shouldProgressiveRender.value && renderedCount.value < props.list.length);

function isCurrentMusic(music: Music) {
    return currentPlayingMusicKey.value === musicKey(music);
}

function isCurrentPlaying(music: Music) {
    return isCurrentMusic(music) && musicPlayer.playing;
}

function resetRenderedCount() {
    renderedCount.value = shouldProgressiveRender.value
        ? Math.min(INITIAL_RENDER_COUNT, props.list.length)
        : props.list.length;
}

function appendRenderChunk() {
    if (!shouldProgressiveRender.value) {
        return;
    }
    renderedCount.value = Math.min(props.list.length, renderedCount.value + RENDER_CHUNK_SIZE);
}

function destroyLoadMoreObserver() {
    loadMoreObserver?.disconnect();
    loadMoreObserver = undefined;
}

function setupLoadMoreObserver() {
    destroyLoadMoreObserver();
    if (!hasMoreRows.value || !loadMoreSentinel.value || typeof IntersectionObserver === 'undefined') {
        return;
    }
    loadMoreObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            appendRenderChunk();
        }
    }, {
        root: null,
        rootMargin: '300px 0px 300px 0px',
        threshold: 0
    });
    loadMoreObserver.observe(loadMoreSentinel.value);
}

watch(() => props.list.length, () => {
    resetRenderedCount();
    void nextTick().then(setupLoadMoreObserver);
}, { immediate: true });

watch(() => props.dragSort, () => {
    resetRenderedCount();
    void nextTick().then(setupLoadMoreObserver);
});

watch(loadMoreSentinel, () => {
    void nextTick().then(setupLoadMoreObserver);
});

watch(hasMoreRows, () => {
    if (!hasMoreRows.value) {
        destroyLoadMoreObserver();
        return;
    }
    void nextTick().then(setupLoadMoreObserver);
});
function chickMusicIcon(music: Music, index: number) {
    if (isCurrentMusic(music)) {
        if (musicPlayer.playing) {
            musicPlayer.requestPause();
        } else {
            musicPlayer.requestPlay();
        }
        return;
    }
    
    const doubleClickAction = localStorage.getItem('bmusic-double-click') || 'replace-list';
    if (doubleClickAction === 'add-single') {
        playList.addAndPlay(music);
    } else if (props.replacePlayList) {
        playList.setList(props.list);
        playList.setCurrentIndex(index);
    } else {
        playList.addAndPlay(music);
    }
}

// 鍙抽敭鑿滃崟
function rightClick(event: MouseEvent, music: Music, index: number) {
    event.preventDefault();
    const payButton = computed<CustomButton>(() => {
        if (isCurrentPlaying(music)) {
            return {
                icon: PauseSvg,
                title: '暂停',
                onClick: () => {
                    musicPlayer.requestPause();
                }
            }
        }
        return {
            icon: PlaySvg,
            title: '播放',
            onClick: () => {
                chickMusicIcon(music, index);
            }
        }
    });
    const addToListButton: CustomButton & { divided?: boolean } = {
        icon: AddMusicCollectionSvg,
        title: '收藏到歌单',
        divided: true,
        onClick: () => {
            openPopUpComponent(AddToPlayList, { music: music })
        }
    }

    void showContextMenu(reactive({
        x: event.x,
        y: event.y,
        minWidth: 200,
        items: computed<MenuItem[]>(() => {
            let items: MenuItem[] = [];
            // 鎾斁/鏆傚仠
            items.push({
                label: payButton.value.title,
                icon: h(payButton.value.icon, { style: 'width: 1rem; height: 1rem;' }),
                onClick: () => payButton.value.onClick?.(index)
            });
            // play next
            items.push({
                label: '下一首播放',
                icon: h(PlaySvg, { style: 'width: 1rem; height: 1rem;' }),
                onClick: () => playList.addNext(music)
            });
            // add to playlist
            items.push({
                label: addToListButton.title,
                icon: h(addToListButton.icon, { style: 'width: 1rem; height: 1rem;' }),
                onClick: () => addToListButton.onClick?.(index),
                divided: true
            });
            // custom buttons
            if (props.customButtons) {
                for (const cbutton of props.customButtons) {
                    items.push({
                        label: cbutton.title,
                        icon: h(cbutton.icon, { style: ['width: 1rem; height: 1rem;', cbutton.style] }),
                        onClick: () => cbutton.onClick?.(index),
                    });
                }
            }
            return items;
        }),
    }));
}


//鐢ㄤ簬鎷栧姩鎺掑簭
//鎷栨嫿鍔熻兘
let drag = ref<{
    x: number,
    y: number,
    music: Music,
    mouseUp: (event: MouseEvent, index: number) => void,
    mouseMove: (event: MouseEvent, index: number) => void,
    mouseLeave: (event: MouseEvent, index: number) => void,
}>();
let activeDocumentMousemoveHandler: ((event: MouseEvent) => void) | undefined;
let activeDocumentMouseupHandler: (() => void) | undefined;

function cleanupDocumentDragListeners() {
    if (activeDocumentMousemoveHandler) {
        document.removeEventListener('mousemove', activeDocumentMousemoveHandler);
        activeDocumentMousemoveHandler = undefined;
    }
    if (activeDocumentMouseupHandler) {
        document.removeEventListener('mouseup', activeDocumentMouseupHandler);
        activeDocumentMouseupHandler = undefined;
    }
}
function mouseDown(_mouseDownEvent: MouseEvent, music: Music, mouseDownIndex: number) {
    if (!props.dragSort) {
        return;
    }
    //鍒ゆ柇鏄Щ鍔ㄥ埌涓婇潰杩樻槸涓嬮潰 true 涓婇潰 false 涓嬮潰
    function moveUpOrDown(event: MouseEvent): boolean {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        return event.clientY - rect.top < rect.height / 2;
    }

    const onMousemove = (event2: MouseEvent) => {
        if (!drag.value) {
            drag.value = {
                x: 0,
                y: 0,
                music: music,
                mouseMove: (mouseOverEvent: MouseEvent, _index1: number) => {
                    const target = mouseOverEvent.currentTarget as HTMLElement;
                    target.classList.remove('drag-item-to-left');
                    target.classList.remove('drag-item-to-next');
                    if (moveUpOrDown(mouseOverEvent)) {
                        target.classList.add('drag-item-to-left');
                    } else {
                        target.classList.add('drag-item-to-next');
                    }
                },
                mouseLeave: (mouseLeaveEvent: MouseEvent, _index1: number) => {
                    const target = mouseLeaveEvent.currentTarget as HTMLElement;
                    target.classList.remove('drag-item-to-left');
                    target.classList.remove('drag-item-to-next');
                },
                mouseUp: (mouseUpEvent: MouseEvent, index1: number) => {
                    const target = mouseUpEvent.currentTarget as HTMLElement;
                    target.classList.remove('drag-item-to-left');
                    target.classList.remove('drag-item-to-next');
                    const up = moveUpOrDown(mouseUpEvent);
                    if (index1 != mouseDownIndex && index1 != mouseDownIndex + (up ? 1 : -1)) {
                        props.list.splice(mouseDownIndex, 1);
                        props.list.splice(index1 + (index1 < mouseDownIndex ? 1 : 0) - (up ? 1 : 0), 0, music);
                        props.onMusicOrderChange?.(props.list);
                    }
                },
            }
        }
        drag.value!.x = event2.clientX;
        drag.value!.y = event2.clientY;
    };
    cleanupDocumentDragListeners();
    activeDocumentMousemoveHandler = onMousemove;
    document.addEventListener('mousemove', onMousemove);
    const onMouseup = () => {
        cleanupDocumentDragListeners();
        drag.value = undefined;
    };
    activeDocumentMouseupHandler = onMouseup;
    document.addEventListener('mouseup', onMouseup);
}

onBeforeUnmount(() => {
    destroyLoadMoreObserver();
    cleanupDocumentDragListeners();
});

</script>
<template>
    <div class="pay-list">
        <div class="line line-title">
            <div class="index">#</div>
            <div class="info">歌曲</div>
            <div class="like">喜欢</div>
        </div>
        <div class="line line-content" :class="{ playing: isCurrentMusic(music) }"
            v-for="music, index of displayList" :key="musicKey(music)"
            v-memo="[musicKey(music), isCurrentMusic(music), isCurrentPlaying(music), !!drag]"
            @mousedown="mouseDown($event, music, index)"
            @mouseup="drag?.mouseUp($event, index)" @mousemove="drag?.mouseMove($event, index)"
            @mouseleave="drag?.mouseLeave($event, index)" @contextmenu="rightClick($event, music, index)">
            <!-- 搴忓彿 -->
            <div class="index">{{ index }}</div>
            <!-- 闊充箰淇℃伅 -->
            <div class="info">
                <!-- 鍥炬爣 -->
                <ImgDiv class="info-icon" @click="chickMusicIcon(music, index)" :src="music.iconUrl">
                    <!-- 閬僵 -->
                    <div class="info-icon-mask">
                        <!-- 鎾斁鏆傚仠鎸夐挳 -->
                        <PauseSvg class="icon" v-if="isCurrentPlaying(music)" />
                        <PlaySvg class="icon" v-else />
                    </div>
                </ImgDiv>
                <!-- 鍐呭 -->
                <div class="info-content">
                    <!-- 鍚嶇О -->
                    <div class="info-name">{{ music.musicName }}</div>
                    <!-- 鍚嶇О涓嬮潰涓€鎺?-->
                    <div class="info-author">
                        <!-- 鎾斁鍣?-->
                        <PlayerInfoTag class="item-player" :playerName="music.playerName" />
                        <!-- 浣滆€?-->
                        <div class="item-author">{{ music.musicAuthor }}</div>
                    </div>
                </div>
                <!-- 鎸夐挳缁?-->
                <div class="button-grep">
                    <div class="button-grep-button" :title="button.title" @click="button.onClick?.(index)"
                        v-for="button of props.customButtons">
                        <component :is="button.icon" :style="['width: 100%; height: 100%;', button.style]" />
                    </div>
                    <div class="button-grep-button" title="收藏到歌单"
                        @click="openPopUpComponent(AddToPlayList, { music: music })">
                        <AddMusicCollectionSvg style="width: 100%; height: 100%;" />
                    </div>
                </div>
            </div>
            <!-- 鍠滄 -->
            <div class="like">
                <FavoriteButton :music="music" style="width: 1.2rem;height: 1.2rem;" />
            </div>
        </div>
        <!-- 鎷栧姩涓殑鍏冪礌 -->
        <div v-if="hasMoreRows" ref="loadMoreSentinel" class="virtual-load-more-sentinel"></div>
        <div v-if="drag" class="drag-item">
            <ImgDiv class="info-icon" :src="drag.music.iconUrl" />
            <div class="info-content">
                <!-- 鍚嶇О -->
                <div class="info-name">{{ drag.music.musicName }}</div>
                <!-- 鍚嶇О涓嬮潰涓€鎺?-->
                <div class="info-author">
                    <!-- 鎾斁鍣?-->
                    <PlayerInfoTag class="item-player" :playerName="drag.music.playerName" />
                    <!-- 浣滆€?-->
                    <div class="item-author">{{ drag.music.musicAuthor }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.pay-list .line.line-content.drag-item-to-left {
    border-top: 0.1rem solid var(--color-pay-list-drag-item-border-line);
    border-radius: 0;
    background-color: unset;
}

.pay-list .line.line-content.drag-item-to-next {
    border-bottom: 0.1rem solid var(--color-pay-list-drag-item-border-line);
    border-radius: 0;
    background-color: unset;
}

.drag-item {
    padding: 0.5rem;
    border-radius: 0.5rem;
    background-color: var(--color-pay-list-drag-item-bg);
    border: 0.1rem solid var(--color-pay-list-drag-item-border);
    width: 15rem;
    position: fixed;
    top: calc(v-bind("`${drag?.y}px`") - 1.5rem);
    left: calc(v-bind("`${drag?.x}px`") + 0.5rem);
    display: flex;
    gap: 0.5rem;
}

.pay-list .line-content .button-grep-button:hover {
    color: var(--color-play-list-item-button-grep-button-hover);
}

.pay-list .line-content .button-grep-button {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
    color: var(--color-play-list-item-button-grep-button);
}

.pay-list .line-content:hover .button-grep {
    display: flex;
}

.pay-list .line-content .button-grep {
    display: none;
    gap: 0.5rem;
    align-items: center;
}

.pay-list .line-content.playing .info-icon-mask .icon,
.pay-list .line-content:hover .info-icon-mask .icon {
    display: block;
}

.pay-list .line-content .info-icon-mask .icon {
    width: 1.5rem;
    height: 1.5rem;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-pay-list-line-content-info-icon-mask-icon);
    display: none;
}

.pay-list .line-content.playing .info-icon-mask,
.pay-list .line-content:hover .info-icon-mask {
    display: block;
}

.pay-list .line-content .info-icon-mask {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: var(--color-pay-list-line-content-info-icon-mask-bg);
    display: none;
}

.pay-list .line-content:hover {
    background-color: var(--color-pay-list-line-content-hover-bg);
}

.drag-item .item-player,
.pay-list .line-content .info-author .item-player {
    font-size: 0.7rem;
}

.drag-item .item-author,
.pay-list .line-content .info-author .item-author {
    word-break: keep-all;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    width: 0;
}

.drag-item .info-author,
.pay-list .line-content .info-author {
    font-size: 0.7rem;
    color: var(--color-pay-list-line-content-info-author-font);
    display: flex;
    align-items: center;
    flex: 1;
    height: 0;
    gap: 0.2rem;
}

.pay-list .line-content.playing .info-name {
    color: var(--color-pay-list-line-content-info-name-font-playing);
}

.drag-item .info-name,
.pay-list .line-content .info-name {
    font-size: 0.9rem;
    color: var(--color-pay-list-line-content-info-name-font);
    word-break: keep-all;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.drag-item .info-content,
.pay-list .line-content .info-content {
    flex: 1;
    width: 0;
    height: 2.5rem;
    display: flex;
    flex-direction: column;
}

.drag-item .info-icon,
.pay-list .line-content .info-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.25rem;
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.pay-list .line-content .info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 2.3rem;
}

.pay-list .line-content {
    height: 3.5rem;
    border-radius: 0.5rem;
    user-select: none;
    content-visibility: auto;
    contain-intrinsic-size: 56px;
}

.pay-list .line-content .index {
    text-align: center;
    font-size: 0.8rem;
    color: var(--color-pay-list-line-content-index-font);
}


.pay-list .line-title .info {
    text-align: left;
}

.pay-list .line.line-title {
    text-align: center;
    font-size: 0.8rem;
    border-bottom: 0.1rem solid var(--color-pay-list-line-title-border);
    padding: 0.5rem 0;
    margin-bottom: 0.3rem;
}

.pay-list .line .length {
    width: 4rem;
}

.pay-list .line .like {
    width: 2rem;
    display: flex;
    justify-content: center;
}

.pay-list .line .info {
    flex: 1;
    width: 0;
}

.pay-list .line .index {
    width: 2rem;
}

.pay-list .line {
    display: flex;
    gap: 0.5rem;
    margin: 0 0.5rem;
    align-items: center;
}

.virtual-load-more-sentinel {
    height: 1px;
    width: 100%;
}
</style>
