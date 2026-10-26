<script setup lang="ts">
import { WebviewTag } from 'electron';
import { computed, h, markRaw, onMounted, reactive, Ref, ref, toRef, watch } from 'vue';
import type { MusicPlayerContrMaxDisplay, MusicPlayerTopBarDisplay, PlayerCustomButton } from '@renderer/mod/playing/playing';
import BxlDevToSvg from '@renderer/components/svg/BxlDevTo.vue';
import MousePointerSvg from '@renderer/components/svg/MousePointer.vue';
import CopyOutlineSvg from '@renderer/components/svg/CopyOutline.vue';
import { ipcBilibiliApi } from "@renderer/ipcApi/ipcBilibiliApi";
import { MusicPlayerLink } from '../musicPlayers';
import { usePlayerLifecycle } from '../usePlayerLifecycle';
import { BilibiliMusicData, paresBilibiliMusicData } from './bilibiliMusic';
import { putNotification } from '@renderer/mod/notification/notification';
import BilibiliLikeSvg from './svg/BilibiliLikeSvg.vue';
import CoinOperatedSvg from './svg/CoinOperatedSvg.vue';
import OverWatchLoading from '@renderer/components/OverWatchLoading.vue';
import { showContextMenu } from '@renderer/utils/contextMenu';

const props = defineProps<{
  musicPlayerLink: MusicPlayerLink,
}>();
const musicPlayerLink = props.musicPlayerLink;
const musicPlayerSize = toRef(() => musicPlayerLink.musicPlayerSize);
const lifecycle = usePlayerLifecycle();

// 播放器数据
const musicData: Ref<BilibiliMusicData> = computed(() => paresBilibiliMusicData(musicPlayerLink.currentMusicData));
const like = ref<boolean>(false);//是否点赞
const coinOperated = ref<boolean>(false);//是否投币

// https://www.bilibili.com/video/BV19G411H7DY/?share_source=copy_web&vd_source=8ec9a462acb529345bef8d4422990df9&t=17

const bilibiliUrl = ref<string>(`https://www.bilibili.com/video/${musicData.value.bvId}/?t=0.01`);

// 复制链接
function copyLink() {
  navigator.clipboard.writeText(bilibiliUrl.value);
  putNotification({ type: "success", message: "已复制bilibili网页链接" });
}

// 播放器交互逻辑 
const iframeRef = ref<WebviewTag | null>(null);
const playerWebviewReady = ref(false);

// 记录意图播放状态, 防止 webview 还未加载完毕时漏掉指令
const intendedPlaying = ref(true);

musicPlayerLink.updateButtomWidth('6.5rem');
const offRequestPlay = musicPlayerLink.onRequestPlay(() => {
  intendedPlaying.value = true;
  iframeRef.value?.send("play");
});
const offRequestPause = musicPlayerLink.onRequestPause(() => {
  intendedPlaying.value = false;
  iframeRef.value?.send("pause");
});
const offRequestCurrentTime = musicPlayerLink.onRequestCurrentTime((currentTime: number) => {
  iframeRef.value?.send("setPlaybackProgress", currentTime);
})
const offRequestVolume = musicPlayerLink.onRequestVolume((volume: number) => {
  iframeRef.value?.send("setVolume", volume);
})

