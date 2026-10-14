/** Delete one message through Tavern Helper, never a range or a DOM-only removal. */
export function createDeletionController({ getContext, getHelper, isGenerating, confirm, notify }) {
    let busy = false;
    return async function deleteOne(id) {
        if (busy) return false;
        if (isGenerating()) {
            notify('请先停止生成，再删除消息。', 'warning');
            return false;
        }
        const context = getContext();
        const helper = getHelper();
        if (typeof helper?.deleteChatMessages !== 'function') {
            notify('请先安装并启用酒馆助手，然后刷新页面。', 'warning');
            return false;
        }
        const chat = context.chat;
        const chatId = context.getCurrentChatId();
        if (chatId == null || !Number.isSafeInteger(id) || id < 0 || id >= chat.length) return false;
        const message = chat[id];
        busy = true;
        try {
            if (!await confirm(id, message)) return false;
            const current = getContext();
            if (isGenerating() || current.chat !== chat || current.getCurrentChatId() !== chatId || current.chat[id] !== message) {
                notify('聊天已变化，请重新点击要删除的消息。', 'warning');
                return false;
            }
            await helper.deleteChatMessages([id], { refresh: 'affected' });
            notify('已删除该条消息。', 'success');
            return true;
        } catch (error) {
            console.error('[QuickDelete] 删除失败', error);
            notify('删除未正常完成，请检查聊天记录或刷新页面后确认。', 'error');
            return false;
        } finally {
            busy = false;
        }
    };
}
