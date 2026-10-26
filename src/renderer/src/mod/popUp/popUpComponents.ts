import { defineAsyncComponent, type Component } from 'vue'

function lazyPopUp(loader: () => Promise<{ default: Component }>) {
  return defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false
  })
}

export const AddToPlayList = lazyPopUp(() => import('./popUps/AddToPlayList.vue'))
export const Confirm = lazyPopUp(() => import('./popUps/Confirm.vue'))
export const CreatePlayList = lazyPopUp(() => import('./popUps/CreatePlayList.vue'))
export const CropperImg = lazyPopUp(() => import('./popUps/CropperImg.vue'))
export const WebviewLogin = lazyPopUp(() => import('./popUps/WebviewLogin.vue'))