function onMessage(msg: string, ...args: any[]) {
  if (msg == "onPlaybackProgressChange") {
    musicPlayerLink.updateCurrentTime(args[0]);
  } else if (msg == "onPlaybackLengthChange") {
    musicPlayerLink.updateDuration(args[0]);
  } else if (msg == "onPlaybackStateChange") {
    const isPlaying = args[0];
    
    musicPlayerLink.updatePlaying(isPlaying);
    musicPlayerLink.updateLoading(false);
    playerWebviewReady.value = true;
    
    // 对齐初始状态: 如果 b站自动开播了，但程序当前处于暂停意图状态，则强制发暂停指令覆盖
    if (isPlaying && !intendedPlaying.value) {
      iframeRef.value?.send("pause");
    }
  } else if (msg == "onBpxStateBuff") {
    musicPlayerLink.updateLoading(args[0]);
  } else if (msg == "onPlaybackEnded") {
    musicPlayerLink.updateEnded(args[0]);
  } else if (msg == "onVolumeChange") {
    musicPlayerLink.updateVolume(args[0]);
  } else if (msg == "reqInitVolume") {
    iframeRef.value?.send("setVolume", musicPlayerLink.volume);
  } else if (msg == "onLikeChange") {
    like.value = args[0];
  } else if (msg == "onCoinChange") {
    coinOperated.value = args[0];
  } else if (msg == "onSubtitleChange") {
    window.electron?.ipcRenderer.invoke('desktop-lyrics-update-text', args[0]);
  }
}

function onWebviewIpcMessage(event: any) {
  onMessage(event.channel, ...event.args);
}

function onWebviewDomReady() {
  playerWebviewReady.value = false;
}

watch(iframeRef, (next, prev) => {
  prev?.removeEventListener("dom-ready", onWebviewDomReady);
  prev?.removeEventListener("ipc-message", onWebviewIpcMessage);
  next?.addEventListener("dom-ready", onWebviewDomReady);
  next?.addEventListener("ipc-message", onWebviewIpcMessage);
});

// Reset loading state when the music source URL changes, so the overlay shows again for a new track
watch(() => bilibiliUrl.value, () => {
  playerWebviewReady.value = false;
});


// 自定义按钮
{
  // 复制链接
  const copyButton = reactive<PlayerCustomButton>({
    title: "复制bilibili网页链接",
    icon: markRaw(CopyOutlineSvg),
    onClick: copyLink,
  });
  // 点赞按钮
  const likeButton = reactive<PlayerCustomButton>({
    title: "给bilibili视频点赞",
    icon: markRaw(BilibiliLikeSvg),
    style: computed(() => like.value ? "color: #fb7299" : "") as any,
    onClick: () => {
      if (like.value) {
        iframeRef.value?.send("cancelLike");
      } else {
        iframeRef.value?.send("clickLike");
      }
    },
  });
  // 投币按钮
  const coinButton = reactive<PlayerCustomButton>({
    title: "给bilibili视频投币",
    icon: markRaw(CoinOperatedSvg),
    style: computed(() => coinOperated.value ? "color: #fb7299" : "") as any,
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      void showContextMenu({
        x: e.x,
        y: e.y,
        theme: "mac dark",
        items: [
          {
            label: "投 1 枚硬币",
            onClick: () => iframeRef.value?.send("clickCoin", 1)
          },
          {
            label: "投 2 枚硬币",
            onClick: () => iframeRef.value?.send("clickCoin", 2)
          }
        ]
      });
    }
  });
  // 操控网页
  const controlButton = reactive<PlayerCustomButton>({
    title: "超控网页",
    icon: markRaw(MousePointerSvg),
    style: computed(() => isNotManualControl.value ? "" : "color: #fb7299") as any,
    onClick: () => {
      isNotManualControl.value = !isNotManualControl.value;
    },
  });
  // 打开开发者工具
  const openDevToolsButton = reactive<PlayerCustomButton>({
    title: "打开开发者工具",
    icon: markRaw(BxlDevToSvg),
    onClick: () => {
      iframeRef.value?.openDevTools();
    },
  });

  //左边自定义按钮
  musicPlayerLink.updatePlayerLeftCustomButtons(reactive([likeButton, coinButton, copyButton]));
  //顶部自定义按钮
  musicPlayerLink.updateTopBarCustomButtons(reactive([likeButton, coinButton, copyButton, controlButton, openDevToolsButton]));
}




//获取preload文件路径
const bilibiliMusicPlayer__filePath = ref<string>();
ipcBilibiliApi.getPreloadJsFilePath_BilibiliMusicPlayer().then((res: string) => {
  if (lifecycle.isDestroyed()) {
    return;
  }
  bilibiliMusicPlayer__filePath.value = res;
});


