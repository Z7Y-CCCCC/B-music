/** 澶勭悊寮瑰嚭缁勪欢 */
import { markRaw, reactive, type Component } from "vue";

type ShowComponent = Component;
type PopUpData = Record<string, unknown>;

let keyCount = Math.floor(Math.random() * 10000);

// 寮瑰嚭缁勪欢
export const popUpComponents = reactive<{ component: ShowComponent, data: PopUpData, popUpComponentKey: number }[]>([]);

/**
 * 寮瑰嚭涓€涓粍浠?
 * @param component  缁勪欢
 * @param data  鏁版嵁
 */
export function openPopUpComponent(component: ShowComponent, data: PopUpData = {}): number {
    keyCount++;
    popUpComponents.push({ component: markRaw(component), data: data, popUpComponentKey: keyCount });
    return keyCount;
}

/**
 * 绉婚櫎涓€涓粍浠?
 * @param key  缁勪欢鐨刱ey
 */
export function closePopUpComponent(key: number) {
    const index = popUpComponents.findIndex(a => a.popUpComponentKey === key);
    if (index >= 0) {
        popUpComponents.splice(index, 1);
    }
}
