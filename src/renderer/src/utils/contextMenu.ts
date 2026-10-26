import type { ContextMenuInstance, MenuItem, MenuOptions } from '@imengyu/vue3-context-menu'

let contextMenuModulePromise: Promise<typeof import('@imengyu/vue3-context-menu')> | undefined
let contextMenuStylePromise: Promise<unknown> | undefined

async function loadContextMenu() {
    contextMenuModulePromise ??= import('@imengyu/vue3-context-menu')
    contextMenuStylePromise ??= import('@imengyu/vue3-context-menu/lib/vue3-context-menu.css')

    const [contextMenuModule] = await Promise.all([contextMenuModulePromise, contextMenuStylePromise])
    return contextMenuModule.default
}

export async function showContextMenu(options: MenuOptions): Promise<ContextMenuInstance> {
    const contextMenu = await loadContextMenu()
    return contextMenu.showContextMenu(options)
}

export type { ContextMenuInstance, MenuItem, MenuOptions }