// 遮罩逻辑
const isNotManualControl = ref(true);//是否不手动控制
watch(musicPlayerSize, () => {
  if (musicPlayerSize.value === 'bottom') {
    isNotManualControl.value = true;
  }
});

//开启遮罩则进入全屏
watch(isNotManualControl, () => {
  if (isNotManualControl.value) {
    iframeRef.value?.send("fullScreen");
  }
});

// 遮罩邮件菜单
function onContextMenu(e: MouseEvent) {
  e.preventDefault();
  void showContextMenu({
    x: e.x,
    y: e.y,
    minWidth: 200,
    items: [
      {
        label: "复制网页链接",
        icon: h(CopyOutlineSvg, { style: "color: black; width: 1rem; height: 1rem;" }),
        onClick: copyLink
      },
      {
        label: "超控网页",
        icon: h(MousePointerSvg, { style: "color: black; width: 1rem; height: 1rem;" }),
        onClick: () => {
          isNotManualControl.value = false;
        },
        divided: true
      },
      {
        label: "打开开发者工具",
        icon: h(BxlDevToSvg, { style: "color: black; width: 1rem; height: 1rem;" }),
        onClick: () => {
          iframeRef.value?.openDevTools();
        }
      }
    ]
  });
}


const musicPlayerShow = ref(false);
// 鼠标移动就显示，不移动就隐藏
let mosueMoveTimer: ReturnType<typeof setTimeout> | undefined;
const mosueMove = () => {
  musicPlayerShow.value = true;
  lifecycle.clearManagedTimeout(mosueMoveTimer);
  mosueMoveTimer = lifecycle.setManagedTimeout(() => {
    musicPlayerShow.value = false;
  }, 2000);
}
onMounted(() => {
  lifecycle.addCleanup(offRequestPlay);
  lifecycle.addCleanup(offRequestPause);
  lifecycle.addCleanup(offRequestCurrentTime);
  lifecycle.addCleanup(offRequestVolume);

  window.addEventListener('mousemove', mosueMove);
  window.addEventListener('mousedown', mosueMove);
  lifecycle.addCleanup(() => {
    window.removeEventListener('mousemove', mosueMove);
    window.removeEventListener('mousedown', mosueMove);
  });
  lifecycle.addCleanup(() => {
    iframeRef.value?.removeEventListener("dom-ready", onWebviewDomReady);
    iframeRef.value?.removeEventListener("ipc-message", onWebviewIpcMessage);
  });
});

// 控制播放器样式
const musicPlayerContrMaxDisplay = computed<MusicPlayerContrMaxDisplay>(() => {
  let res: MusicPlayerContrMaxDisplay = {
    type: 'fixed',
    progressShow: 'top',
    isShwoNusicName: true,
    extraClass: 'bili-bili-music-player-max-extra',
  }
  if (!isNotManualControl.value) {
    res.type = 'relative';
    res.progressShow = 'center';
    res.isShwoNusicName = true;
    res.extraClass = false;
    return res;
  }
  if (!musicPlayerShow.value) {
    res.type = 'none';
    return res;
  }
  return res;
});
musicPlayerLink.updateContrMaxDisplay(reactive({
  type: toRef(() => musicPlayerContrMaxDisplay.value.type) as any,
  progressShow: toRef(() => musicPlayerContrMaxDisplay.value.progressShow) as any,
  isShwoNusicName: toRef(() => musicPlayerContrMaxDisplay.value.isShwoNusicName) as any,
  extraClass: toRef(() => musicPlayerContrMaxDisplay.value.extraClass) as any,
}));

