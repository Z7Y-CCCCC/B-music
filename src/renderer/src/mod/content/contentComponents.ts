import { defineAsyncComponent, type Component } from 'vue'

function lazyContent(loader: () => Promise<{ default: Component }>) {
  return defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false
  })
}

export { default as Recommend } from './contents/Recommend.vue'
export const SearchContents = lazyContent(() => import('./contents/SearchContents.vue'))
export const Settings = lazyContent(() => import('./contents/Settings.vue'))
export const BMusicAccountSettings = lazyContent(() => import('./contents/BMusicAccountSettings.vue'))
export const PlayListContents = lazyContent(() => import('./contents/PlayListContents.vue'))
export const PlayListContentsNoLoc = lazyContent(() => import('./contents/PlayListContentsNoLoc.vue'))
export const EditPlayListInfo = lazyContent(() => import('./contents/EditPlayListInfo.vue'))
export const EditMusicInfo = lazyContent(() => import('./contents/EditMusicInfo.vue'))
export const BilibiliFavorites = lazyContent(() => import('./contents/BilibiliFavorites.vue'))
export const NeteaseLiked = lazyContent(() => import('./contents/NeteaseLiked.vue'))
