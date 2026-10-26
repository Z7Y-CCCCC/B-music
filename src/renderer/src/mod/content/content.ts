//鍐呭锛屾挱鏀惧櫒鐨勫唴瀹规樉绀虹粍浠?

import { computed, shallowRef, type Component } from "vue";
import { Recommend } from "./contentComponents";

type ShowComponent = Component;
type ContentData = Record<string, unknown>;
/**
 * 鏄剧ず缁勪欢
 */
const displayAndData = shallowRef<{
    display: ShowComponent,
    data: ContentData
}>({
    /** 鏄剧ず缁勪欢 */
    display: Recommend,
    /** 鍐呭鏁版嵁 */
    data: {}
});

/**
 * 鍐呭鏁版嵁
 */
export const contentData = computed(() => displayAndData.value.data);

/**
 * 鍐呭鏄剧ず缁勪欢
 */
export const contentDisplay = computed(() => displayAndData.value.display);

/**
 * 璁剧疆鍐呭
 * @param newDisplay 鏂扮殑鏄剧ず缁勪欢
 * @param newData 鏂扮殑鏁版嵁
 */
export function setContent(newDisplay: ShowComponent, newData: ContentData = {}) {
    displayAndData.value = {
        display: newDisplay as any,
        data: newData
    };
};