// topBar 样式
const musicPlayerTopBarDisplay = computed<MusicPlayerTopBarDisplay>(() => {
  let res: MusicPlayerTopBarDisplay = {
    type: 'fixed',
    extraClass: 'bili-bili-music-player-top-extra',
  }
  if(!isNotManualControl.value){
    return res;
  }
  if (!musicPlayerShow.value) {
    res.type = 'none';
    return res;
  }
  return res;
});
musicPlayerLink.updateTopBarDisplay(reactive({
  type: toRef(() => musicPlayerTopBarDisplay.value.type) as any,
  extraClass: toRef(() => musicPlayerTopBarDisplay.value.extraClass) as any,
}));



</script>
<template>
  <div class="b-player" :class="[{ 'manual-control': !isNotManualControl }, musicPlayerSize]">
    <!-- b站的两根棍子 -->
    <div v-if="musicPlayerSize == 'bottom'" style="
      position: absolute;
      left: 0px;
      top: 0px;
      width: calc(100% - 1.1rem);
      margin: 0 0 0 0.8rem;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      z-index: -1;
      gap: 2rem;">
      <div
        style="height: 2rem;width: 0.3rem;background-color: #fb7299;border-radius: 0.5rem;transform: rotate(-35deg);">
      </div>
      <div style="height: 2rem;width: 0.3rem;background-color: #fb7299;border-radius: 0.5rem;transform: rotate(35deg);">
      </div>
    </div>
    <!-- 播放器 -->
    <webview v-if="bilibiliMusicPlayer__filePath" ref="iframeRef" class="b-iframe" :src="bilibiliUrl"
      :preload="bilibiliMusicPlayer__filePath" allowpopups nodeintegration
      :style="{ opacity: playerWebviewReady ? 1 : 0 }"
    ></webview>
    <!-- OverWatch loading overlay for mini-player -->
    <OverWatchLoading v-if="musicPlayerSize === 'bottom'" :visible="!playerWebviewReady" />
    <!-- 放大状态遮罩 -->
    <div class="player-max-mask" :class="musicPlayerContrMaxDisplay.type"
      v-if="musicPlayerSize === 'max' && isNotManualControl" @contextmenu="onContextMenu">
    </div>
  </div>
</template>
<style scoped>
/* 如果是缩小状态则显示小电视 */
.b-player.bottom {
  background-color: unset;
}

.b-player.bottom .b-iframe {
  border: 0.3rem solid #fb7299;
  border-radius: 0.5rem;
  width: calc(100% - 1.1rem);
  height: calc(100% - 1.9rem);
  margin: 0.8rem 0rem 0.2rem 0.5rem;
  overflow: hidden;
  background-color: rgb(0, 0, 0);
}

/** 如果手动控制则把上方无法点击区域空出来 */
.b-player.manual-control {
  padding-top: var(--top-bar-height);
  height: calc(100% - var(--top-bar-height));
}

/* 如果不显示播放控制器则隐藏鼠标 */
.player-max-mask.none {
  cursor: none;
}

/* 放大状态遮罩 */
.player-max-mask {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

.b-player {
  position: relative;
  background-color: black;
  overflow: hidden;
}

.b-iframe,
.b-player {
  width: 100%;
  height: 100%;
}
</style>
<style>
.bili-bili-music-player-max-extra .player-bottom-control.max.fixed {
  backdrop-filter: blur(1px);
}

.bili-bili-music-player-max-extra {
  --color-primary-text: #ffffffe3;
  --color-primary-text2: #ffffffb1;
  --color-primary-button-small: #ffffff7f;
  --color-primary-button-small-hover: #ffffffa6;
  /** 底部播放器 */
  --color-music-player-bg-fixed: #00000092;

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

  /* 播放器左下角字体颜色 */
  --color-music-player-music-name: var(--color-primary-text);
  --color-music-player-music-line: var(--color-primary-text2);
  --color-music-player-music-singer: var(--color-primary-text2);

  /* 进度条显示在上方时，右边显示的时间 */
  --color-music-player-right-time: var(--color-primary-text2);
}


/* 顶部栏样式 */
.bili-bili-music-player-top-extra::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 9rem;
  background: linear-gradient(184deg, #FFFFFF 0%, #ffffff00 65%);
  filter: blur(20px);
}
</style>
